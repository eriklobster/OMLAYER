// One CAS-protected GitHub file owns every task and release lock. No task code is executed.
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

export const BRANCH = 'aumyra-coordination-state';
export const STATE_PATH = 'apps/aumyra/coordination-state.json';
export const QUEUES = {Development:20, Work:25, 'Simple Chat':26};
export const STATUSES = ['TODO','CLAIMED','IN PROGRESS','BLOCKED','DONE','STOPPED','CANCELED'];
const ACTIVE = ['CLAIMED','IN PROGRESS','BLOCKED'];
const STALE_MS = 45 * 60_000;
const MAX_BYTES = 800_000;
const fail = message => { throw new Error(message); };
const iso = now => new Date(now).toISOString();
const has = (obj,key) => Object.hasOwn(obj,key);
export const emptyState = () => ({schema:1, revision:0, tasks:{}, locks:{}, events:{}});
function publicText(value, name, max=400) {
  if (typeof value !== 'string' || !value.trim() || value.length>max || /[\x00-\x1f]/.test(value)) fail('Invalid '+name);
  // A secondary guard, not a classifier: operators must submit public engineering metadata only.
  if (/\b\d{6,}:[A-Za-z0-9_-]{20,}|\b(?:gh[pousr]_|github_pat_|sk-)[A-Za-z0-9_-]{12,}|Bearer\s+\S+|-----BEGIN .*PRIVATE KEY/i.test(value)) fail('Possible credential in '+name);
  return value;
}
function branchName(value,resource) {
  if(resource==='aumyra-release' && value==='feat/aumyra-assistant-mvp') return value;
  if (!/^(?:work|seashell|dev)\/[a-zA-Z0-9][a-zA-Z0-9_/-]{1,100}$/.test(value||'') || value.includes('//')) fail('Use a separate work/, seashell/ or dev/ implementation branch');
  return value;
}
function inspection(task,event) {
  const i=event.inspection;
  const allowed=['preservedBranch','observedCommit','branchesReviewed','commitsReviewed','processesReviewed','resourcesReviewed','noActiveExecution','evidence'];
  if (i && Object.keys(i).some(k=>!allowed.includes(k))) fail('Unknown inspection field');
  if (!i || i.preservedBranch!==task.branch || !/^[a-f0-9]{40}$/.test(i.observedCommit||'')
      || i.branchesReviewed!==true || i.commitsReviewed!==true || i.processesReviewed!==true
      || i.resourcesReviewed!==true || i.noActiveExecution!==true) fail('Inspect branches, commits, processes and resources; preserve old branch and prove no active execution');
  publicText(i.evidence,'inspection evidence');
  if (event.expectedVersion!==task.version) fail('Inspection is stale: task version changed');
}
function validateState(s) {
  if (s?.schema!==1 || !Number.isSafeInteger(s.revision) || s.revision<0 || !s.tasks || !s.locks || !s.events) fail('Invalid coordination state');
  for (const [id,t] of Object.entries(s.tasks)) {
    if (t.id!==id || !STATUSES.includes(t.status) || !has(QUEUES,t.lane) || !Number.isSafeInteger(t.version)) fail('Invalid task state');
  }
}
export function applyEvent(current, event, now=Date.now()) {
  validateState(current);
  if (!Number.isFinite(now)) fail('Invalid server time');
  if (!/^[a-zA-Z0-9_-]{8,96}$/.test(event?.eventId||'')) fail('Stable eventId required');
  const digest=createHash('sha256').update(JSON.stringify(event)).digest('hex');
  if (has(current.events,event.eventId)) {
    if (current.events[event.eventId].digest!==digest) fail('eventId reused with different payload');
    return {state:current, duplicate:true};
  }
  const allowed=['eventId','action','taskId','actor','summary','lane','branch','resource','status','expectedVersion','inspection'];
  if (Object.keys(event).some(k=>!allowed.includes(k))) fail('Unknown event field; only public task metadata allowed');
  if (!/^(DEV|WORK|CHAT)-[A-Z0-9][A-Z0-9-]{1,80}$/.test(event.taskId||'')) fail('Invalid task ID');
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(event.actor||'')) fail('Invalid actor');
  publicText(event.summary,'progress summary');
  const s=structuredClone(current), id=event.taskId;
  let t=has(s.tasks,id)?s.tasks[id]:null;
  const prior=t?{owner:t.owner,status:t.status,branch:t.branch}:null;
  if (event.action==='add') {
    if (t) fail('Task already exists');
    const prefix={Development:'DEV',Work:'WORK','Simple Chat':'CHAT'};
    if (!has(QUEUES,event.lane) || !id.startsWith(prefix[event.lane]+'-')) fail('Task lane/ID mismatch');
    if (event.resource!=null && event.resource!=='aumyra-release') fail('Unsupported resource');
    t=s.tasks[id]={id,lane:event.lane,queue:QUEUES[event.lane],status:'TODO',owner:null,branch:null,
      resource:event.resource||null,version:0,updatedAt:iso(now),heartbeatAt:null,leaseUntil:null,summary:event.summary};
  } else {
    if (!t) fail('Unknown task');
    if (event.action==='claim' || event.action==='takeover') {
      if (event.action==='claim' && t.status!=='TODO') fail('Only TODO tasks can be claimed; stopped/canceled work never restarts automatically');
      if (event.action==='takeover') {
        if (!ACTIVE.includes(t.status)) fail('Task is not eligible for takeover');
        if (now-Date.parse(t.heartbeatAt)<STALE_MS || !Number.isFinite(Date.parse(t.heartbeatAt))) fail('Meaningful progress is less than 45 minutes old');
        inspection(t,event);
        if (t.owner===event.actor || t.branch===event.branch) fail('Takeover requires a new owner and separate branch');
      }
      branchName(event.branch,t.resource);
      if (Object.values(s.tasks).some(other=>other.id!==id && ACTIVE.includes(other.status) && other.branch===event.branch)) fail('Implementation branch already owned');
      if (t.resource && s.locks[t.resource] && s.locks[t.resource].taskId!==id) fail('Release resource already locked; inspect and release it explicitly');
      t.owner=event.actor; t.branch=event.branch; t.status='CLAIMED';
      t.heartbeatAt=iso(now); t.leaseUntil=iso(now+STALE_MS);
      if (t.resource) s.locks[t.resource]={taskId:id,owner:t.owner,acquiredAt:iso(now)};
    } else {
      if (t.owner!==event.actor) fail('Only current task owner may change it');
      if (event.expectedVersion!=null && event.expectedVersion!==t.version) fail('Task version changed');
      if (event.action==='release') {
        if (!t.resource || s.locks[t.resource]?.taskId!==id) fail('Task does not hold the resource lock');
        if (!['DONE','STOPPED','CANCELED','BLOCKED'].includes(t.status)) fail('Stop execution before releasing resource');
        inspection(t,event);
        delete s.locks[t.resource];
      } else if (event.action==='heartbeat') {
        if (!['CLAIMED','IN PROGRESS'].includes(t.status)) fail('Task is not actively executing');
        if (event.summary===t.summary) fail('Heartbeat must record new meaningful progress');
        t.status='IN PROGRESS'; t.heartbeatAt=iso(now); t.leaseUntil=iso(now+STALE_MS);
      } else if (event.action==='transition') {
        if (!ACTIVE.includes(t.status) || !['IN PROGRESS','BLOCKED','DONE','STOPPED','CANCELED'].includes(event.status)) fail('Invalid transition; terminal tasks are never restarted');
        if (t.status===event.status || t.summary===event.summary) fail('Transition must record a changed state and meaningful evidence');
        if (t.status==='BLOCKED' && event.status==='IN PROGRESS' && t.resource && s.locks[t.resource]?.taskId!==id) fail('Released task cannot resume: create a new task and claim the lock');
        t.status=event.status; t.heartbeatAt=iso(now);
        t.leaseUntil=['CLAIMED','IN PROGRESS'].includes(t.status)?iso(now+STALE_MS):null;
      } else fail('Unknown action');
    }
    t.summary=event.summary;
  }
  t.version++; t.updatedAt=iso(now); s.revision++;
  s.events[event.eventId]={digest,revision:s.revision,action:event.action,taskId:id,actor:event.actor,at:iso(now),summary:event.summary,
    ...(event.action==='takeover'?{notice:`TAKEOVER: ${prior.owner} -> ${t.owner}`,preservedBranch:prior.branch,inspection:event.inspection}:{}),
    ...(event.action==='release'?{inspection:event.inspection}:{})};
  if (Object.keys(s.tasks).length>500 || Buffer.byteLength(JSON.stringify(s))>MAX_BYTES) fail('Coordination capacity reached; archive safely before continuing');
  return {state:s,duplicate:false};
}

