import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,readFile,readdir,rm} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import ExcelJS from "exceljs";
import {writeEncryptedTabular,TABULAR_LIMITS} from "@/modules/exports/services/tabular-stream";
import {openBytes} from "@/shared/security/secret-box";
process.env.AUTH_SECRET??="test-streaming-key";

test("streaming CSV/XLSX encrypt 6001 rows, preserve typed cells and keyring rotation",async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),"tabular-stream-"));
 const keys=process.env.DATA_ENCRYPTION_KEYS,current=process.env.DATA_ENCRYPTION_CURRENT_KEY;
 try{
  process.env.DATA_ENCRYPTION_KEYS=JSON.stringify({first:"a".repeat(32),second:"b".repeat(32)});process.env.DATA_ENCRYPTION_CURRENT_KEY="first";
  for(const format of ["csv","xlsx"] as const){
   let consumed=0,verified=false;
   const destination=path.join(dir,`${format}.bin`);
   async function* rows(){for(let i=0;i<6001;i++){consumed++;yield [i===0?"=PRIVATE_SENTINEL":"PRIVATE_SENTINEL",i,120.25];}}
   const metadata=await writeEncryptedTabular({destination,format,headers:["Name","Index","Amount"],rows:rows(),signal:AbortSignal.timeout(20000),beforeCommit:async()=>{
    assert.equal(consumed,6001);assert.deepEqual((await readdir(dir)).filter(n=>n.startsWith(`${format}.bin`)).map(n=>n.endsWith(".tmp")),[true]);
    const tmp=(await readdir(dir)).find(n=>n.startsWith(`${format}.bin`))!;
    const ciphertext=await readFile(path.join(dir,tmp));assert.ok(!ciphertext.includes(Buffer.from("PRIVATE_SENTINEL")));verified=true;
   }});
   assert.ok(verified);const encrypted=await readFile(destination);assert.ok(!encrypted.includes(Buffer.from("PRIVATE_SENTINEL")));
   process.env.DATA_ENCRYPTION_CURRENT_KEY="second";
   const plain=openBytes("generated-file",encrypted)!;assert.ok(plain);assert.equal(metadata.sizeBytes,plain.length);assert.equal(metadata.sha256,createHash("sha256").update(plain).digest("hex"));
   const tampered=Buffer.from(encrypted);tampered[tampered.length-1]^=1;assert.equal(openBytes("generated-file",tampered),null);
   if(format==="csv"){assert.ok(plain.toString().startsWith("\ufeffName;Index;Amount\r\n'=PRIVATE_SENTINEL;0;120.25"));assert.equal(plain.toString().split("\r\n").length,6002);}
   else{const book=new ExcelJS.Workbook();await book.xlsx.load(plain as never);const sheet=book.worksheets[0];assert.equal(sheet.rowCount,6002);assert.equal(sheet.getCell("A2").value,"=PRIVATE_SENTINEL");assert.equal(sheet.getCell("C2").value,120.25);assert.equal(sheet.getCell("A2").type,ExcelJS.ValueType.String);}
  }
  assert.deepEqual((await readdir(dir)).sort(),["csv.bin","xlsx.bin"]);
 }finally{if(keys===undefined)delete process.env.DATA_ENCRYPTION_KEYS;else process.env.DATA_ENCRYPTION_KEYS=keys;if(current===undefined)delete process.env.DATA_ENCRYPTION_CURRENT_KEY;else process.env.DATA_ENCRYPTION_CURRENT_KEY=current;await rm(dir,{recursive:true,force:true});}
});

test("abort, stale snapshot and cell/row limits remove temporary ciphertext without publishing",async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),"tabular-fail-"));
 try{
  for(const format of ["csv","xlsx"] as const){
   const run=(rows:AsyncIterable<(string|number)[]>,signal=AbortSignal.timeout(10000),beforeCommit?:()=>Promise<void>)=>writeEncryptedTabular({destination:path.join(dir,"result.bin"),format,headers:["Name"],rows,signal,beforeCommit});
   const controller=new AbortController();
   await assert.rejects(run((async function*(){yield ["secret"];controller.abort();yield ["later"];})(),controller.signal),/abort/i);
   assert.deepEqual(await readdir(dir),[]);
   await assert.rejects(run((async function*(){yield ["x".repeat(TABULAR_LIMITS.cellBytes+1)];})()),/EXPORT_CELL_LIMIT/);
   assert.deepEqual(await readdir(dir),[]);
   await assert.rejects(run((async function*(){yield ["valid"];})(),undefined,async()=>{throw new Error("AI_DATASET_STALE_PREVIEW");}),/AI_DATASET_STALE_PREVIEW/);
   assert.deepEqual(await readdir(dir),[]);
  }
  await assert.rejects(writeEncryptedTabular({destination:path.join(dir,"too-many.bin"),format:"csv",headers:["N"],rows:(async function*(){for(let i=0;i<=TABULAR_LIMITS.rows;i++)yield [i];})(),signal:AbortSignal.timeout(20000)}),/EXPORT_ROW_LIMIT/);
  assert.deepEqual(await readdir(dir),[]);
  // Quoting expands the rendered CSV beyond the byte limit before the smaller raw input cap.
  await assert.rejects(writeEncryptedTabular({destination:path.join(dir,"too-large.bin"),format:"csv",headers:["N"],rows:(async function*(){for(let i=0;i<1100;i++)yield ['"'.repeat(32767)];})(),signal:AbortSignal.timeout(20000)}),/EXPORT_BYTE_LIMIT/);
  assert.deepEqual(await readdir(dir),[]);
 }finally{await rm(dir,{recursive:true,force:true});}
});
