// Execute the actual Worker queries against SQLite, not a SQL-string mock.
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {handleRequest} from '../src/worker.mjs';
function database(){
  const sqlite=new DatabaseSync(':memory:');
  for(const p of readdirSync(new URL('../migrations/',import.meta.url)).sort())sqlite.exec(readFileSync(new URL('../migrations/'+p,import.meta.url),'utf8'));
  const db={sqlite,prepare(sql){let args=[];const q={bind(...a){args=a;return q;},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return {results:sqlite.prepare(sql).all(...args)};},async run(){const r=sqlite.prepare(sql).run(...args);return {meta:{changes:r.changes}};}};return q;}};
  return db;
}
const environment=DB=>({DB,TELEGRAM_BOT_TOKEN:'test-token',TELEGRAM_WEBHOOK_SECRET:'secret',TELEGRAM_OWNER_ID:'123'});
function request(text,id,from=123){return new Request('https://example.test/telegram/webhook',{method:'POST',headers:{'X-Telegram-Bot-Api-Secret-Token':'secret'},body:JSON.stringify({update_id:id,message:{from:{id:from},chat:{id:123,type:'private'},text}})});}
test('real SQLite: guided finance, duplicate delivery, today, undo, notes and owner isolation',async()=>{
  const db=database(),env=environment(db),sent=[];
  const telegram=async(url,options)=>{sent.push(JSON.parse(options.body));return Response.json({ok:true});};
  try{
    assert.equal((await handleRequest(new Request('https://example.test/health'),env)).status,200);
    for(const [text,id] of [['Expense',1],['12.50 USDT qa fixture',2],['12.50 USDT qa fixture',2],['/today',3],['/undo',4],['/undo',4],['/note durable fixture',5],['/notes',6]]){
      assert.equal((await handleRequest(request(text,id),env,telegram)).status,200);
    }
    assert.equal(db.sqlite.prepare('SELECT count(*) AS n FROM aumyra_entries').get().n,1);
    assert.ok(db.sqlite.prepare('SELECT voided_at FROM aumyra_entries').get().voided_at);
    assert.equal(db.sqlite.prepare('SELECT count(*) AS n FROM aumyra_notes').get().n,1);
    assert.ok(sent.some(m=>m.text.includes('12.50 USDT')));
    assert.ok(sent.some(m=>m.text.includes('durable fixture')));
    const before=sent.length;
    await handleRequest(request('/notes',7,999),env,telegram);assert.equal(sent.length,before);
  }finally{db.sqlite.close();}
});
test('lost insert race reloads native widget kind from actual SQLite projection',async()=>{
  const db=database(),prepare=db.prepare.bind(db);let raced=false,method;
  db.prepare=sql=>{
    const q=prepare(sql),run=q.run.bind(q);
    if(sql.startsWith('INSERT OR IGNORE INTO aumyra_processed_updates'))q.run=async()=>{
      if(!raced){raced=true;db.sqlite.prepare("INSERT INTO aumyra_processed_updates(update_id,created_at,reply_text,reply_kind) VALUES(42,?,'Cached widget','widget')").run(new Date().toISOString());}
      return run();
    };
    return q;
  };
  try{
    const r=await handleRequest(request('/app',42),environment(db),async(url)=>{method=String(url).split('/').pop();return Response.json({ok:true});});
    assert.equal(await r.text(),'delivered');assert.equal(method,'sendWidget');
  }finally{db.sqlite.close();}
});
