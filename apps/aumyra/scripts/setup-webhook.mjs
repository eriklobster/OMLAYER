// AUMYRA Telegram setup: validates bot identity before updating webhooks.
// Safe to import from tests: nothing runs on import.
import {pathToFileURL} from "node:url";

export const COMMANDS = [
  {command:"start",description:"Open Aumyra"},
  {command:"menu",description:"Show Chat and finance buttons"},
  {command:"chat",description:"Open assistant chat"},
  {command:"app",description:"Open native dashboard widget"},
  {command:"ask",description:"Ask the AI assistant"},
  {command:"forget",description:"Clear AI chat memory"},
  {command:"cancel",description:"Exit a finance or note prompt"},
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
];

export async function configureWebhook({webhookUrl,token,secret,transport=fetch}) {
  if (!token || !secret || !webhookUrl) throw new Error("Missing bot token, webhook secret, or Worker URL.");
  if (!/^[0-9]+:[A-Za-z0-9_-]+$/.test(token)) throw new Error("Invalid BotFather token format.");
  if (!/^[A-Za-z0-9_-]{1,256}$/.test(secret)) throw new Error("Webhook secret must use only A-Z, a-z, 0-9, _ and -.");
  let endpoint;
  try { endpoint = new URL(webhookUrl); } catch { throw new Error("Invalid Worker webhook URL."); }
  if (endpoint.protocol!=="https:" || endpoint.pathname!=="/telegram/webhook" || endpoint.search
      || endpoint.hash || endpoint.username || endpoint.password) {
    throw new Error("Webhook URL must be a clean HTTPS /telegram/webhook endpoint.");
  }
  const api="https://api.telegram.org/bot"+token+"/";
  async function call(method,data={}) {
    const response=await transport(api+method,{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify(data)
    });
    if (!response.ok) throw new Error("Telegram "+method+" HTTP "+response.status);
    const payload=await response.json();
    if (!payload.ok) throw new Error("Telegram "+method+" API request rejected.");
    return payload.result;
  }
  const me=await call("getMe");
  if (String(me?.username||"").toLowerCase()!=="aumyrabot") {
    throw new Error("Token belongs to another bot; refusing to modify its webhook.");
  }
  await call("setWebhook",{
    url:endpoint.toString(),
    secret_token:secret,
    allowed_updates:["message","widget_query"],
    drop_pending_updates:false
  });
  await call("setMyCommands",{commands:COMMANDS});
  await call("setChatMenuButton",{menu_button:{type:"commands"}});
  const actual=await call("getWebhookInfo");
  if (actual?.url!==endpoint.toString()) throw new Error("Telegram webhook registration did not match Worker URL.");
  const commands=await call("getMyCommands");
  const menu=await call("getChatMenuButton");
  const received=new Set((commands||[]).map(item=>item.command));
  if (!COMMANDS.every(item=>received.has(item.command))) throw new Error("Telegram command menu missing expected commands.");
  if (menu?.type!=="commands") throw new Error("Telegram chat menu is not configured for commands.");
  return {webhook: endpoint.origin+endpoint.pathname, commandCount:COMMANDS.length, bot:"@AumyraBot"};
}

if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    const result=await configureWebhook({
      webhookUrl:process.argv[2],
      token:process.env.TELEGRAM_BOT_TOKEN,
      secret:process.env.TELEGRAM_WEBHOOK_SECRET
    });
    console.log("Aumyra webhook and command menu verified: "+result.webhook+" ("+result.commandCount+" commands)");
  } catch (error) {
    console.error("Aumyra setup failed: "+error.message);
    process.exitCode=1;
  }
}
