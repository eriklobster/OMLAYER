import test from 'node:test';
import assert from 'node:assert/strict';
import {respondToText} from '../src/worker.mjs';

test('/allocate makes a read-only owner-configured preview',async()=>{
  const env={TELEGRAM_OWNER_ID:'123',BANK_ALLOCATION_JSON:JSON.stringify({Living:50,Rent:25,Donations:25})};
  const res=await respondToText('/allocate 0.01 USDT',env);
  assert.match(res.text,/Allocation preview/);
  assert.match(res.text,/Living: 0\.01 USDT \(50%\)/);
  assert.match(res.text,/Rent: 0\.00 USDT \(25%\)/);
  assert.match(res.text,/Donations: 0\.00 USDT \(25%\)/);
  assert.match(res.text,/No transfers or ledger changes/);
});

test('/allocate refuses missing or invalid private plans',async()=>{
  const unconfigured=await respondToText('/allocate 10 USD',{TELEGRAM_OWNER_ID:'123'});
  assert.match(unconfigured.text,/not configured/);
  const invalid=await respondToText('/allocate 10 USD',{TELEGRAM_OWNER_ID:'123',BANK_ALLOCATION_JSON:'{"A":60,"B":30}'});
  assert.match(invalid.text,/invalid/);
  const format=await respondToText('/allocate -10 USD',{TELEGRAM_OWNER_ID:'123',BANK_ALLOCATION_JSON:'{"A":100}'});
  assert.match(format.text,/Format: \/allocate/);
});

test('/allocate is side-effect free and never needs a database',async()=>{
  const env={TELEGRAM_OWNER_ID:'123',BANK_ALLOCATION_JSON:JSON.stringify({Living:100})};
  const response=await respondToText('/allocate 80.83 THB',env);
  assert.match(response.text,/Living: 80\.83 THB/);
  assert.doesNotMatch(response.text,/Saved|Transferred/);
});
