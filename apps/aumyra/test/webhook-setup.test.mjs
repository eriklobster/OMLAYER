import test from "node:test";
import assert from "node:assert/strict";
import {COMMANDS,configureWebhook} from "../scripts/setup-webhook.mjs";

const URL="https://aumyra.example.workers.dev/telegram/webhook";
const TOKEN="123456:TEST_bot-token";
const SECRET="test-secret_Aumyra";
function fakeTransport({username="AumyraBot",url=URL,commands=COMMANDS,menu={type:"commands"}}={}) {
  const calls=[];
  const transport=async(_url,request)=>{
    const method=_url.split("/").at(-1);
    const body=JSON.parse(request.body);
    calls.push({method,body});
    const results={
      getMe:{username},
      setWebhook:true,setMyCommands:true,setChatMenuButton:true,
      getWebhookInfo:{url},getMyCommands:commands,getChatMenuButton:menu
    };
    if (!Object.hasOwn(results,method)) throw Error("Unexpected Telegram API method: "+method);
    return Response.json({ok:true,result:results[method]});
  };
  return {transport,calls};
}
test("Aumyra verifies BotFather identity first and configures menu without dropping messages",async()=>{
  const {transport,calls}=fakeTransport();
  const result=await configureWebhook({webhookUrl:URL,token:TOKEN,secret:SECRET,transport});
  assert.equal(result.bot,"@AumyraBot");
  assert.equal(result.commandCount,COMMANDS.length);
  assert.equal(result.webhook,URL);
  assert.deepEqual(calls.map(x=>x.method),[
    "getMe","setWebhook","setMyCommands","setChatMenuButton",
    "getWebhookInfo","getMyCommands","getChatMenuButton"
  ]);
  assert.equal(calls[1].body.drop_pending_updates,false);
  assert.deepEqual(calls[1].body.allowed_updates,["message"]);
  assert.equal(calls[1].body.secret_token,SECRET);
  assert.equal(calls[3].body.menu_button.type,"commands");
  assert.ok(COMMANDS.some(c=>c.command==="chat"));
  assert.ok(COMMANDS.some(c=>c.command==="cancel"));
  assert.ok(!JSON.stringify(result).includes(TOKEN));
  assert.ok(!JSON.stringify(result).includes(SECRET));
});
test("wrong BotFather token identity cannot overwrite another bot's webhook",async()=>{
  const {transport,calls}=fakeTransport({username:"RoamDotsBot"});
  await assert.rejects(configureWebhook({webhookUrl:URL,token:TOKEN,secret:SECRET,transport}),/another bot/);
  assert.deepEqual(calls.map(x=>x.method),["getMe"]);
});
test("insecure URL or invalid secret rejects before any Telegram API mutation",async()=>{
  const {transport,calls}=fakeTransport();
  await assert.rejects(configureWebhook({webhookUrl:"http://wrong/telegram/webhook",token:TOKEN,secret:SECRET,transport}),/clean HTTPS/);
  await assert.rejects(configureWebhook({webhookUrl:URL+"?token=abc",token:TOKEN,secret:SECRET,transport}),/clean HTTPS/);
  await assert.rejects(configureWebhook({webhookUrl:URL,token:TOKEN,secret:"spaces are bad",transport}),/Webhook secret/);
  await assert.rejects(configureWebhook({webhookUrl:URL,token:"wrong",secret:SECRET,transport}),/token format/);
  assert.equal(calls.length,0);
});
test("setup catches absent commands or wrong menu type after registration",async()=>{
  const a=fakeTransport({commands:[{command:"start"}]});
  await assert.rejects(configureWebhook({webhookUrl:URL,token:TOKEN,secret:SECRET,transport:a.transport}),/missing expected commands/);
  const b=fakeTransport({menu:{type:"web_app"}});
  await assert.rejects(configureWebhook({webhookUrl:URL,token:TOKEN,secret:SECRET,transport:b.transport}),/not configured for commands/);
});
