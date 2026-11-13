import test from "node:test";
import assert from "node:assert/strict";
import {handleRequest,respondToText,aiAnswer} from "../src/worker.mjs";

function fakeDB() {
  const updates=new Map(),undoOps=new Map(),resets=new Map(),modes=new Map(),entries=[],notes=[],aiTurns=[];
  let next=1;
  return {updates,undoOps,resets,modes,entries,notes,aiTurns,prepare(sql) {
    let args=[];
    const q={
      bind(...values){args=values;return q;},
      async first(){
        if(sql.startsWith("SELECT created_at,reply_text")) return updates.get(args[0]) ?? null;
        if(sql.startsWith("SELECT entry_id FROM aumyra_undo_ops")) return undoOps.has(args[0]) ? {entry_id:undoOps.get(args[0])} : null;
        if(sql.startsWith("SELECT name FROM sqlite_master")) return {name:args[0]};
        if(sql.startsWith("SELECT kind,update_id,started_at FROM aumyra_compose_modes")) return modes.get(args[0]) ?? null;
        if(sql.startsWith("SELECT MAX(id) AS id FROM aumyra_ai_turns")) return {id:aiTurns.length ? Math.max(...aiTurns.map(t=>t.id)) : null};
        if(sql.startsWith("SELECT last_turn_id FROM aumyra_chat_resets")) return resets.has(args[0]) ? {last_turn_id:resets.get(args[0])} : null;
        if(sql.startsWith("SELECT reply FROM aumyra_ai_turns")) return aiTurns.find(t=>t.update_id===args[0]) ?? null;
        if(sql.startsWith("SELECT id FROM aumyra_entries")) return [...entries].reverse().find(e=>!e.voided_at) ?? null;
        throw Error("Unsupported first: "+sql);
      },
      async all(){
        if(sql.startsWith("SELECT delivery_claimed_at,reply_kind FROM aumyra_processed_updates")) return {results:[]};
        if(sql.startsWith("SELECT kind,currency,SUM")) {
          const found=new Map();
          for(const e of entries.filter(e=>!e.voided_at)) {
            const key=e.kind+":"+e.currency;
            const r=found.get(key)||{kind:e.kind,currency:e.currency,cents:0,n:0};
            r.cents+=e.amount_cents;r.n++;found.set(key,r);
          }
          return {results:[...found.values()]};
        }
        if(sql.startsWith("SELECT kind,amount_cents,currency")) return {results:[...entries].reverse().filter(e=>!e.voided_at).slice(0,10)};
        if(sql.startsWith("SELECT body,created_at")) return {results:[...notes].reverse().slice(0,10)};
        if(sql.startsWith("SELECT prompt,reply FROM aumyra_ai_turns")) return {results:[...aiTurns].reverse().slice(0,6)};
        throw Error("Unsupported all: "+sql);
      },
      async run(){
        if(sql.startsWith("INSERT OR IGNORE INTO aumyra_processed_updates")) {
          if(updates.has(args[0]))return {meta:{changes:0}};
          updates.set(args[0],{created_at:args[1],reply_text:null,reply_markup_json:null,reply_kind:"text",delivered_at:null,delivery_claimed_at:null});return {meta:{changes:1}};
        }
        if(sql.startsWith("UPDATE aumyra_processed_updates SET created_at")) {
          const u=updates.get(args[1]);
          const allowed=!!u && !u.reply_text && u.created_at===args[2];
          if(allowed)u.created_at=args[0];
          return {meta:{changes:allowed ? 1 : 0}};
        }
        if(sql.startsWith("UPDATE aumyra_processed_updates SET reply_text")) {
          const u=updates.get(args[3]);
          const allowed=!!u && !u.reply_text && u.created_at===args[4];
          if(allowed)Object.assign(u,{reply_text:args[0],reply_markup_json:args[1],reply_kind:args[2]});
          return {meta:{changes:allowed ? 1 : 0}};
        }
        if(sql.startsWith("UPDATE aumyra_processed_updates SET delivery_claimed_at=NULL")) {
          const u=updates.get(args[0]);
          const matches=u && u.delivery_claimed_at===args[1] && !u.delivered_at;
          if(matches)u.delivery_claimed_at=null;
          return {meta:{changes:matches ? 1 : 0}};
        }
        if(sql.startsWith("UPDATE aumyra_processed_updates SET delivery_claimed_at")) {
          const u=updates.get(args[1]);
          const matches=u && !u.delivered_at && (!u.delivery_claimed_at || u.delivery_claimed_at<args[2]);
          if(matches)u.delivery_claimed_at=args[0];
          return {meta:{changes:matches ? 1 : 0}};
        }
        if(sql.startsWith("UPDATE aumyra_processed_updates SET delivered_at")) {
          const u=updates.get(args[1]);
          const matches=u && u.delivery_claimed_at===args[2];
          if(matches)Object.assign(u,{delivered_at:args[0],delivery_claimed_at:null});
          return {meta:{changes:matches ? 1 : 0}};
        }
        if(sql.startsWith("DELETE FROM aumyra_processed_updates")) {
          const u=updates.get(args[0]);
          const allowed=!!u && !u.reply_text && u.created_at===args[1];
          if(allowed)updates.delete(args[0]);
          return {meta:{changes:allowed ? 1 : 0}};
        }
        if(sql.startsWith("INSERT INTO aumyra_compose_modes")) {
          const current=modes.get(args[0]);
          if(!current || args[2]>=current.update_id) modes.set(args[0],{kind:args[1],update_id:args[2],started_at:args[3]});
          return {meta:{changes:current && args[2]<current.update_id ? 0 : 1}};
        }
        if(sql.startsWith("DELETE FROM aumyra_compose_modes")) {
          const current=modes.get(args[0]);const match=current && (sql.includes("update_id<?") ? current.update_id<args[1] : current.update_id===args[1]);
          if(match)modes.delete(args[0]);
          return {meta:{changes:match ? 1 : 0}};
        }
        if(sql.startsWith("INSERT OR IGNORE INTO aumyra_undo_ops")) {
          if(undoOps.has(args[0]))return {meta:{changes:0}};
          undoOps.set(args[0],args[1]);return {meta:{changes:1}};
        }
        if(sql.startsWith("INSERT OR IGNORE INTO aumyra_entries")) {
          if(args[6]!=null && entries.some(e=>e.update_id===args[6]))return {meta:{changes:0}};
          entries.push({id:next++,kind:args[0],amount_cents:args[1],currency:args[2],category:args[3],note:args[4],created_at:args[5],update_id:args[6],voided_at:null});
          return {meta:{changes:1}};
        }
        if(sql.startsWith("UPDATE aumyra_entries SET voided_at")) {
          const e=entries.find(e=>e.id===args[1]);if(e)e.voided_at=args[0];return {meta:{changes:e?1:0}};
        }
        if(sql.startsWith("INSERT OR IGNORE INTO aumyra_ai_turns")) {
          if(aiTurns.some(t=>t.update_id===args[0])) return {meta:{changes:0}};
          aiTurns.push({id:next++,update_id:args[0],prompt:args[1],reply:args[2],created_at:args[3]});return {meta:{changes:1}};
        }
        if(sql.startsWith("INSERT OR IGNORE INTO aumyra_chat_resets")) {
          if(resets.has(args[0])) return {meta:{changes:0}};
          resets.set(args[0],args[1]);return {meta:{changes:1}};
        }
        if(sql.startsWith("DELETE FROM aumyra_ai_turns")) {
          const before=aiTurns.length;
          if(sql.includes("WHERE id<=")) {
            for(let i=aiTurns.length-1;i>=0;i--) if(aiTurns[i].id<=args[0]) aiTurns.splice(i,1);
          } else aiTurns.splice(0,aiTurns.length);
          return {meta:{changes:before-aiTurns.length}};
        }
        if(sql.startsWith("INSERT OR IGNORE INTO aumyra_notes")) {
          if(args[2]!=null && notes.some(n=>n.update_id===args[2]))return {meta:{changes:0}};
          notes.push({body:args[0],created_at:args[1],update_id:args[2]});return {meta:{changes:1}};
        }
        throw Error("Unsupported run: "+sql);
      }
    };
    return q;
  }};
}
function env(db=fakeDB()) {return {DB:db,TELEGRAM_BOT_TOKEN:"test-token",TELEGRAM_WEBHOOK_SECRET:"test-secret",TELEGRAM_OWNER_ID:"123"};}
function webhook(text,id=42,from=123,secret="test-secret"){
  return new Request("https://example.test/telegram/webhook",{method:"POST",headers:{"X-Telegram-Bot-Api-Secret-Token":secret},body:JSON.stringify({update_id:id,message:{from:{id:from},chat:{id:123,type:"private"},text}})});
}

