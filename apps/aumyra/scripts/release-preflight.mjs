import {pathToFileURL} from 'node:url';
const fail=message=>{throw new Error(message);};
export async function preflight(env,transport=fetch){
  for(const key of ['CLOUDFLARE_API_TOKEN','CLOUDFLARE_ACCOUNT_ID','AUMYRA_D1_DATABASE_ID','AUMYRA_WORKER_URL','TELEGRAM_BOT_TOKEN','TELEGRAM_WEBHOOK_SECRET','TELEGRAM_OWNER_ID','AUMYRA_BACKUP_KEY'])if(!env[key])fail('Missing private release setting: '+key);
  if(!/^[a-f0-9]{32}$/i.test(env.CLOUDFLARE_ACCOUNT_ID) || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(env.AUMYRA_D1_DATABASE_ID))fail('Invalid account/database identifier');
  if(!/^[0-9]+:[A-Za-z0-9_-]+$/.test(env.TELEGRAM_BOT_TOKEN) || !/^[A-Za-z0-9_-]{32,256}$/.test(env.TELEGRAM_WEBHOOK_SECRET)
    || !/^[1-9][0-9]{3,15}$/.test(env.TELEGRAM_OWNER_ID) || !Number.isSafeInteger(Number(env.TELEGRAM_OWNER_ID)))fail('Invalid Telegram configuration');
  if(!/^[A-Za-z0-9+/]{43}=$/.test(env.AUMYRA_BACKUP_KEY) || Buffer.from(env.AUMYRA_BACKUP_KEY,'base64').length!==32)fail('Invalid private backup key');
  async function call(url,headers,allowMissing=false){
    let r;try{r=await transport(url,{headers,redirect:'error',signal:AbortSignal.timeout(15000)});}catch{fail('Preflight network request failed; credentials redacted');}
    if(allowMissing && r.status===404)return null;
    if(!r.ok)fail('Preflight API refused request (HTTP '+r.status+')');
    return r.json();
  }
  const bot=await call('https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN+'/getMe',{});
  if(!bot.ok || String(bot.result?.username).toLowerCase()!=='aumyrabot')fail('Wrong Telegram bot; no cloud mutation permitted');
  const base='https://api.cloudflare.com/client/v4/accounts/'+env.CLOUDFLARE_ACCOUNT_ID;
  const headers={Authorization:'Bearer '+env.CLOUDFLARE_API_TOKEN};
  const db=await call(base+'/d1/database/'+env.AUMYRA_D1_DATABASE_ID,headers);
  if(!db.success || db.result?.name!=='aumyra' || db.result?.uuid!==env.AUMYRA_D1_DATABASE_ID)fail('Dedicated Aumyra D1 identity mismatch');
  const subdomain=await call(base+'/workers/subdomain',headers);
  if(!subdomain.success || !/^[a-z0-9-]+$/.test(subdomain.result?.subdomain||''))fail('Account workers.dev subdomain unavailable');
  if(env.AUMYRA_WORKER_URL!=='https://aumyra.'+subdomain.result.subdomain+'.workers.dev')fail('Worker URL does not match selected Cloudflare account');
  const settings=await call(base+'/workers/scripts/aumyra/settings',headers,true);
  if(settings && (!settings.success || !Array.isArray(settings.result?.bindings)
      || settings.result.bindings.some(b=>b.type==='d1' && b.id!==env.AUMYRA_D1_DATABASE_ID)))fail('Existing Worker has unexpected database bindings; inspect before deployment');
  return {verified:true,service:'aumyra'};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  try{console.log(JSON.stringify(await preflight(process.env)));}
  catch(error){console.error(error instanceof SyntaxError?'Invalid API response':error.message);process.exitCode=1;}
}
