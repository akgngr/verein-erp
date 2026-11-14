import test from "node:test";
import assert from "node:assert/strict";
import { sealSecret,openSecret,sealBytes,openBytes } from "@/shared/security/secret-box";
test("versioned keyring reads old ciphertext after auth rotation and writes with current key",()=>{
 const before={...process.env};
 try{
  process.env.AUTH_SECRET="legacy-root-secret-used-only-in-tests";
  delete process.env.DATA_ENCRYPTION_KEYS;
  const legacy=sealSecret("test","legacy");
  const legacyBytes=sealBytes("test",Buffer.from("legacy"));
  process.env.DATA_ENCRYPTION_LEGACY_SECRET=process.env.AUTH_SECRET;
  process.env.AUTH_SECRET="rotated-auth-secret-is-independent";
  process.env.DATA_ENCRYPTION_KEYS=JSON.stringify({one:"data-secret-one-long-enough-for-unit-test",two:"data-secret-two-long-enough-for-unit-test"});
  process.env.DATA_ENCRYPTION_CURRENT_KEY="one";
  const current=sealSecret("test","private");const currentBytes=sealBytes("test",Buffer.from("private"));
  assert.ok(current.startsWith("v2:one:"));
  process.env.DATA_ENCRYPTION_CURRENT_KEY="two";
  assert.equal(openSecret("test",legacy),"legacy");
  assert.equal(openBytes("test",legacyBytes)?.toString(),"legacy");
  assert.equal(openSecret("test",current),"private");
  assert.equal(openBytes("test",currentBytes)?.toString(),"private");
  assert.equal(openSecret("other",current),null);
  process.env.DATA_ENCRYPTION_KEYS=JSON.stringify({two:"data-secret-two-long-enough-for-unit-test"});
  assert.equal(openSecret("test",current),null);
 }finally{for(const key of Object.keys(process.env))if(!(key in before))delete process.env[key];Object.assign(process.env,before);}
});