test("health is not falsely ready without required configuration", async()=>{
  const r=await handleRequest(new Request("https://example.test/health"),{});
  assert.equal(r.status,503);
  assert.deepEqual(await r.json(),{service:"aumyra",ready:false});
  const good=await handleRequest(new Request("https://example.test/health"),env());
  assert.equal(good.status,200);
});
test("reject wrong webhook secret before processing",async()=>{
  const r=await handleRequest(webhook("/start",1,123,"wrong"),env());
  assert.equal(r.status,401);
});
test("owner ID and private chat block unauthorized messages",async()=>{
  let calls=0;
  const r=await handleRequest(webhook("/start",2,999),env(),async()=>{calls++;return Response.json({ok:true})});
  assert.equal(r.status,200);assert.equal(calls,0);
});
test("Telegram /start replies with menu and deduplicates delivered update",async()=>{
  const e=env();let calls=0,body;
  const transport=async(_url,opts)=>{calls++;body=JSON.parse(opts.body);return Response.json({ok:true})};
  assert.equal((await handleRequest(webhook("/start",11),e,transport)).status,200);
  assert.match(body.text,/AUMYRA · personal command center/);
  assert.equal(body.reply_markup.keyboard.length,4);
  assert.deepEqual(body.reply_markup.keyboard[0].map(x=>x.text),["Chat","Menu","App"]);
  assert.deepEqual(body.reply_markup.keyboard[1].map(x=>x.text),["Expense","Income"]);
  assert.equal((await handleRequest(webhook("/start",11),e,transport)).status,200);
  assert.equal(calls,1);
});
test("Telegram failed send retries cached response without double expense",async()=>{
  const d=fakeDB(),e=env(d);
  let calls=0;
  const transport=async()=>{calls++;return calls===1?new Response("error",{status:500}):Response.json({ok:true})};
  assert.equal((await handleRequest(webhook("/expense 12.50 USDT food lunch",15),e,transport)).status,503);
  assert.equal(d.entries.length,1);
  assert.equal((await handleRequest(webhook("/expense 12.50 USDT food lunch",15),e,transport)).status,200);
  assert.equal(d.entries.length,1);
  assert.equal(d.entries[0].amount_cents,1250);
  assert.equal(calls,2);
});
test("finance summary, history and undo maintain audit history",async()=>{
  const e=env(),d=e.DB;
  assert.match((await respondToText("/income 20 USD teaching lesson",e,fetch,20)).text,/Saved income/);
  assert.match((await respondToText("/expense 3.50 USDT food coffee",e,fetch,21)).text,/Saved expense/);
  assert.match((await respondToText("/summary",e)).text,/3.50 USDT/);
  assert.match((await respondToText("/history",e)).text,/coffee/);
  assert.match((await respondToText("/undo",e)).text,/Audit record preserved/);
  assert.equal(d.entries.length,2);
  assert.equal(d.entries.filter(x=>x.voided_at).length,1);
  assert.doesNotMatch((await respondToText("/summary",e)).text,/3.50 USDT/);
});
test("invalid amounts and duplicate update IDs cannot create extra records",async()=>{
  const e=env();
  await respondToText("/expense 1 USDT food tea",e,fetch,30);
  await respondToText("/expense 1 USDT food tea",e,fetch,30);
  assert.equal(e.DB.entries.length,1);
  assert.match((await respondToText("/expense -2 USDT food tea",e)).text,/Format/);
});
test("note save and retrieval",async()=>{
  const e=env();
  assert.equal((await respondToText("/note buy coffee beans",e,fetch,80)).text,"Note saved.");
  assert.match((await respondToText("/notes",e)).text,/buy coffee beans/);
});
test("AI refuses to invent response without provider key",async()=>{
  const e=env();
  assert.match((await respondToText("Plan my day",e)).text,/not configured yet/);
  e.OPENAI_API_KEY="test-ai-key";
  const text=await aiAnswer("Hello",e,async()=>Response.json({choices:[{message:{content:"Hello from Aumyra."}}]}));
  assert.equal(text,"Hello from Aumyra.");
});
test("malformed JSON and unknown route are handled",async()=>{
  const e=env();
  const bad=new Request("https://example.test/telegram/webhook",{method:"POST",headers:{"X-Telegram-Bot-Api-Secret-Token":"test-secret"},body:"{"});
  assert.equal((await handleRequest(bad,e)).status,400);
  assert.equal((await handleRequest(new Request("https://example.test/"),e)).status,404);
});

