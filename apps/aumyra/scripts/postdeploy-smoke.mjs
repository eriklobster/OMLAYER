// AUMYRA production smoke: check Worker health, Telegram webhook identity,
// installed commands, and send an owner-only welcome message when possible.
// Does not mutate D1 ledger, other bots or Cloudflare configuration.
import {pathToFileURL} from "node:url";

export async function smoke({workerUrl, token, ownerId, transport=fetch}) {
  if (!token || !ownerId || !workerUrl) throw new Error("Worker URL, bot token and owner ID are required.");
  if (!/^[0-9]+:[A-Za-z0-9_-]+$/.test(token)) throw new Error("Invalid BotFather token.");
  if (!/^[1-9][0-9]{3,19}$/.test(String(ownerId))) throw new Error("Invalid numeric Telegram owner ID.");

  let base;
  try { base = new URL(workerUrl); } catch { throw new Error("Invalid Worker URL."); }
  if (base.protocol !== "https:" || base.pathname !== "/" || base.search || base.hash
      || base.username || base.password) throw new Error("Expected bare HTTPS Worker origin.");
  const healthResponse = await transport(new URL("/health",base),{method:"GET"});
  if (!healthResponse.ok) throw new Error("Worker /health did not return HTTP 200.");
  const health = await healthResponse.json();
  if (health?.service!=="aumyra" || health?.ready!==true) throw new Error("Worker schema/secrets are not ready.");

  const api = "https://api.telegram.org/bot"+token+"/";
  async function call(method,payload={}) {
    const response = await transport(api+method,{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify(payload)
    });
    if (!response.ok) throw new Error("Telegram "+method+" returned HTTP "+response.status);
    const data = await response.json();
    if (!data?.ok) throw new Error("Telegram "+method+" was rejected.");
    return data.result;
  }
  const me = await call("getMe");
  if (String(me?.username || "").toLowerCase() !== "aumyrabot") throw new Error("Wrong bot token: not @AumyraBot.");
  const hook = await call("getWebhookInfo");
  if (hook?.url !== new URL("/telegram/webhook",base).toString()) throw new Error("Telegram webhook points to a different Worker.");
  const commands=await call("getMyCommands");
  for (const command of ["start","menu","chat","expense","income","summary","history","note","notes"]) {
    if (!(commands||[]).some(row=>row.command===command)) throw new Error("Telegram command menu missing "+command);
  }
  const menu=await call("getChatMenuButton");
  if (menu?.type!=="commands") throw new Error("Telegram chat menu is not configured.");

  // Bots cannot initiate conversations until their owner has started the chat.
  // A 403 here is not a reason to rotate a BotFather token or reset the webhook.
  let ownerNotification="not_delivered";
  try {
    await call("sendMessage",{
      chat_id:ownerId,
      text:"AUMYRA deployment is ready. Send /start to open Chat and finance controls. Use /status for bot information."
    });
    ownerNotification="delivered";
  } catch {
    ownerNotification="not_delivered";
  }
  return {
    service:"aumyra",ready:true,webhookMatches:true,commandMenuVerified:true,
    pendingUpdates:Number.isSafeInteger(hook?.pending_update_count)?hook.pending_update_count:null,
    ownerNotification
  };
}

if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    const result=await smoke({
      workerUrl:process.argv[2],
      token:process.env.TELEGRAM_BOT_TOKEN,
      ownerId:process.env.TELEGRAM_OWNER_ID
    });
    console.log("Aumyra smoke:",JSON.stringify(result));
    if (result.ownerNotification!=="delivered") {
      console.log("Telegram cannot yet send to owner. Open @AumyraBot on your phone and send /start.");
    }
  } catch (error) {
    console.error("Aumyra smoke failed: "+error.message);
    process.exitCode=1;
  }
}
