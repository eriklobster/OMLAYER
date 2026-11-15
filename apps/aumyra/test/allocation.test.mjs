import test from 'node:test';
import assert from 'node:assert/strict';
import {parseAllocationPlan, previewAllocation, parseAmountCents} from '../src/allocation.mjs';

test('validates private plan without inferring or assuming percentages', () => {
  assert.deepEqual(parseAllocationPlan('{"Living":70,"Rent":20,"Donations":10}').map(x=>x.basisPoints),[7000,2000,1000]);
  for(const malformed of ['bad', '{}', '[]', '{"Living":50}', '{"Rent":-1,"Other":101}', '{"Rent":"50","Other":50}', '{"<script>":100}', '{"A":99.999,"B":0.001}']) {
    assert.throws(()=>parseAllocationPlan(malformed), undefined, malformed);
  }
});

test('rounding uses largest remainder and conserves every cent', () => {
  const rows=previewAllocation(1,{Living:50,Rent:25,Donations:25});
  assert.deepEqual(rows.map(r=>r.cents),[1,0,0]);
  assert.equal(rows.reduce((sum,r)=>sum+r.cents,0),1);
  const mixed=previewAllocation(8083,{Living:50,Rent:10,Donations:10,Immediate:10,Tower:10,Scooter:10});
  assert.equal(mixed.reduce((sum,r)=>sum+r.cents,0),8083);
  assert.equal(mixed.find(x=>x.name==='Donations').cents,808);
  assert.equal(mixed.find(x=>x.name==='Rent').cents,809);
  assert.equal(mixed.find(x=>x.name==='Living').cents,4042);
});

test('allocations are deterministic and never transfer or store funds', () => {
  const plan={Living:33.33,Rent:33.33,Donations:33.34};
  assert.deepEqual(previewAllocation(101,plan),previewAllocation(101,plan));
  assert.equal(previewAllocation(101,plan).reduce((a,b)=>a+b.cents,0),101);
  assert.equal(previewAllocation(12345,{Living:100})[0].cents,12345);
});

test('parses currency quantities exactly to integer cents', () => {
  assert.equal(parseAmountCents('80.83'),8083);
  assert.equal(parseAmountCents('0.01'),1);
  assert.equal(parseAmountCents('2000'),200000);
  for (const bad of ['0','0.00','-1','1.234','1e3','Infinity','1,000','1000000001']) {
    assert.throws(()=>parseAmountCents(bad),undefined,bad);
  }
});