test("opt-in Cloudflare Workers AI answers without an OpenAI key", async()=>{
  const e=env();
  e.AI={run:async(model,opts)=>{
    assert.equal(model,"@cf/google/gemma-4-26b-a4b-it");
    assert.equal(opts.messages.at(-1).content,"Hello");
    return {choices:[{message:{content:"Hello from Cloudflare."}}]};
  }};
  assert.equal(await aiAnswer("Hello",e),"Hello from Cloudflare.");
  assert.match((await respondToText("/status",e)).text,/AI chat: configured/);
});

test("savings targets require a private Worker setting",async()=>{
  const e=env();
  assert.match((await respondToText("/banks",e)).text,/not configured yet/);
  e.BANK_PLAN_JSON=JSON.stringify({Reserve:"12.00 USDT target"});
  assert.match((await respondToText("/banks",e)).text,/Reserve: 12.00 USDT target/);
});

test("Telegram /undo retry cannot void an additional expense",async()=>{
  const e=env();
  let attempts=0;
  const deliver=async()=>{attempts++;return attempts===1?new Response("gateway error",{status:502}):Response.json({ok:true})};
  await respondToText("/expense 7 USD supplies old",e,fetch,100);
  await respondToText("/expense 3 USD food new",e,fetch,101);
  assert.equal((await handleRequest(webhook("/undo",102),e,deliver)).status,503);
  assert.equal(e.DB.entries.filter(x=>x.voided_at).length,1);
  assert.equal((await handleRequest(webhook("/undo",102),e,deliver)).status,200);
  assert.equal(e.DB.entries.filter(x=>x.voided_at).length,1);
  assert.equal(e.DB.entries.find(x=>!x.voided_at).category,"supplies");
  assert.equal(e.DB.undoOps.get(102),2);
});
test("two identical /undo requests with same update ID never void two rows even outside webhook",async()=>{
  const e=env();
  await respondToText("/income 1 USD teaching",e,fetch,201);
  await respondToText("/expense 1 USD food",e,fetch,202);
  await respondToText("/undo",e,fetch,203);
  await respondToText("/undo",e,fetch,203);
  assert.equal(e.DB.entries.filter(x=>x.voided_at).length,1);
});
test("OpenAI default uses supported model and no unsupported reasoning override",async()=>{
 const e=env();e.OPENAI_API_KEY="fake";
 await aiAnswer("test",e,async(url,opts)=>{
   assert.equal(url,"https://api.openai.com/v1/chat/completions");
   const request=JSON.parse(opts.body);
   assert.equal(request.model,"gpt-4o-mini");
   assert.equal(Object.hasOwn(request,"reasoning_effort"),false);
   return Response.json({choices:[{message:{content:"ack"}}]});
 });
});