export class GitHubStateStore {
  constructor({token,transport=fetch,repo='eriklobster/OMLAYER',branch=BRANCH}={}) {
    if (!token) fail('GITHUB_TOKEN or GH_TOKEN is required in the process environment');
    if (repo!=='eriklobster/OMLAYER' || branch!==BRANCH) fail('Use the dedicated Aumyra coordination repository/branch');
    this.token=token; this.transport=transport; this.branch=branch;
    this.url=`https://api.github.com/repos/${repo}/contents/${STATE_PATH}`;
  }
  async request(url,options={}) {
    try {
      return await this.transport(url,{...options,redirect:'error',signal:AbortSignal.timeout(15_000),headers:{
        Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',Authorization:`Bearer ${this.token}`,
        'User-Agent':'aumyra-coordination','Content-Type':'application/json'}});
    } catch { throw new Error('GitHub request outcome unknown; retry the SAME eventId after reading state'); }
  }
  async read() {
    const r=await this.request(this.url+'?ref='+encodeURIComponent(this.branch));
    if (!r.ok) fail('Cannot read coordination state (HTTP '+r.status+'); initialize its dedicated branch first');
    const now=Date.parse(r.headers.get('date'));
    if (!Number.isFinite(now)) fail('GitHub server time unavailable; refusing lease decisions');
    const file=await r.json();
    if (file.size>MAX_BYTES || file.encoding!=='base64' || !/^[a-f0-9]{40}$/.test(file.sha||'')) fail('Invalid GitHub coordination file');
    const state=JSON.parse(Buffer.from(file.content,'base64').toString('utf8'));
    validateState(state); return {state,sha:file.sha,now};
  }
  async write(state,sha,event) {
    const r=await this.request(this.url,{method:'PUT',body:JSON.stringify({branch:this.branch,sha,
      message:`Aumyra task ${event.action}: ${event.taskId} [${event.eventId}]`,
      content:Buffer.from(JSON.stringify(state,null,2)+'\n').toString('base64')})});
    if (r.status===409 || r.status===422) return false;
    if (!r.ok) fail('Coordination write refused (HTTP '+r.status+')');
    return true;
  }
}
export async function synchronize(store,event) {
  for (let attempt=0;attempt<4;attempt++) {
    const {state,sha,now}=await store.read();
    const result=applyEvent(state,event,now);
    if (result.duplicate) return result;
    if (await store.write(result.state,sha,event)) return result;
    // Always read fresh state and revalidate ownership after a compare-and-swap conflict.
  }
  fail('Concurrent coordination updates; retry same eventId after reading current state');
}
export async function assertReleaseLock(store,taskId,actor) {
  const {state,now}=await store.read(),t=state.tasks[taskId],lock=state.locks['aumyra-release'];
  if (!t || !['CLAIMED','IN PROGRESS'].includes(t.status) || t.owner!==actor || lock?.taskId!==taskId || lock?.owner!==actor
      || !Number.isFinite(Date.parse(t.leaseUntil)) || Date.parse(t.leaseUntil)<=now) fail('No current exclusive Aumyra release lease; refuse cloud mutation');
  return t;
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    const store=new GitHubStateStore({token:process.env.GITHUB_TOKEN||process.env.GH_TOKEN});
    if (process.argv[2]==='status') {
      const {state}=await store.read();
      console.log(JSON.stringify({revision:state.revision,tasks:state.tasks,locks:state.locks,autonomousExecution:'NOT RUNNING'},null,2));
    } else if (process.argv[2]==='assert-release') {
      await assertReleaseLock(store,process.env.AUMYRA_RELEASE_TASK,process.env.AUMYRA_RELEASE_OWNER);
      console.log('Exclusive Aumyra release lease verified.');
    } else if (process.argv[2]==='apply' && process.argv[3]) {
      const input=await readFile(process.argv[3],'utf8');
      if (Buffer.byteLength(input)>8192) fail('Event file too large');
      const event=JSON.parse(input), result=await synchronize(store,event);
      console.log(JSON.stringify({revision:result.state.revision,duplicate:result.duplicate,task:result.state.tasks[event.taskId]}));
    } else fail('Usage: node scripts/coordination.mjs status | apply PUBLIC_EVENT.json');
  } catch (error) { console.error(error instanceof SyntaxError?'Invalid JSON; no secret values logged':error.message); process.exitCode=1; }
}
