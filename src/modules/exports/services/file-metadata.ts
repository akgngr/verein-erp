import "server-only";
import {getDb} from "@/shared/db";

/** Shared visibility gate for download, file list and generation status. */
export function getPublishedFileMetadata(ownerId:string,id:string){
 return getDb().generatedFile.findFirst({where:{id,ownerId,deletionPending:false,publicationPending:false,expiresAt:{gt:new Date()}}});
}
export function listPublishedFileMetadata(ownerId:string){
 return getDb().generatedFile.findMany({where:{ownerId,deletionPending:false,publicationPending:false,expiresAt:{gt:new Date()}},orderBy:[{createdAt:"desc"},{id:"asc"}],take:200});
}