test("iPhone keyboard buttons route to actual bot functions, not stray AI requests",async()=>{
  const e=env();
  assert.match((await respondToText("Menu",e)).text,/personal command center/);
  const chatDisabled=await respondToText("Chat",e);
  assert.match(chatDisabled.text,/AI is not configured/);
  assert.equal(chatDisabled.reply_markup.keyboard[0][0].text,"Chat");
  assert.match((await respondToText("Expense",e)).text,/Send expense as:/);
  assert.match((await respondToText("Income",e)).text,/Send income as:/);
  assert.match((await respondToText("Summary",e)).text,/No new entries/);
  assert.match((await respondToText("History",e)).text,/No new entries/);
  assert.match((await respondToText("Notes",e)).text,/No notes saved/);
  assert.match((await respondToText("Goals",e)).text,/not configured yet/);
  e.OPENAI_API_KEY="fake";
  assert.match((await respondToText("Chat",e)).text,/Chat is ready/);
  const response=await respondToText("Explain my day",e,async()=>Response.json({choices:[{message:{content:"AI works"}}]}));
  assert.equal(response.text,"AI works");
});
test("Telegram keyboard selection is owner-only and retry-safe",async()=>{
  const e=env();
  const sent=[];
  const deliver=async(url,opts)=>{sent.push({url,body:JSON.parse(opts.body)});return Response.json({ok:true})};
  assert.equal((await handleRequest(webhook("Chat",901,999),e,deliver)).status,200);
  assert.equal(sent.length,0);
  assert.equal((await handleRequest(webhook("Menu",902),e,deliver)).status,200);
  assert.equal(sent.length,1);
  assert.equal(sent[0].body.reply_markup.keyboard[0][0].text,"Chat");
  assert.equal((await handleRequest(webhook("Menu",902),e,deliver)).status,200);
  assert.equal(sent.length,1);
});

