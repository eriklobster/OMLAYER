import test from 'node:test';
import assert from 'node:assert/strict';
import {requireCoreDelivery} from '../scripts/postdeploy-smoke.mjs';
test('manual release cannot pass from health alone or an unexecuted synthetic probe',()=>{
  assert.throws(()=>requireCoreDelivery({ready:true,ownerNotification:'not_delivered',webhookProbe:'not_run'}),/readiness alone/);
  assert.throws(()=>requireCoreDelivery({ready:true,ownerNotification:'delivered',webhookProbe:'not_run'}),/signed/);
  assert.doesNotThrow(()=>requireCoreDelivery({ready:true,ownerNotification:'delivered',webhookProbe:'accepted',widgetProbe:'failed'}));
});
