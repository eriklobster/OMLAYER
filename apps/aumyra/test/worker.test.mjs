import test from "node:test";
import assert from "node:assert/strict";
import {handleRequest,respondToText,aiAnswer} from "../src/worker.mjs";

function fakeDB() {
  const updates=new Map(),undoOps=new Map(),entries=[],notes=[];
  let next=1;
  return {updates,undoOps,entries,notes,prepare(sql) {
    let args=[];
    const q={
      bind(...values){args=values;return q;},
      async first(){
        if(sql.startsWith("SELECT created_at,reply_text")) return updates.get(args[0]) ?? null;
        if(sql.startsWith("SELECT entry_id FROM aumyra_undo_ops")) return undoOps.has(args[0]) ? {entry_id:undoOps.get(args[0])} : null;
        if(sql.startsWith("SELECT name FROM sqlite_master")) return {name:"aumyra_undo_ops"};
        if(sql.startsWith("SELECT id FROM aumyra_entries")) return [...entries].reverse().find(e=>!e.voided_at) ?? null;
        throw Error("Unsupported first: "+sql);
      },
      async all(){
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
        throw Error("Unsupported all: "+sql);
      },
      async run(){
        if(sql.startsWith("INSERT OR IGNORE INTO aumyra_processed_updates")) {
          if(updates.has(args[0]))return {meta:{changes:0}};
          updates.set(args[0],{created_at:args[1],reply_text:null,reply_markup_json:null,delivered_at:null});return {meta:{changes:1}};
        }
        if(sql.startsWith("UPDATE aumyra_processed_updates SET reply_text")) {
          Object.assign(updates.get(args[2]),{reply_text:args[0],reply_markup_json:args[1]});return {meta:{changes:1}};
        }
        if(sql.startsWith("UPDATE aumyra_processed_updates SET delivered_at")) {
          updates.get(args[1]).delivered_at=args[0];return {meta:{changes:1}};
        }
        if(sql.startsWith("DELETE FROM aumyra_processed_updates")) {
          const u=updates.get(args[0]);if(u && !u.reply_text)updates.delete(args[0]);return {meta:{changes:1}};
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
  assert.match(body.text,/Aumyra is ready/);
  assert.equal(body.reply_markup.keyboard.length,4);
  assert.deepEqual(body.reply_markup.keyboard[0].map(x=>x.text),["Chat","Menu"]);
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
  assert.match((await respondToText("Expense",e)).text,/Format: \/expense/);
  assert.match((await respondToText("Income",e)).text,/Format: \/expense/);
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