test("AI chat remembers up to six owner turns, and never re-infers replayed updates",async()=>{
  const e=env();e.OPENAI_API_KEY="fake";
  const requests=[];
  const ai=async(url,opts)=>{
    const body=JSON.parse(opts.body);requests.push(body.messages);
    return Response.json({choices:[{message:{content:"Answer "+requests.length}}]});
  };
  assert.equal((await respondToText("Hello",e,ai,500)).text,"Answer 1");
  assert.equal((await respondToText("What did I say?",e,ai,501)).text,"Answer 2");
  assert.equal(requests.length,2);
  assert.deepEqual(requests[1].map(m=>m.role),["system","user","assistant","user"]);
  assert.equal(requests[1][1].content,"Hello");
  assert.equal((await respondToText("What did I say?",e,ai,501)).text,"Answer 2");
  assert.equal(requests.length,2);
  assert.equal(e.DB.aiTurns.length,2);
});
test("/forget removes only prior AI turns; replay cannot erase newer conversation",async()=>{
  const e=env();e.OPENAI_API_KEY="fake";
  const ai=async()=>Response.json({choices:[{message:{content:"Answer"}}]});
  await respondToText("One",e,ai,601);
  await respondToText("/expense 5 USDT food",e,fetch,602);
  await respondToText("/note Keep this",e,fetch,603);
  const cleared=await respondToText("/forget",e,fetch,604);
  assert.match(cleared.text,/Finance and notes were not changed/);
  assert.equal(e.DB.aiTurns.length,0);
  await respondToText("After reset",e,ai,605);
  await respondToText("/forget",e,fetch,604);
  assert.equal(e.DB.aiTurns.length,1);
  assert.equal(e.DB.aiTurns[0].prompt,"After reset");
  assert.equal(e.DB.entries.length,1);
  assert.equal(e.DB.notes.length,1);
});

