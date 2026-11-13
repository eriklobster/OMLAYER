import test from "node:test";
import assert from "node:assert/strict";
import {smoke} from "../scripts/postdeploy-smoke.mjs";

const base="https://aumyra.example.workers.dev/";
const token="123456:FAKE_TEST_TOKEN";
const ownerId="1234567";
const commands=["start","menu","chat","expense","income","summary","history","note","notes"].map(command=>({command,description:"test"}));
function responder({ready=true,bot="AumyraBot",webhook=base+"telegram/webhook",menu="commands",sendOk=true,probeOk=true}={}) {
  const calls=[];
  const transport=async(url,opts={})=>{
    const href=String(url);
    const path=href.endsWith("/health")?"health":href.split("/").at(-1);
    calls.push({path,body:opts.body?JSON.parse(opts.body):null,headers:opts.headers||null});
    if (path==="webhook")return new Response(probeOk?"delivered":"Retry later",{status:probeOk?200:503});
    if (path==="health")return Response.json({service:"aumyra",ready},{status:ready?200:503});
    if (path==="sendMessage"&&!sendOk)return Response.json({ok:false,description:"Forbidden"},{status:403});
    const responses={
      getMe:{username:bot},
      getWebhookInfo:{url:webhook,pending_update_count:2},
      getMyCommands:commands,
      getChatMenuButton:{type:menu},
      sendMessage:{message_id:1}
    };
    if (!Object.hasOwn(responses,path))throw Error("Unexpected API call");
    return Response.json({ok:true,result:responses[path]});
  };
  return {transport,calls};
}
test("production smoke verifies health and Telegram and sends a safe owner welcome",async()=>{
  const a=responder();
  const result=await smoke({workerUrl:base,token,ownerId,transport:a.transport});
  assert.deepEqual(result,{
    service:"aumyra",ready:true,webhookMatches:true,commandMenuVerified:true,
    pendingUpdates:2,ownerNotification:"delivered",webhookProbe:"not_run"
  });
  assert.deepEqual(a.calls.map(c=>c.path),["health","getMe","getWebhookInfo","getMyCommands","getChatMenuButton","sendMessage"]);
  assert.equal(a.calls.at(-1).body.chat_id,ownerId);
  assert.doesNotMatch(JSON.stringify(result),/FAKE_TEST_TOKEN/);
});
test("production smoke refuses an unready Worker or wrong bot before sending anything",async()=>{
  const a=responder({ready:false});
  await assert.rejects(smoke({workerUrl:base,token,ownerId,transport:a.transport}),/HTTP 200/);
  assert.deepEqual(a.calls.map(c=>c.path),["health"]);
  const b=responder({bot:"RoamDotsBot"});
  await assert.rejects(smoke({workerUrl:base,token,ownerId,transport:b.transport}),/Wrong bot/);
  assert.deepEqual(b.calls.map(c=>c.path),["health","getMe"]);
});
test("production smoke refuses wrong webhook or missing chat commands",async()=>{
  const a=responder({webhook:"https://wrong.workers.dev/telegram/webhook"});
  await assert.rejects(smoke({workerUrl:base,token,ownerId,transport:a.transport}),/different Worker/);
  assert.ok(!a.calls.some(c=>c.path==="sendMessage"));
  const b=responder({menu:"default"});
  await assert.rejects(smoke({workerUrl:base,token,ownerId,transport:b.transport}),/chat menu/);
  assert.ok(!b.calls.some(c=>c.path==="sendMessage"));
});
test("bot cannot yet initiate owner chat: smoke stays ready but reports notification failure",async()=>{
  const a=responder({sendOk:false});
  const result=await smoke({workerUrl:base,token,ownerId,webhookSecret:"abc_123",transport:a.transport});
  assert.equal(result.ownerNotification,"not_delivered");
  assert.equal(result.webhookProbe,"not_run");
  assert.ok(!a.calls.some(c=>c.path==="webhook"));
  assert.equal(result.ready,true);
});
test("malformed Worker URL, token or owner ID never reaches network",async()=>{
  const a=responder();
  await assert.rejects(smoke({workerUrl:"http://example.com/",token,ownerId,transport:a.transport}),/bare HTTPS/);
  await assert.rejects(smoke({workerUrl:base+"path",token,ownerId,transport:a.transport}),/bare HTTPS/);
  await assert.rejects(smoke({workerUrl:base,token:"bad",ownerId,transport:a.transport}),/BotFather token/);
  await assert.rejects(smoke({workerUrl:base,token,ownerId:"invalid",transport:a.transport}),/Telegram owner ID/);
  assert.equal(a.calls.length,0);
});

test("authenticated deploy smoke triggers a safe /start and observes Worker-to-Telegram success",async()=>{
  const a=responder();
  const r=await smoke({workerUrl:base,token,ownerId,webhookSecret:"secret_123",transport:a.transport});
  assert.equal(r.webhookProbe,"accepted");
  assert.equal(r.ownerNotification,"delivered");
  assert.deepEqual(a.calls.map(c=>c.path),[
    "health","getMe","getWebhookInfo","getMyCommands","getChatMenuButton","sendMessage","webhook"
  ]);
  const probe=a.calls.at(-1);
  assert.equal(probe.headers["X-Telegram-Bot-Api-Secret-Token"],"secret_123");
  assert.equal(probe.body.message.text,"/start");
  assert.equal(probe.body.message.chat.id,Number(ownerId));
  assert.equal(probe.body.message.from.id,Number(ownerId));
  assert.ok(probe.body.update_id<0);
  assert.ok(Number.isSafeInteger(probe.body.update_id));
  assert.doesNotMatch(JSON.stringify(r),/secret_123|FAKE_TEST_TOKEN/);
});
test("failed synthetic webhook response blocks claim of working bidirectional Telegram",async()=>{
  const a=responder({probeOk:false});
  await assert.rejects(smoke({workerUrl:base,token,ownerId,webhookSecret:"valid_secret",transport:a.transport}),/did not complete Telegram/);
  assert.equal(a.calls.at(-1).path,"webhook");
});
test("invalid webhook secret or unsafe owner ID rejects before network",async()=>{
  const a=responder();
  await assert.rejects(smoke({workerUrl:base,token,ownerId,webhookSecret:"secret with spaces",transport:a.transport}),/Invalid webhook secret/);
  await assert.rejects(smoke({workerUrl:base,token,ownerId:"9999999999999999999",transport:a.transport}),/numeric Telegram owner ID/);
  assert.equal(a.calls.length,0);
});
