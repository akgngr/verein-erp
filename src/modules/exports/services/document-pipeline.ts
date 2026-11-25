import "server-only";
import {createHash} from "node:crypto";
import {getDb} from "@/shared/db";
import {removeFile, saveFile} from "@/shared/files";
import {sealBytes, sealSecret} from "@/shared/security/secret-box";
import {FILES_RETENTION_DAYS} from "../constants";

/** Belge (PDF) üretimi sınırları: Markdown girdisi ve çıktı boyutu. */
export const DOCUMENT_LIMITS=Object.freeze({markdownBytes:256*1024,titleChars:200,outputBytes:16*1024*1024});
const PDF_MAGIC=Buffer.from("%PDF-");

export type PipelineDocumentArgs={
 id:string;generationId:string;ownerId:string;title:string;markdown:string;source:string;signal:AbortSignal;
 /** Altbilgi şablonu "{page}" ve "{total}" içerir (alt işleme JSON ile gider). */
 strings:{createdAt:string;note:string;footerTemplate:string};
 /** Antet: getOrganizationProfile() + logo (LetterheadProfile alanları). */
 letterhead:()=>Promise<{name:string}&Record<string,unknown>>;
 beforeCommit?:()=>Promise<void>;
 /** Testler için render enjeksiyonu; varsayılan antetli PDF biçimi. */
 render?:(input:{title:string;markdown:string;createdAt:Date})=>Promise<Buffer>;
};

/**
 * S5.1 (#315): Files üretim hattında (FileGeneration + Automation) PDF belge. Çıktı doğrulanır (PDF imzası, boyut),
 * şifreli saklanır ve `publicationPending` olarak kaydedilir; yayın `finalizeGeneration` ile aynı işlemde olur.
 * Doğrudan indirme bağlantısı üretilmez.
 */
export async function createPipelineDocumentFile(args:PipelineDocumentArgs):Promise<string>{
 args.signal.throwIfAborted();
 const title=args.title.replace(/[\r\n\t]+/g," ").trim().slice(0,DOCUMENT_LIMITS.titleChars);
 if(!title)throw new Error("EXPORT_TITLE_INVALID");
 if(Buffer.byteLength(args.markdown)>DOCUMENT_LIMITS.markdownBytes)throw new Error("EXPORT_BYTE_LIMIT");
 if(await getDb().generatedFile.findUnique({where:{id:args.id},select:{id:true}}))throw new Error("FILE_GENERATION_BYTES_UNAVAILABLE");
 const createdAt=new Date();
 const bytes=args.render
  ?await args.render({title,markdown:args.markdown,createdAt})
  :await renderMarkdownInChild({organization:await args.letterhead(),title,markdown:args.markdown,createdAt:createdAt.toISOString(),strings:args.strings},args.signal);
 args.signal.throwIfAborted();
 if(bytes.length>DOCUMENT_LIMITS.outputBytes)throw new Error("EXPORT_BYTE_LIMIT");
 if(bytes.length<PDF_MAGIC.length||!bytes.subarray(0,PDF_MAGIC.length).equals(PDF_MAGIC))throw new Error("EXPORT_OUTPUT_INVALID");
 const storage=`generated/${args.id}.bin`;
 await saveFile(storage,sealBytes("generated-file",bytes));
 try{
  await args.beforeCommit?.();args.signal.throwIfAborted();
  await getDb().generatedFile.create({data:{id:args.id,ownerId:args.ownerId,titleEnc:sealSecret("generated-file",title),format:"pdf",sizeBytes:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex"),source:args.source,generationId:args.generationId,publicationPending:true,createdAt,expiresAt:new Date(createdAt.getTime()+FILES_RETENTION_DAYS*86_400_000)}});
 }catch(error){await removeFile(storage).catch(()=>undefined);throw error;}
 return args.id;
}

const CHILD_RENDER_ENV_ALLOWLIST = ["PATH", "NODE_ENV", "TZ", "HOME", "LANG", "LC_ALL"] as const;

/** Alt PDF işleme yalnız temel çalışma değişkenlerini aktarır; veritabanı/anahtar sırları asla geçirilmez. */
export function buildChildRenderEnv(source: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
 const env: Record<string, string | undefined> = {};
 for (const key of CHILD_RENDER_ENV_ALLOWLIST) {
  if (source[key] !== undefined) env[key] = source[key];
 }
 return env as NodeJS.ProcessEnv;
}

/**
 * Worker react-server koşuluyla çalışır; @react-pdf tam React ister. Belge alt işlemde (koşulsuz node) çizilir:
 * alt işlem yalnız stdin girdisini alır ve PDF'i stdout'a yazar; veritabanına, sırlara ve ağa erişmez.
 */
async function renderMarkdownInChild(input:Record<string,unknown>,signal:AbortSignal):Promise<Buffer>{
 const {spawn}=await import("node:child_process");
 const path=await import("node:path");
 const script=path.resolve(process.cwd(),"src/modules/exports/pdf/render-markdown-cli.mjs");
 const env=buildChildRenderEnv(process.env);
 return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[script],{cwd:process.cwd(),env,stdio:["pipe","pipe","pipe"]});
  const out:Buffer[]=[];let size=0;
  const kill=()=>child.kill("SIGKILL");
  const timer=setTimeout(kill,90_000);signal.addEventListener("abort",kill,{once:true});
  child.stdout.on("data",(chunk:Buffer)=>{size+=chunk.length;if(size>DOCUMENT_LIMITS.outputBytes){kill();return;}out.push(chunk);});
  // Alt işlem hata çıktısı günlüğe yazılmaz (girdi içeriği sızmasın); yalnız kod.
  child.stderr.on("data",()=>{});
  child.on("error",reject);
  child.on("close",code=>{
   clearTimeout(timer);signal.removeEventListener("abort",kill);
   if(signal.aborted){reject(new Error("EXPORT_ABORTED"));return;}
   if(code===0)resolve(Buffer.concat(out));else reject(new Error("EXPORT_RENDER_FAILED"));
  });
  child.stdin.end(JSON.stringify(input));
 });
}
