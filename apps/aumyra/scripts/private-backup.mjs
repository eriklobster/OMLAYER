// Validate a D1 export by restoring it locally, then encrypt before leaving the runner.
import {DatabaseSync} from 'node:sqlite';
import {createCipheriv,createDecipheriv,createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {readFile,writeFile,chmod} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const MAGIC=Buffer.from('AUMYRA01');
const fail=message=>{throw new Error(message);};
export function validateBackup(bytes) {
  if (!bytes?.length || bytes.length>50_000_000) fail('Backup is empty or exceeds 50 MB; refusing migration');
  const sql=Buffer.from(bytes).toString('utf8');
  // This is a D1 SQL dump, never a general SQL program. Do not permit filesystem access.
  const commands=sql.replace(/'(?:''|[^'])*'|--[^\n]*|\/\*[\s\S]*?\*\//g,' ');
  if (/\b(?:ATTACH|DETACH|VACUUM|load_extension|writefile|readfile)\b/i.test(commands)) fail('Unsupported SQL in backup; review privately');
  const db=new DatabaseSync(':memory:');
  try {
    db.exec('PRAGMA trusted_schema=OFF;');
    db.exec(sql);
    const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(t=>t.name);
    if (tables.some(t=>!t.startsWith('aumyra_') && !['d1_migrations','_cf_KV','_cf_METADATA'].includes(t))) fail('Backup includes unrelated tables; refusing migration');
    if (!tables.length) fail('Backup contains no schema; inspect empty database explicitly');
    if (db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok') fail('Backup integrity failed');
    if (db.prepare('PRAGMA foreign_key_check').all().length) fail('Backup foreign-key validation failed');
    return {verified:true,sha256:createHash('sha256').update(bytes).digest('hex')};
  } catch { fail('Backup restore verification failed; no data or SQL printed'); }
  finally {db.close();}
}
function decodeKey(value) {
  if (!/^[A-Za-z0-9+/]{43}=$/.test(value||'')) fail('AUMYRA_BACKUP_KEY must be a private base64-encoded 32-byte key');
  const key=Buffer.from(value,'base64');
  if (key.length!==32 || key.toString('base64')!==value) fail('Invalid backup key');
  return key;
}
export function encryptBackup(bytes,keyText) {
  validateBackup(bytes);
  const key=decodeKey(keyText),nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,nonce);
  cipher.setAAD(MAGIC);
  const encrypted=Buffer.concat([cipher.update(bytes),cipher.final()]);
  return Buffer.concat([MAGIC,nonce,cipher.getAuthTag(),encrypted]);
}
export function decryptBackup(bytes,keyText) {
  if (bytes.length<37 || !bytes.subarray(0,8).equals(MAGIC)) fail('Invalid encrypted backup');
  try {
    const decipher=createDecipheriv('aes-256-gcm',decodeKey(keyText),bytes.subarray(8,20));
    decipher.setAAD(MAGIC);decipher.setAuthTag(bytes.subarray(20,36));
    return Buffer.concat([decipher.update(bytes.subarray(36)),decipher.final()]);
  } catch { fail('Backup authentication failed'); }
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const [operation,input,output]=process.argv.slice(2);
    if (!input || !output || !['encrypt','decrypt'].includes(operation) || input===output) fail('Usage: private-backup.mjs encrypt|decrypt INPUT OUTPUT');
    const source=await readFile(input),key=process.env.AUMYRA_BACKUP_KEY;
    let result;
    if(operation==='encrypt'){
      result=encryptBackup(source,key);
      const recovered=decryptBackup(result,key);
      if(source.length!==recovered.length || !timingSafeEqual(source,recovered)) fail('Backup round-trip failed');
    }else{result=decryptBackup(source,key);validateBackup(result);}
    await writeFile(output,result,{flag:'wx',mode:0o600});
    await chmod(output,0o600);
    console.log('Private backup restore and encryption round-trip verified.');
  }catch{console.error('Private backup operation failed. Refusing migration; inspect inputs privately.');process.exitCode=1;}
}