test("one-tap Expense and Income composer saves a validated next-message amount",async()=>{
  const e=env();
  assert.match((await respondToText("Expense",e,fetch,1000)).text,/Send expense as:/);
  assert.equal(e.DB.modes.get("123").kind,"expense");
  assert.match((await respondToText("coffee",e,fetch,1001)).text,/Invalid amount/);
  assert.equal(e.DB.modes.get("123").kind,"expense");
  assert.equal(e.DB.entries.length,0);
  assert.match((await respondToText("12.50 USDT food coffee",e,fetch,1002)).text,/Saved expense/);
  assert.equal(e.DB.entries[0].amount_cents,1250);
  assert.equal(e.DB.modes.has("123"),false);
  assert.match((await respondToText("Income",e,fetch,1003)).text,/Send income as:/);
  assert.match((await respondToText("20 USD teaching lesson",e,fetch,1004)).text,/Saved income/);
  assert.equal(e.DB.entries[1].kind,"income");
  assert.equal(e.DB.modes.has("123"),false);
});
test("/note composer, /cancel, expired prompts and action switching preserve data",async()=>{
  const e=env();
  await respondToText("/note",e,fetch,1100);
  assert.equal(e.DB.modes.get("123").kind,"note");
  assert.match((await respondToText("Remember this",e,fetch,1101)).text,/Note saved/);
  assert.equal(e.DB.notes[0].body,"Remember this");
  await respondToText("Expense",e,fetch,1102);
  assert.match((await respondToText("Cancel",e,fetch,1103)).text,/Input cancelled/);
  assert.equal(e.DB.modes.has("123"),false);
  assert.equal(e.DB.entries.length,0);
  await respondToText("Expense",e,fetch,1104);
  assert.match((await respondToText("Chat",e,fetch,1105)).text,/AI is not configured/);
  assert.equal(e.DB.modes.has("123"),false);
  await respondToText("Expense",e,fetch,1106);
  e.DB.modes.get("123").started_at="2020-01-01T00:00:00.000Z";
  assert.match((await respondToText("Hello friend",e,fetch,1107)).text,/AI chat is not configured/);
  assert.equal(e.DB.entries.length,0);
  assert.equal(e.DB.notes.length,1);
});
test("stale Telegram messages cannot replace a newer finance input mode",async()=>{
  const e=env();
  await respondToText("Income",e,fetch,1200);
  await respondToText("Expense",e,fetch,1201);
  await respondToText("Income",e,fetch,1199);
  assert.equal(e.DB.modes.get("123").kind,"expense");
  assert.match((await respondToText("/cancel",e,fetch,1202)).text,/cancelled/);
  assert.equal(e.DB.modes.has("123"),false);
});

test("parallel webhook retries claim one update and send one Telegram reply",async()=>{
  const e=env();
  let release;
  const gate=new Promise(r=>{release=r});
  let sending=0;
  const transport=async()=>{sending++;await gate;return Response.json({ok:true})};
  const first=handleRequest(webhook("/expense 3 USDT food tea",2100),e,transport);
  // The second request races the first while delivery is still blocked.
  const second=handleRequest(webhook("/expense 3 USDT food tea",2100),e,transport);
  const duplicate=await second;
  assert.equal(duplicate.status,503);
  // The winner may still be processing; wait for it before verifying writes.
  release();
  assert.equal((await first).status,200);
  assert.equal(e.DB.entries.length,1);
  assert.equal(sending,1);
  assert.equal((await handleRequest(webhook("/expense 3 USDT food tea",2100),e,transport)).status,200);
  assert.equal(sending,1);
  assert.equal(e.DB.entries.length,1);
});
test("stale unfinished webhook update is reclaimed once without double entry",async()=>{
  const e=env();
  e.DB.updates.set(2200,{
    created_at:"2020-01-01T00:00:00.000Z",
    reply_text:null,reply_markup_json:null,delivered_at:null
  });
  let sends=0;
  const transport=async()=>{sends++;return Response.json({ok:true})};
  assert.equal((await handleRequest(webhook("/expense 2 USDT food milk",2200),e,transport)).status,200);
  assert.equal(e.DB.entries.length,1);
  assert.equal(sends,1);
  assert.ok(Date.parse(e.DB.updates.get(2200).created_at)>Date.parse("2020-01-01T00:00:00Z"));
});

