// Optional local notes/tasks. No Telegram offline emulation, inference or task execution.
import http from 'node:http';
import https from 'node:https';
import {DatabaseSync} from 'node:sqlite';
import {createHash,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {readFileSync,mkdirSync,chmodSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {emptyState,applyEvent,synchronize,GitHubStateStore} from './coordination.mjs';

const fail=message=>{throw new Error(message);};
function text(value,max=8000){if(typeof value!=='string' || !value.trim() || value.length>max)fail('Invalid text or local capacity exceeded');return value.trim();}
export function openLocalData(path){
  mkdirSync(dirname(path),{recursive:true,mode:0o700});
  const db=new DatabaseSync(path);chmodSync(path,0o600);
  db.exec(`PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL;
    CREATE TABLE IF NOT EXISTS notes(id TEXT PRIMARY KEY,body TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY,body TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS outbox(id TEXT PRIMARY KEY,task_id TEXT NOT NULL,event_json TEXT NOT NULL,created_at TEXT NOT NULL,delivered_at TEXT,attempts INTEGER NOT NULL DEFAULT 0);`);
  let flushing=false;
  function capacity(table){if(db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n>=1000)fail('Local capacity reached; export and review before adding more');}
  return {
    close(){db.close();},
    read(){return {notes:db.prepare('SELECT * FROM notes ORDER BY created_at DESC LIMIT 50').all(),
      tasks:db.prepare('SELECT t.*,o.id AS event_id,o.delivered_at,o.attempts FROM tasks t LEFT JOIN outbox o ON o.task_id=t.id ORDER BY t.created_at DESC LIMIT 50').all(),
      pending:db.prepare('SELECT COUNT(*) AS n FROM outbox WHERE delivered_at IS NULL').get().n};},
    note(body){capacity('notes');const id=randomUUID();db.prepare('INSERT INTO notes VALUES(?,?,?)').run(id,text(body),new Date().toISOString());return id;},
    task(body,publicSummary=null){
      capacity('tasks');body=text(body);const id=randomUUID(),at=new Date().toISOString();let e=null;
      if(publicSummary!==null){
        capacity('outbox');
        e={eventId:'lan-'+randomUUID(),action:'add',taskId:'WORK-LAN-'+id.replaceAll('-','').toUpperCase(),actor:'LAN-owner',lane:'Work',summary:text(publicSummary,400)};
        applyEvent(emptyState(),e); // Same field/credential validation as the public ledger.
      }
      db.exec('BEGIN IMMEDIATE');
      try{db.prepare('INSERT INTO tasks VALUES(?,?,?)').run(id,body,at);if(e)db.prepare('INSERT INTO outbox(id,task_id,event_json,created_at) VALUES(?,?,?,?)').run(e.eventId,id,JSON.stringify(e),at);db.exec('COMMIT');}
      catch(error){db.exec('ROLLBACK');throw error;}
      return id;
    },
    async syncOne(store){
      if(flushing)fail('One synchronization is already active');
      const row=db.prepare('SELECT * FROM outbox WHERE delivered_at IS NULL ORDER BY created_at,id LIMIT 1').get();
      if(!row)return {sent:0};
      flushing=true;
      try{
        db.prepare('UPDATE outbox SET attempts=attempts+1 WHERE id=?').run(row.id);
        const result=await synchronize(store,JSON.parse(row.event_json));
        db.prepare('UPDATE outbox SET delivered_at=? WHERE id=?').run(new Date().toISOString(),row.id);
        return {sent:1,duplicate:result.duplicate};
      }catch{fail('GitHub unavailable or event rejected; event remains in the durable outbox');}
      finally{flushing=false;}
    }
  };
}
export function createLocalServer({data,token,origin,tls=null,store=null}){
  if(typeof token!=='string' || token.length<32 || token.length>512)fail('Set a private AUMYRA_LOCAL_TOKEN of at least 32 characters');
  const url=new URL(origin),loopback=['127.0.0.1','localhost','[::1]'].includes(url.hostname);
  if(url.username || url.password || url.pathname!=='/' || url.search || url.hash || !['http:','https:'].includes(url.protocol))fail('Use a bare local origin');
  if(!loopback && (url.protocol!=='https:' || !tls))fail('LAN access requires HTTPS with an owner-trusted certificate');
  if(url.protocol==='https:' && !tls)fail('HTTPS certificate and key required');
  const tokenHash=createHash('sha256').update(token).digest(),sessions=new Map(),attempts=new Map();
  const html=readFileSync(new URL('../local/index.html',import.meta.url));
  const js=readFileSync(new URL('../local/app.js',import.meta.url));
  const secure=url.protocol==='https:'?'; Secure':'';
  async function body(req){let bytes=0,chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>16384)fail('Request too large');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
  const handler=async(req,res)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
    const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
    try{
      if(req.headers.host!==url.host)return json(403,{error:'Unexpected host'});
      const now=Date.now();
      for(const [key,s] of sessions)if(s.expires<=now)sessions.delete(key);
      for(const [key,a] of attempts)if(a.until<=now)attempts.delete(key);
      const sid=/\baum_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie||'')?.[1],session=sessions.get(sid);
      if(req.method==='GET' && req.url==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(html);}
      if(req.method==='GET' && req.url==='/app.js'){res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8'});return res.end(js);}
      if(req.method==='POST'){
        if(req.headers.origin!==url.origin || req.headers['content-type']!=='application/json')return json(403,{error:'Same-origin JSON required'});
        if(req.url==='/api/login'){
          const ip=req.socket.remoteAddress||'unknown',a=attempts.get(ip)||{n:0,until:now+60000};
          if(a.n>=10 || attempts.size>=1000)return json(429,{error:'Try again later'});
          a.n++;attempts.set(ip,a);
          const payload=await body(req),input=typeof payload.token==='string'?payload.token:'';
          if(!timingSafeEqual(tokenHash,createHash('sha256').update(input).digest()))return json(401,{error:'Owner authentication required'});
          if(sessions.size>=16)sessions.delete(sessions.keys().next().value);
          const id=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex');sessions.set(id,{csrf,expires:now+3600000});
          res.setHeader('Set-Cookie',`aum_session=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600${secure}`);
          return json(200,{csrf});
        }
        if(!session || req.headers['x-aumyra-csrf']!==session.csrf)return json(403,{error:'Owner session required'});
        if(req.url==='/api/logout'){sessions.delete(sid);res.setHeader('Set-Cookie',`aum_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`);return json(200,{ok:true});}
        const payload=await body(req);
        if(req.url==='/api/notes'){data.note(payload.text);return json(201,{ok:true});}
        if(req.url==='/api/tasks'){
          if(payload.publicSummary && payload.publishPublic!==true)return json(400,{error:'Explicit public publishing selection required'});
          data.task(payload.text,payload.publishPublic===true?text(payload.publicSummary,400):null);return json(201,{ok:true});
        }
        if(req.url==='/api/sync'){
          if(!store)return json(503,{error:'Private GitHub connection is not configured. Outbox is preserved.'});
          return json(200,await data.syncOne(store));
        }
      }
      if(req.method==='GET' && req.url==='/api/state'){
        if(!session)return json(401,{error:'Owner authentication required'});
        return json(200,{...data.read(),csrf:session.csrf,githubConfigured:!!store,executor:'NOT RUNNING'});
      }
      return json(404,{error:'Not found'});
    }catch{if(!res.headersSent)json(400,{error:'Request failed safely; local records and queued events are preserved'});else res.end();}
  };
  const server=tls?https.createServer(tls,handler):http.createServer(handler);
  server.maxConnections=16;server.requestTimeout=10000;server.headersTimeout=5000;server.keepAliveTimeout=5000;server.maxRequestsPerSocket=100;
  return server;
}
export function startOutboxSync(data,store,{setTimer=setTimeout,clearTimer=clearTimeout}={}){
  let stopped=false,timer,delay=60000;
  const tick=async()=>{
    if(stopped)return;
    try{await data.syncOne(store);delay=60000;}catch{delay=Math.min(delay*2,900000);}
    if(!stopped){timer=setTimer(tick,delay);timer.unref?.();}
  };
  timer=setTimer(tick,delay);timer.unref?.();
  return ()=>{stopped=true;clearTimer(timer);};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const env=process.env,origin=env.AUMYRA_LOCAL_ORIGIN||'http://127.0.0.1:8788',url=new URL(origin);
    const tls=env.AUMYRA_TLS_CERT && env.AUMYRA_TLS_KEY?{cert:readFileSync(env.AUMYRA_TLS_CERT),key:readFileSync(env.AUMYRA_TLS_KEY)}:null;
    const data=openLocalData(resolve(env.AUMYRA_LOCAL_DB||'local-data/aumyra.sqlite'));
    const store=env.GITHUB_TOKEN||env.GH_TOKEN?new GitHubStateStore({token:env.GITHUB_TOKEN||env.GH_TOKEN}):null;
    const server=createLocalServer({data,token:env.AUMYRA_LOCAL_TOKEN,origin,tls,store});
    const stopSync=store?startOutboxSync(data,store):()=>{};
    // Bind only the configured address, never silently expose on every interface.
    server.listen(Number(url.port)||(tls?443:80),url.hostname.replace(/^\[|\]$/g,''),()=>console.log('AUMYRA local interface ready. Task executor: NOT RUNNING. Stop with Ctrl+C.'));
    server.on('error',()=>{stopSync();console.error('Local listener failed; no credentials logged.');data.close();process.exitCode=1;});
    let stopping=false;
    const stop=()=>{if(stopping)return;stopping=true;stopSync();server.close(()=>{data.close();});setTimeout(()=>server.closeAllConnections(),5000).unref();};
    process.on('SIGINT',stop);process.on('SIGTERM',stop);
  }catch{console.error('Local startup failed. Verify token, origin, trusted TLS and private data directory. No task executor started.');process.exitCode=1;}
}
