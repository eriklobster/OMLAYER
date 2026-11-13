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
  {command:"help",description:"Commands and examples"},
  {command:"summary",description:"Month finances"},
  {command:"history",description:"Recent entries"},
  {command:"banks",description:"Savings plan"},
  {command:"notes",description:"Saved notes"},
  {command:"status",description:"Assistant status"}
]});
await call("setChatMenuButton",{menu_button:{type:"commands"}});
const actual=await call("getWebhookInfo",{});
if(actual.url!==endpoint.toString()) throw new Error("Webhook registration URL mismatch");
console.log("Aumyra webhook and menu verified: "+endpoint.origin+endpoint.pathname);
