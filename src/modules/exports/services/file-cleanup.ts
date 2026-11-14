import "server-only";
import { unlink,opendir,stat } from "node:fs/promises";
import { getDb } from "@/shared/db";
import { resolveSafePath } from "@/shared/files/storage";

export async function deleteStoredFile(id:string,ownerId?:string) {
  try{await unlink(resolveSafePath(`generated/${id}.bin`));}
  catch(error){if(!(error && typeof error==="object" && "code" in error && error.code==="ENOENT"))throw new Error("FILE_DELETE_RETRY");}
  await getDb().generatedFile.deleteMany({where:{id,ownerId,deletionPending:true}});
}
export async function purgeExpiredFiles():Promise<number> {
 const db=getDb(),rows=await db.generatedFile.findMany({where:{OR:[{expiresAt:{lte:new Date()}},{deletionPending:true}]},select:{id:true},take:100});
 await db.generatedFile.updateMany({where:{id:{in:rows.map(row=>row.id)}},data:{deletionPending:true}});
 let removed=0;
 for(const row of rows){try{await deleteStoredFile(row.id);removed++;}catch{console.error("[exports] FILE_DELETE_RETRY");}}
 return removed;
}
/** Only aged, unknown objects are removed; active render temporary files are left alone. */
export async function reconcileGeneratedStorage(now=new Date()):Promise<number> {
 const directory=await opendir(resolveSafePath("generated")).catch(()=>null);if(!directory)return 0;
 let count=0,visited=0;
 for await(const entry of directory){
  if(++visited>1000)break;
  if(!entry.isFile()||!/^[-a-zA-Z0-9.]+\.(bin|tmp)$/.test(entry.name))continue;
  const file=resolveSafePath(`generated/${entry.name}`),metadata=await stat(file).catch(()=>null);
  if(!metadata||now.getTime()-metadata.mtimeMs<86_400_000)continue;
  const id=entry.name.endsWith(".bin")?entry.name.slice(0,-4):null;
  if(id&&await getDb().generatedFile.findUnique({where:{id},select:{id:true}}))continue;
  await unlink(file);count++;
 }
 return count;
}
