import test from 'node:test';
import assert from 'node:assert/strict';
import {preflight} from '../scripts/release-preflight.mjs';
const env={CLOUDFLARE_API_TOKEN:'private-test',CLOUDFLARE_ACCOUNT_ID:'a'.repeat(32),AUMYRA_D1_DATABASE_ID:'11111111-1111-1111-1111-111111111111',AUMYRA_WORKER_URL:'https://aumyra.fixture.workers.dev',TELEGRAM_BOT_TOKEN:'1234:fixture',TELEGRAM_WEBHOOK_SECRET:'a'.repeat(32),TELEGRAM_OWNER_ID:'1234',AUMYRA_BACKUP_KEY:Buffer.alloc(32,1).toString('base64')};
function transport({bot='AumyraBot',name='aumyra',subdomain='fixture',db=env.AUMYRA_D1_DATABASE_ID}={}){return async url=>Response.json(String(url).endsWith('/getMe')?{ok:true,result:{username:bot}}:String(url).endsWith('/settings')?{success:true,result:{bindings:[{type:'d1',name:'DB',id:db}]}}:String(url).includes('/d1/')?{success:true,result:{name,uuid:env.AUMYRA_D1_DATABASE_ID}}:{success:true,result:{subdomain}});}
test('release preflight verifies dedicated database, exact bot and account-derived URL without writes',async()=>{
  assert.equal((await preflight(env,transport())).verified,true);
  await assert.rejects(preflight(env,transport({bot:'AnotherBot'})),/Wrong Telegram/);
  await assert.rejects(preflight(env,transport({name:'roamdots'})),/identity mismatch/);
  await assert.rejects(preflight(env,transport({subdomain:'other-account'})),/does not match/);
  await assert.rejects(preflight(env,transport({db:'unrelated'})),/unexpected database/);
});
test('release preflight refuses missing settings and hides transport credentials',async()=>{
  await assert.rejects(preflight({...env,AUMYRA_BACKUP_KEY:''},transport()),/Missing private/);
  await assert.rejects(preflight(env,async()=>{throw new Error('token='+env.TELEGRAM_BOT_TOKEN);}),e=>!e.message.includes(env.TELEGRAM_BOT_TOKEN));
});
