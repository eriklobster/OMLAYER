import test from "node:test";
import assert from "node:assert/strict";
import {respondToText} from "../src/worker.mjs";

test("/today reports only new THB/USDT entries for today's Thailand date",async()=>{
  const expected=new Date(Date.now()+7*3600000).toISOString().slice(0,10);
  let observed=null;
  const db={prepare(sql){
    assert.match(sql,/voided_at IS NULL/);
    assert.match(sql,/substr\(datetime\(created_at,'\+7 hours'\),1,10\)=\?/);
    assert.match(sql,/GROUP BY kind,currency/);
    return {bind(day){observed=day;return {all:async()=>({results:[
      {kind:"expense",currency:"THB",cents:7500,n:3},
      {kind:"income",currency:"USDT",cents:2000,n:1}
    ]})}}};
  }};
  const result=await respondToText("/today",{DB:db,TELEGRAM_OWNER_ID:"123"});
  assert.equal(observed,expected);
  assert.match(result.text,/expense: 75\.00 THB \(3\)/);
  assert.match(result.text,/income: 20\.00 USDT \(1\)/);
  assert.match(result.text,/Historical archive and available-to-spend bank balances are not included/);
});
test("/today has a factual empty state; it does not invent spendable balances",async()=>{
  const db={prepare(){return {bind(){return {all:async()=>({results:[]})}}}}};
  const r=await respondToText("Today",{DB:db,TELEGRAM_OWNER_ID:"123"});
  assert.match(r.text,/No entries recorded today/);
});
