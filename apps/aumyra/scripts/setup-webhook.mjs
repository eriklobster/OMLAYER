// Run after Cloudflare deploy. Do not log tokens or secrets.
const url=process.argv[2];
const token=process.env.TELEGRAM_BOT_TOKEN;
const secret=process.env.TELEGRAM_WEBHOOK_SECRET;
if(!url || !token || !secret) {
  console.error("Usage: TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... node scripts/setup-webhook.mjs https://YOUR-WORKER/telegram/webhook");
  process.exit(1);
}
let endpoint;
try { endpoint=new URL(url); } catch { console.error("Provide a valid HTTPS URL"); process.exit(1); }
if(endpoint.protocol!=="https:" || endpoint.pathname!=="/telegram/webhook" || endpoint.search) {
  console.error("Webhook URL must be HTTPS and end in /telegram/webhook (no query)");
  process.exit(1);
}
const api="https://api.telegram.org/bot"+token+"/";
async function call(path,data) {
  const response=await fetch(api+path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});
  const result=await response.json();
  if(!response.ok || !result.ok) throw new Error(path+" failed: "+(result.description||response.status));
  return result.result;
}
const me=await call("getMe",{});
if(String(me.username||"").toLowerCase()!=="aumyrabot") throw new Error("Token belongs to a different bot; refusing to change its webhook");
await call("setWebhook",{url:endpoint.toString(),secret_token:secret,allowed_updates:["message"],drop_pending_updates:false});
await call("setMyCommands",{commands:[
  {command:"start",description:"Open Aumyra"},
  {command:"menu",description:"Show Chat and finance buttons"},
  {command:"chat",description:"Open assistant chat"},
  {command:"ask",description:"Ask the AI assistant"},
  {command:"forget",description:"Clear AI chat memory"},
  {command:"expense",description:"Record an expense"},
  {command:"income",description:"Record income"},
  {command:"summary",description:"Current month finances"},
  {command:"history",description:"Recent transactions"},
  {command:"undo",description:"Void last transaction"},
  {command:"note",description:"Save a note"},
  {command:"notes",description:"Read recent notes"},
  {command:"banks",description:"Savings plan targets"},
  {command:"status",description:"Assistant status"},
  {command:"help",description:"Commands and examples"}
]});
await call("setChatMenuButton",{menu_button:{type:"commands"}});
const actual=await call("getWebhookInfo",{});
if(actual.url!==endpoint.toString()) throw new Error("Webhook registration URL mismatch");
console.log("Aumyra webhook and menu verified: "+endpoint.origin+endpoint.pathname);