test("health refuses to report ready when any primary D1 table is missing",async()=>{
  const required=["aumyra_processed_updates","aumyra_entries","aumyra_notes",
    "aumyra_undo_ops","aumyra_ai_turns","aumyra_chat_resets","aumyra_compose_modes"];
  for(const absent of required){
    const db={prepare(sql){
      assert.match(sql,/sqlite_master/);
      return {bind(name){return {first:async()=>name===absent?null:{name}}}};
    }};
    const r=await handleRequest(new Request("https://example.test/health"),env(db));
    assert.equal(r.status,503,"should refuse incomplete schema: "+absent);
    assert.deepEqual(await r.json(),{service:"aumyra",ready:false});
  }
});

test("owner receives a clear text-only response for voice and photos, never AI or finance writes",async()=>{
  const e=env();let sent=null;
  const request=new Request("https://example.test/telegram/webhook",{
    method:"POST",headers:{"X-Telegram-Bot-Api-Secret-Token":"test-secret"},
    body:JSON.stringify({update_id:2500,message:{
      chat:{id:123,type:"private"},from:{id:123},photo:[{file_id:"not-a-real-file"}]
    }})
  });
  const transport=async(_url,opts)=>{sent=JSON.parse(opts.body);return Response.json({ok:true})};
  assert.equal((await handleRequest(request,e,transport)).status,200);
  assert.match(sent.text,/text messages only/);
  assert.equal(sent.reply_markup.keyboard[0][0].text,"Chat");
  assert.equal(e.DB.entries.length,0);
});

test("two concurrent retries of cached Telegram reply send once",async()=>{
  const e=env();
  // Cached answer exists from an earlier attempt that got a definite 500.
  e.DB.updates.set(3000,{
    created_at:new Date().toISOString(),
    reply_text:"Cached response",reply_markup_json:null,
    delivered_at:null,delivery_claimed_at:null
  });
  let release;
  const gate=new Promise(resolve=>{release=resolve});
  let sends=0;
  const transport=async()=>{sends++;await gate;return Response.json({ok:true})};
  const first=handleRequest(webhook("/start",3000),e,transport);
  const second=handleRequest(webhook("/start",3000),e,transport);
  const loser=await second;
  assert.equal(loser.status,503);
  release();
  assert.equal((await first).status,200);
  assert.equal(sends,1);
  assert.ok(e.DB.updates.get(3000).delivered_at);
  assert.equal((await handleRequest(webhook("/start",3000),e,transport)).status,200);
  assert.equal(sends,1);
});
test("definite Telegram send failure releases delivery lease for immediate retry",async()=>{
  const e=env();let sends=0;
  const transport=async()=>{
    sends++;
    return sends===1?new Response("unavailable",{status:500}):Response.json({ok:true});
  };
  assert.equal((await handleRequest(webhook("/note buy milk",3100),e,transport)).status,503);
  assert.equal(e.DB.notes.length,1);
  assert.equal(e.DB.updates.get(3100).delivery_claimed_at,null);
  assert.equal((await handleRequest(webhook("/note buy milk",3100),e,transport)).status,200);
  assert.equal(sends,2);
  assert.equal(e.DB.notes.length,1);
});
test("uncertain network failure retains lease until expiry, then retries cached answer",async()=>{
  const e=env();let attempts=0;
  const transport=async()=>{
    attempts++;
    if(attempts===1) throw new Error("timeout after possible send");
    return Response.json({ok:true});
  };
  assert.equal((await handleRequest(webhook("/start",3200),e,transport)).status,503);
  assert.ok(e.DB.updates.get(3200).delivery_claimed_at);
  assert.equal((await handleRequest(webhook("/start",3200),e,transport)).status,503);
  assert.equal(attempts,1);
  e.DB.updates.get(3200).delivery_claimed_at="2020-01-01T00:00:00.000Z";
  assert.equal((await handleRequest(webhook("/start",3200),e,transport)).status,200);
  assert.equal(attempts,2);
});

