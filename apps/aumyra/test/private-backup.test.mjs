import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {validateBackup,encryptBackup,decryptBackup} from '../scripts/private-backup.mjs';
const sql=Buffer.from(readdirSync(new URL('../migrations/',import.meta.url)).sort().map(p=>readFileSync(new URL('../migrations/'+p,import.meta.url),'utf8')).join('\n'));
test('all six actual migrations restore and encrypt with authenticated round-trip',()=>{
  const key=randomBytes(32).toString('base64'),dump=Buffer.concat([sql,Buffer.from("\nINSERT INTO aumyra_notes(body,created_at,update_id) VALUES('private fixture: attach a note','2026-11-15',1);")]);
  assert.equal(validateBackup(dump).verified,true);
  const encrypted=encryptBackup(dump,key);
  assert.ok(!encrypted.includes(Buffer.from('private fixture')));
  assert.deepEqual(decryptBackup(encrypted,key),dump);
  encrypted[40]^=1;
  assert.throws(()=>decryptBackup(encrypted,key),/authentication/);
});
test('corrupt, unrelated, empty and filesystem-writing backups fail closed',()=>{
  for(const dump of ['', 'not a backup', 'SELECT 1;', 'CREATE TABLE unrelated(secret TEXT);', "ATTACH '/tmp/private' AS external;"]){
    assert.throws(()=>validateBackup(Buffer.from(dump)));
  }
});
test('missing or wrong encryption keys cannot leak a plaintext artifact',()=>{
  assert.throws(()=>encryptBackup(sql,''));
  const encrypted=encryptBackup(sql,randomBytes(32).toString('base64'));
  assert.throws(()=>decryptBackup(encrypted,randomBytes(32).toString('base64')),/authentication/);
});
