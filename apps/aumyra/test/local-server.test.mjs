import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {request as httpRequest} from 'node:http';
import {spawn} from 'node:child_process';
import net from 'node:net';
import {openLocalData,createLocalServer,startOutboxSync} from '../scripts/local-server.mjs';
import {emptyState} from '../scripts/coordination.mjs';
function fixture(){const dir=mkdtempSync(join(tmpdir(),'aumyra-local-'));return {dir,path:join(dir,'private.sqlite'),cleanup:()=>rmSync(dir,{recursive:true,force:true})};}
test('private notes/tasks and outbox survive restart; lost GitHub acknowledgement does not duplicate',async()=>{
  const f=fixture();let local=openLocalData(f.path),remote=emptyState(),rev=0,loseAck=true;
  const store={async read(){return {state:remote,sha:String(rev),now:Date.now()};},async write(state,sha){if(sha!==String(rev))return false;remote=state;rev++;if(loseAck){loseAck=false;throw new Error('lost response');}return true;}};
  try{
    local.note('PRIVATE health/finance fixture never sent');
    local.task('PRIVATE task details','Review public Aumyra test evidence');
    local.task('Another PRIVATE task, local only');
    await assert.rejects(local.syncOne(store),/durable outbox/);
    assert.equal(local.read().pending,1);assert.equal(Object.keys(remote.tasks).length,1);
    local.close();local=openLocalData(f.path);
    assert.equal(local.read().notes[0].body,'PRIVATE health/finance fixture never sent');
    const r=await local.syncOne(store);assert.equal(r.duplicate,true);assert.equal(local.read().pending,0);
    assert.equal(Object.keys(remote.tasks).length,1);assert.ok(!JSON.stringify(remote).includes('PRIVATE'));
    assert.equal(local.read().tasks.length,2);
  }finally{local.close();f.cleanup();}
});
test('public outbox rejects secret-shaped summaries without half-saving a task',()=>{
  const f=fixture(),data=openLocalData(f.path);
  try{assert.throws(()=>data.task('Private local body','123456789:abcdefghijklmnopqrstuvwxyz_12345678'),/credential/);assert.equal(data.read().tasks.length,0);}
  finally{data.close();f.cleanup();}
});
test('local HTTP interface enforces owner session, host, origin, CSRF and explicit public selection',async()=>{
  const f=fixture(),data=openLocalData(f.path),origin='http://127.0.0.1:8788',token='test-owner-token-'.repeat(4);
  const server=createLocalServer({data,origin,token});server.listen(0,'127.0.0.1');await once(server,'listening');
  const base='http://127.0.0.1:'+server.address().port;
  let cookie='',csrf='';
  const request=(path,payload,headers={})=>new Promise((resolve,reject)=>{
    const req=httpRequest(base+path,{method:payload===undefined?'GET':'POST',headers:{host:'127.0.0.1:8788',origin,'content-type':'application/json',cookie,'x-aumyra-csrf':csrf,...headers}},res=>{
      const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:res.statusCode,headers:Object.fromEntries(Object.entries(res.headers).map(([k,v])=>[k,Array.isArray(v)?v.join(','):v]))})));
    });req.on('error',reject);if(payload!==undefined)req.write(JSON.stringify(payload));req.end();
  });
  try{
    assert.equal((await request('/api/state')).status,401);
    assert.equal((await request('/api/login',{token:'wrong'})).status,401);
    assert.equal((await request('/api/login',{token},{origin:'https://hostile.example'})).status,403);
    const login=await request('/api/login',{token});assert.equal(login.status,200);
    const setCookie=login.headers.get('set-cookie');assert.match(setCookie,/HttpOnly/);assert.match(setCookie,/SameSite=Strict/);
    cookie=setCookie.split(';')[0];csrf=(await login.json()).csrf;
    assert.equal((await request('/api/notes',{text:'persisted fixture'},{'x-aumyra-csrf':'wrong'})).status,403);
    assert.equal((await request('/api/notes',{text:'persisted fixture'})).status,201);
    assert.equal((await request('/api/tasks',{text:'private task',publicSummary:'public but not approved'})).status,400);
    assert.equal((await request('/api/tasks',{text:'private task',publishPublic:true})).status,400);
    assert.equal((await request('/api/tasks',{text:'private task',publishPublic:true,publicSummary:'Public engineering fixture'})).status,201);
    const state=await (await request('/api/state')).json();assert.equal(state.pending,1);assert.equal(state.executor,'NOT RUNNING');
    assert.equal((await request('/api/sync',{})).status,503);
    assert.equal((await request('/api/state',undefined,{host:'hostile.example'})).status,403);
    await request('/api/logout',{});assert.equal((await request('/api/state')).status,401);
    const page=await request('/');assert.match(page.headers.get('content-security-policy'),/frame-ancestors 'none'/);
    assert.ok(!(await page.text()).includes('persisted fixture'));
  }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));data.close();f.cleanup();}
});
test('LAN plaintext binding and weak owner tokens are refused before listening',()=>{
  assert.throws(()=>createLocalServer({data:{},token:'a'.repeat(32),origin:'http://192.168.1.20:8788'}),/HTTPS/);
  assert.throws(()=>createLocalServer({data:{},token:'weak',origin:'http://127.0.0.1:8788'}),/private/);
});
test('automatic outbox synchronization backs off offline and has a tested stop mechanism',async()=>{
  let tick,delay,cleared=false,calls=0;
  const stop=startOutboxSync({async syncOne(){calls++;if(calls===1)throw new Error('offline');}}, {}, {setTimer(fn,ms){tick=fn;delay=ms;return 1;},clearTimer(){cleared=true;}});
  assert.equal(delay,60000);await tick();assert.equal(delay,120000);
  await tick();assert.equal(delay,60000);stop();assert.equal(cleared,true);await tick();assert.equal(calls,2);
});
test('actual local entrypoint starts without UI and stops on SIGTERM preserving SQLite', {timeout:10000},async()=>{
  const f=fixture(),portFinder=net.createServer();portFinder.listen(0,'127.0.0.1');await once(portFinder,'listening');const port=portFinder.address().port;await new Promise(r=>portFinder.close(r));
  const child=spawn(process.execPath,['--max-old-space-size=192',new URL('../scripts/local-server.mjs',import.meta.url).pathname],{
    env:{...process.env,GH_TOKEN:'',GITHUB_TOKEN:'',AUMYRA_LOCAL_TOKEN:'fixture-private-token-'.repeat(3),AUMYRA_LOCAL_DB:f.path,AUMYRA_LOCAL_ORIGIN:`http://127.0.0.1:${port}`},stdio:['ignore','pipe','pipe']});
  let output='';
  try{
    await new Promise((resolve,reject)=>{child.stdout.on('data',chunk=>{output+=chunk;if(output.includes('local interface ready'))resolve();});child.once('error',reject);child.once('exit',()=>reject(new Error('Local process exited before ready')));});
    assert.ok(!output.includes('fixture-private-token'));
    assert.equal((await fetch(`http://127.0.0.1:${port}/`)).status,200);
    const exited=once(child,'exit');child.kill('SIGTERM');const [code]=await exited;assert.equal(code,0);
    const reopened=openLocalData(f.path);assert.equal(reopened.read().pending,0);reopened.close();
  }finally{if(child.exitCode===null)child.kill('SIGTERM');f.cleanup();}
});
