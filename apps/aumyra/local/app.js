let csrf='';
const el=id=>document.getElementById(id),notice=message=>{el('notice').textContent=message;};
async function api(path,payload){
  const r=await fetch(path,{method:payload===undefined?'GET':'POST',headers:payload===undefined?{}:{'Content-Type':'application/json','X-Aumyra-CSRF':csrf},...(payload===undefined?{}:{body:JSON.stringify(payload)})});
  const data=await r.json();if(!r.ok)throw new Error(data.error||'Request failed');return data;
}
async function refresh(){
  const s=await api('/api/state');csrf=s.csrf;el('login').hidden=true;el('workspace').hidden=false;
  for(const kind of ['notes','tasks']){
    el(kind).replaceChildren();for(const row of s[kind]){const item=document.createElement('li');item.textContent=row.body+(kind==='tasks'&&row.event_id?(row.delivered_at?' · public summary synced':' · public summary queued'):'');el(kind).append(item);}
  }
  el('sync-status').textContent=s.pending+' public event(s) queued. '+(s.githubConfigured?'GitHub credentials configured; internet may be unavailable.':'GitHub connection is not configured.');
  el('sync').disabled=!s.githubConfigured||!s.pending;
}
el('login-form').onsubmit=async e=>{e.preventDefault();try{const r=await api('/api/login',{token:el('token').value});el('token').value='';csrf=r.csrf;sessionStorage.removeItem('aum-locked');await refresh();notice('Unlocked.');}catch(error){el('token').value='';notice(error.message);}};
el('note-form').onsubmit=async e=>{e.preventDefault();try{await api('/api/notes',{text:el('note').value});el('note').value='';await refresh();notice('Private note saved locally.');}catch(error){notice(error.message);}};
el('publish').onchange=()=>{el('public-fields').hidden=!el('publish').checked;el('public-summary').required=el('publish').checked;};
el('task-form').onsubmit=async e=>{e.preventDefault();try{const publishPublic=el('publish').checked;await api('/api/tasks',{text:el('task').value,publishPublic,...(publishPublic?{publicSummary:el('public-summary').value}:{})});e.target.reset();el('public-fields').hidden=true;el('public-summary').required=false;await refresh();notice('Task saved locally.');}catch(error){notice(error.message);}};
el('sync').onclick=async()=>{el('sync').disabled=true;try{await api('/api/sync',{});await refresh();notice('Public event synchronized.');}catch(error){notice(error.message);el('sync').disabled=false;}};
el('logout').onclick=async()=>{sessionStorage.setItem('aum-locked','1');let ended=false;try{await api('/api/logout',{});ended=true;}catch{}finally{csrf='';el('workspace').hidden=true;el('login').hidden=false;el('notes').replaceChildren();el('tasks').replaceChildren();el('note').value='';el('task').value='';el('public-summary').value='';notice(ended?'Locked.':'Screen locked. Reconnect to end the server session.');}};
if(sessionStorage.getItem('aum-locked')!=='1')refresh().catch(()=>{});
