import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,applyEvent,synchronize,GitHubStateStore,assertReleaseLock} from '../scripts/coordination.mjs';
const NOW=Date.parse('2026-11-15T12:00:00Z');
let serial=0;
const event=(action,extra={})=>({eventId:`test-event-${++serial}`,action,taskId:'DEV-COORDINATION',actor:'Work',summary:`Public evidence ${serial}`,...extra});
const add=(extra={})=>event('add',{lane:'Development',...extra});
const claim=(extra={})=>event('claim',{branch:'work/coordination-tests',...extra});
const apply=(s,e,now=NOW)=>applyEvent(s,e,now).state;
function owned(extra={}) {return apply(apply(emptyState(),add(extra)),claim());}
function inspected(s,extra={}) {const t=s.tasks['DEV-COORDINATION'];return {
  expectedVersion:t.version,inspection:{preservedBranch:t.branch,observedCommit:'a'.repeat(40),branchesReviewed:true,commitsReviewed:true,
    processesReviewed:true,resourcesReviewed:true,noActiveExecution:true,evidence:'Preserved branch; active processes and deployment state inspected'},...extra};}
class MemoryStore {
  constructor(s){this.state=s;this.rev=0;this.now=NOW;this.writes=0;}
  async read(){return {state:structuredClone(this.state),sha:String(this.rev),now:this.now};}
  async write(s,sha){if(sha!==String(this.rev))return false;this.state=s;this.rev++;this.writes++;return true;}
}
test('two simultaneous sessions acquire exactly one task owner',async()=>{
  const store=new MemoryStore(apply(emptyState(),add()));
  const results=await Promise.allSettled([synchronize(store,claim()),synchronize(store,claim({actor:'Seashell',branch:'seashell/coordination-tests'}))]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(store.writes,1);assert.equal(store.state.tasks['DEV-COORDINATION'].status,'CLAIMED');
});
test('all three lanes have canonical queues and cannot share active implementation branches',()=>{
  let s=owned();
  s=apply(s,add({taskId:'WORK-ACCESS',lane:'Work'}));
  s=apply(s,add({taskId:'CHAT-ACCEPTANCE',lane:'Simple Chat'}));
  assert.equal(s.tasks['WORK-ACCESS'].queue,25);assert.equal(s.tasks['CHAT-ACCEPTANCE'].queue,26);
  assert.throws(()=>apply(s,claim({taskId:'WORK-ACCESS'})),/branch already owned/);
  assert.throws(()=>apply(s,add({taskId:'WORK-WRONG',lane:'Development'})),/mismatch/);
});
test('unowned tasks can be claimed immediately by Seashell',()=>{
  const s=apply(apply(emptyState(),add()),claim({actor:'Seashell',branch:'seashell/instant'}));
  assert.equal(s.tasks['DEV-COORDINATION'].owner,'Seashell');
});
test('takeover requires 45-minute inactivity plus exact-version inspection and preserves evidence',()=>{
  const s=owned(), takeover=event('takeover',{actor:'Seashell',branch:'seashell/recovery',...inspected(s)});
  assert.throws(()=>apply(s,takeover,NOW+44*60000),/45 minutes/);
  assert.throws(()=>apply(s,{...takeover,inspection:{...takeover.inspection,noActiveExecution:false}},NOW+45*60000),/Inspect/);
  const out=apply(s,takeover,NOW+45*60000);
  assert.equal(out.tasks['DEV-COORDINATION'].owner,'Seashell');
  assert.equal(out.events[takeover.eventId].notice,'TAKEOVER: Work -> Seashell');
  assert.equal(out.events[takeover.eventId].preservedBranch,'work/coordination-tests');
  assert.throws(()=>apply(out,event('heartbeat')),/current task owner/);
  const newer=apply(s,event('heartbeat'),NOW+1000);
  assert.throws(()=>apply(newer,takeover,NOW+46*60000),/version changed/);
});
test('meaningful heartbeat renews lease, while empty repeated progress does not',()=>{
  const s=owned(), old=s.tasks['DEV-COORDINATION'];
  assert.throws(()=>apply(s,event('heartbeat',{summary:old.summary})),/meaningful/);
  const out=apply(s,event('heartbeat',{summary:'Node tests passed; next: inspect deployment lock'}),NOW+20*60000);
  assert.equal(out.tasks['DEV-COORDINATION'].status,'IN PROGRESS');
  assert.equal(Date.parse(out.tasks['DEV-COORDINATION'].leaseUntil),NOW+65*60000);
});
test('DONE, STOPPED and CANCELED tasks cannot restart or be taken over',()=>{
  for(const status of ['DONE','STOPPED','CANCELED']){
    const s=apply(owned(),event('transition',{status}));
    assert.throws(()=>apply(s,claim()),/Only TODO/);
    assert.throws(()=>apply(s,event('takeover',{actor:'Seashell',branch:'seashell/resume',...inspected(s)}),NOW+3600000),/not eligible/);
    assert.throws(()=>apply(s,event('transition',{status:'IN PROGRESS'})),/Invalid transition/);
  }
});
test('different release tasks cannot concurrently lock deployment, migration or webhook resources',async()=>{
  let s=apply(emptyState(),add({resource:'aumyra-release'}));
  s=apply(s,add({taskId:'DEV-SECOND-RELEASE',resource:'aumyra-release'}));
  const store=new MemoryStore(s);
  const results=await Promise.allSettled([
    synchronize(store,claim()),
    synchronize(store,claim({taskId:'DEV-SECOND-RELEASE',actor:'Seashell',branch:'seashell/release'}))]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(Object.keys(store.state.locks).length,1);
});
test('stop and stale time do not release production lock; explicit inspected release does',()=>{
  let s=owned({resource:'aumyra-release'});
  s=apply(s,event('transition',{status:'STOPPED'}));
  assert.ok(s.locks['aumyra-release']);
  s=apply(s,add({taskId:'DEV-NEXT-RELEASE',resource:'aumyra-release'}));
  assert.throws(()=>apply(s,claim({taskId:'DEV-NEXT-RELEASE',branch:'work/next-release'}),NOW+3600000),/locked/);
  assert.throws(()=>apply(s,event('release')),/Inspect/);
  s=apply(s,event('release',inspected(s)));
  s=apply(s,claim({taskId:'DEV-NEXT-RELEASE',branch:'work/next-release'}));
  assert.equal(s.locks['aumyra-release'].taskId,'DEV-NEXT-RELEASE');
});
test('durable outbox event replay after unknown acknowledgement is idempotent',async()=>{
  const store=new MemoryStore(emptyState()),e=add();
  await synchronize(store,e);
  const second=await synchronize(store,e);
  assert.equal(second.duplicate,true);assert.equal(store.writes,1);assert.equal(second.state.revision,1);
  await assert.rejects(synchronize(store,{...e,summary:'different payload'}),/reused/);
});
test('unknown metadata, credential-shaped values, wrong owner and main branch fail closed',()=>{
  assert.throws(()=>apply(emptyState(),add({privateNotes:'never publish'})),/Unknown event field/);
  assert.throws(()=>apply(emptyState(),add({summary:'123456789:abcdefghijklmnopqrstuvwxyz_0123456789'})),/credential/);
  assert.throws(()=>apply(apply(emptyState(),add()),claim({branch:'main'})),/separate/);
  assert.throws(()=>apply(owned(),event('transition',{actor:'intruder',status:'DONE'})),/current task owner/);
});
test('REST store sends SHA compare-and-swap, scoped ref and private auth header',async()=>{
  const calls=[],s=emptyState(),sha='b'.repeat(40),serverDate=new Date(NOW).toUTCString();
  const store=new GitHubStateStore({token:'private-test-value',transport:async(url,opts)=>{
    calls.push({url,opts});
    return opts.method==='PUT'?new Response('{}',{status:200}):Response.json({sha,encoding:'base64',size:90,content:Buffer.from(JSON.stringify(s)).toString('base64')},{headers:{date:serverDate}});
  }});
  const r=await synchronize(store,add());
  assert.equal(r.state.revision,1);
  assert.match(calls[0].url,/ref=aumyra-coordination-state$/);
  assert.equal(JSON.parse(calls[1].opts.body).sha,sha);
  assert.equal(calls[1].opts.headers.Authorization,'Bearer private-test-value');
  assert.equal(calls[1].opts.redirect,'error');
});
test('transport errors never echo credentials; missing GitHub server time blocks lease mutation',async()=>{
  const failed=new GitHubStateStore({token:'secret',transport:()=>{throw new Error('URL contained secret');}});
  await assert.rejects(failed.read(),e=>!e.message.includes('secret') && /outcome unknown/.test(e.message));
  const noDate=new GitHubStateStore({token:'secret',transport:async()=>Response.json({})});
  await assert.rejects(noDate.read(),/server time/);
});
test('release entrypoints reject absent, expired, stopped and wrong-owner leases',async()=>{
  const store=new MemoryStore(owned({resource:'aumyra-release'}));
  assert.equal((await assertReleaseLock(store,'DEV-COORDINATION','Work')).owner,'Work');
  await assert.rejects(assertReleaseLock(store,'DEV-COORDINATION','Seashell'),/exclusive/);
  store.now=NOW+45*60000;
  await assert.rejects(assertReleaseLock(store,'DEV-COORDINATION','Work'),/exclusive/);
  store.now=NOW;store.state=apply(store.state,event('transition',{status:'STOPPED'}));
  await assert.rejects(assertReleaseLock(store,'DEV-COORDINATION','Work'),/exclusive/);
});