test("health rejects missing delivery-lease migration even if tables exist",async()=>{
  const missingColumn={prepare(sql) {
    if(sql.startsWith("SELECT name FROM sqlite_master"))
      return {bind(name){return {first:async()=>({name})}}};
    if(sql.startsWith("SELECT delivery_claimed_at,reply_kind FROM aumyra_processed_updates"))
      return {all:async()=>{throw new Error("no such column: delivery_claimed_at")}};
    throw Error("Unexpected health SQL");
  }};
  const r=await handleRequest(new Request("https://example.test/health"),env(missingColumn));
  assert.equal(r.status,503);
});

test("App button sends a native private Telegram widget and safely retries the same update",async()=>{
  const e=env();const calls=[];
  const transport=async(url,opts)=>{calls.push({url,body:JSON.parse(opts.body)});return Response.json({ok:true})};
  assert.equal((await respondToText("App",e)).kind,"widget");
  assert.equal((await handleRequest(webhook("App",3300),e,transport)).status,200);
  assert.equal(calls.length,1);
  assert.match(calls[0].url,/\/sendWidget$/);
  assert.equal(calls[0].body.allow_queries,true);
  assert.match(calls[0].body.html,/TelegramWidget\.request/);
  assert.equal(calls[0].body.chat_id,123);
  assert.equal(calls[0].body.reply_markup.keyboard[0][2].text,"App");
  assert.equal(e.DB.updates.get(3300).reply_kind,"widget");
  assert.equal((await handleRequest(webhook("App",3300),e,transport)).status,200);
  assert.equal(calls.length,1);
});
test("owner-only widget queries return read-only D1 views via answerWidgetQuery",async()=>{
  const e=env(),calls=[];
  const transport=async(url,opts)=>{calls.push({url,body:JSON.parse(opts.body)});return Response.json({ok:true})};
  const widgetRequest=(data,id=3400,owner=123,chat=123)=>new Request("https://example.test/telegram/webhook",{
    method:"POST",headers:{"X-Telegram-Bot-Api-Secret-Token":"test-secret"},
    body:JSON.stringify({update_id:id,widget_query:{
      id:"widget-request-"+id,from:{id:owner},chat:{id:chat,type:"private"},message_id:100,data
    }})
  });
  assert.equal((await handleRequest(widgetRequest("summary"),e,transport)).status,200);
  assert.equal(calls.length,1);
  assert.match(calls[0].url,/\/answerWidgetQuery$/);
  assert.match(calls[0].body.data,/No new entries/);
  assert.equal(calls[0].body.widget_query_id,"widget-request-3400");
  let id=3400;
  for(const action of ["history","notes","goals","help","chat","expense","income"]){
    assert.equal((await handleRequest(widgetRequest(action,++id),e,transport)).status,200);
  }
  assert.equal(e.DB.entries.length,0);
  assert.equal(e.DB.notes.length,0);
  assert.equal(e.DB.aiTurns.length,0);
  assert.equal(calls.length,8);
  assert.equal((await handleRequest(widgetRequest("summary",3600,999),e,transport)).status,200);
  assert.equal((await handleRequest(widgetRequest("summary",3601,123,999),e,transport)).status,200);
  assert.equal((await handleRequest(widgetRequest("transfer_funds",3602),e,transport)).status,200);
  assert.equal(calls.length,8);
  assert.equal((await handleRequest(widgetRequest("notes",3603),e,transport)).status,200);
  assert.equal(calls.length,9);
});
