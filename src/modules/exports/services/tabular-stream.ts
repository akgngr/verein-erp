import "server-only";
import {createHash,randomUUID} from "node:crypto";
import {createWriteStream} from "node:fs";
import {mkdir,open,rename,unlink} from "node:fs/promises";
import path from "node:path";
import {PassThrough,Readable,Transform} from "node:stream";
import {pipeline} from "node:stream/promises";
import {setImmediate} from "node:timers/promises";
import ExcelJS from "exceljs";
import {createByteSealer,sealSecret} from "@/shared/security/secret-box";
import {getDb} from "@/shared/db";
import {resolveSafePath} from "@/shared/files/storage";
import {safeCsvCell} from "../formats/csv";

export const TABULAR_LIMITS=Object.freeze({rows:100000,columns:20,cellBytes:32767,inputBytes:64*1024*1024,outputBytes:64*1024*1024});
export type TabularRow=(string|number)[];
export type TabularRows =
 | AsyncIterable<TabularRow>
 | Iterable<TabularRow>;
/** Format encoder is independent of DB/storage; rows are consumed once, with abort and input bounds. */
export function renderTabularStream(args:{format:"csv"|"xlsx";headers:string[];rows:TabularRows;signal:AbortSignal}){
 if(!args.headers.length||args.headers.length>TABULAR_LIMITS.columns)throw new Error("EXPORT_COLUMN_LIMIT");
 let inputBytes=0,count=0;
 const validate=(row:TabularRow)=>{
  if(row.length!==args.headers.length)throw new Error("EXPORT_COLUMN_LIMIT");
  for(const cell of row){
   if(typeof cell!=="string"&&(typeof cell!=="number"||!Number.isFinite(cell)))throw new Error("EXPORT_CELL_INVALID");
   const bytes=Buffer.byteLength(String(cell));if(bytes>TABULAR_LIMITS.cellBytes)throw new Error("EXPORT_CELL_LIMIT");inputBytes+=bytes;
  }
  if(inputBytes>TABULAR_LIMITS.inputBytes)throw new Error("EXPORT_BYTE_LIMIT");
 };
 validate(args.headers);
 async function* checked(){
  for await(const row of args.rows){args.signal.throwIfAborted();if(++count>TABULAR_LIMITS.rows)throw new Error("EXPORT_ROW_LIMIT");validate(row);yield row;}
 }
 if(args.format==="csv")return Readable.from((async function*(){
  args.signal.throwIfAborted();yield Buffer.from('\ufeff'+args.headers.map(safeCsvCell).join(';'));
  for await(const row of checked())yield Buffer.from('\r\n'+row.map(v=>safeCsvCell(String(v))).join(';'));
 })(),{objectMode:false,highWaterMark:65536});
 const output=new PassThrough({highWaterMark:65536});
 // The producer may fail while the caller opens storage; pipeline still observes this error.
 output.on("error",()=>{});
 // ExcelJS releases committed rows; shared strings/styles are disabled to avoid retained dictionaries.
 // Input bytes are also capped, since the ZIP library may buffer compressed worksheet chunks.
 const workbook=new ExcelJS.stream.xlsx.WorkbookWriter({stream:output,useSharedStrings:false,useStyles:false});
 const stop=()=>output.destroy(args.signal.reason instanceof Error?args.signal.reason:new Error("EXPORT_ABORTED"));
 args.signal.addEventListener("abort",stop,{once:true});
 void (async()=>{
  try{
   args.signal.throwIfAborted();
   const sheet=workbook.addWorksheet("Report",{views:[{state:"frozen",ySplit:1}]});
   sheet.columns=args.headers.map(()=>({width:25}));sheet.addRow(args.headers).commit();
   for await(const row of checked()){
    if(output.destroyed)throw new Error("EXPORT_ABORTED");
    sheet.addRow(row).commit();
    if(count%50===0)await setImmediate(undefined,{signal:args.signal});
   }
   sheet.commit();await workbook.commit();
  }catch(error){output.destroy(error instanceof Error?error:new Error("EXPORT_RENDER_FAILED"));}
  finally{args.signal.removeEventListener("abort",stop);}
 })();
 return output;
}

/** Encrypt directly to a private ciphertext temp file. No plaintext file or whole-file render buffer. */
export async function writeEncryptedTabular(args:{destination:string;format:"csv"|"xlsx";headers:string[];rows:TabularRows;signal:AbortSignal;beforeCommit?:()=>Promise<void>}){
 args.signal.throwIfAborted();
 const {cipher,header}=createByteSealer("generated-file");
 const source=renderTabularStream(args);
 source.on("error",()=>{});
 const hash=createHash("sha256");let sizeBytes=0;
 const counter=new Transform({transform(chunk:Buffer,_encoding,done){
  sizeBytes+=chunk.length;
  if(sizeBytes>TABULAR_LIMITS.outputBytes){done(new Error("EXPORT_BYTE_LIMIT"));return;}
  hash.update(chunk);done(null,chunk);
 }});
 const temporary=`${args.destination}.${randomUUID()}.tmp`;
 try{
  await mkdir(path.dirname(args.destination),{recursive:true});
  const handle=await open(temporary,"wx",0o600);
  try{await handle.write(header,0,header.length,0);}finally{await handle.close();}
  await pipeline(source,counter,cipher,createWriteStream(temporary,{flags:"r+",start:header.length,highWaterMark:65536}),{signal:args.signal});
  args.signal.throwIfAborted();await args.beforeCommit?.();args.signal.throwIfAborted();
  const finalHandle=await open(temporary,"r+");
  try{const tag=cipher.getAuthTag();await finalHandle.write(tag,0,tag.length,header.length-16);await finalHandle.sync();}finally{await finalHandle.close();}
  await rename(temporary,args.destination);
  return {sizeBytes,sha256:hash.digest("hex")};
 }catch(error){source.destroy();cipher.destroy();counter.destroy();await unlink(temporary).catch(()=>{});throw error;}
}

export async function createStreamingTabularFile(args:{id:string;generationId:string;ownerId:string;format:"csv"|"xlsx";headers:string[];rows:TabularRows;source:string;signal:AbortSignal;beforeCommit?:()=>Promise<void>}){
 const existing=await getDb().generatedFile.findUnique({where:{id:args.id}});
 if(existing)throw new Error("FILE_GENERATION_BYTES_UNAVAILABLE");
 const destination=resolveSafePath(`generated/${args.id}.bin`);
 const metadata=await writeEncryptedTabular({...args,destination});
 try{
  await getDb().generatedFile.create({data:{id:args.id,ownerId:args.ownerId,titleEnc:sealSecret("generated-file","Aidat / Beiträge"),format:args.format,...metadata,source:args.source,generationId:args.generationId,publicationPending:true,expiresAt:new Date(Date.now()+30*86_400_000)}});
 }catch(error){await unlink(destination).catch(()=>{});throw error;}
 return args.id;
}
