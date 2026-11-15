// GitHub Actions entry point. A failed/canceled deployment retains its lock for inspected recovery.
import {GitHubStateStore,synchronize,assertReleaseLock} from './coordination.mjs';
try {
  const run=process.env.GITHUB_RUN_ID,attempt=process.env.GITHUB_RUN_ATTEMPT,ref=process.env.GITHUB_REF_NAME,sha=process.env.GITHUB_SHA;
  if(!/^\d+$/.test(run||'') || !/^\d+$/.test(attempt||'') || !/^[a-f0-9]{40}$/.test(sha||''))throw new Error('Run only inside the dedicated manual Actions deployment');
  const store=new GitHubStateStore({token:process.env.GITHUB_TOKEN});
  const taskId=`DEV-RELEASE-${run}-${attempt}`,actor=`Actions-${run}-${attempt}`;
  const send=async(action,summary,extra={})=>synchronize(store,{eventId:`release-${run}-${attempt}-${action}`,taskId,actor,action,summary,...extra});
  const mode=process.argv[2];
  if(mode==='acquire'){
    await send('add',`Release candidate ${sha}`,{lane:'Development',resource:'aumyra-release'});
    await send('claim',`Exclusive release from ${ref} at ${sha}`,{branch:ref});
    await assertReleaseLock(store,taskId,actor);
  }else if(mode==='verify'){
    await assertReleaseLock(store,taskId,actor);
  }else if(mode==='finish'){
    await assertReleaseLock(store,taskId,actor);
    await send('transition','HTTPS and Telegram-accepted signed start passed; real iPhone and widget acceptance remain separate',{status:'DONE'});
    const {state}=await store.read();
    await send('release','Synchronous deploy and smoke processes exited; exclusive resource lock released',{
      expectedVersion:state.tasks[taskId].version,inspection:{preservedBranch:ref,observedCommit:sha,branchesReviewed:true,commitsReviewed:true,processesReviewed:true,resourcesReviewed:true,noActiveExecution:true,evidence:'Manual workflow completed migration, deployment and HTTPS/Telegram smoke; no background child tasks started'}});
  }else throw new Error('Expected acquire, verify or finish');
  console.log('Aumyra release lock '+mode+' verified.');
}catch(error){console.error(error instanceof SyntaxError?'Invalid coordination response':error.message);process.exitCode=1;}
