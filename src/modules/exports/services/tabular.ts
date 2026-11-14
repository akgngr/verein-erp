import "server-only";
import { mkdir,writeFile,rename } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import { getDb } from "@/shared/db";
import { resolveSafePath } from "@/shared/files/storage";
import { sealBytes,sealSecret } from "@/shared/security/secret-box";
import { safeCsvCell } from "../formats/csv";

/** Worker-safe typed renderer; no request/i18n/Markdown reconstruction. */
export async function createTabularFile(args:{id:string;ownerId:string;format:"csv"|"xlsx";headers:string[];rows:(string|number)[][];source:string}) {
 if(args.rows.length>5000||args.headers.length>20)throw new Error("EXPORT_ROW_LIMIT");
 const existing=await getDb().generatedFile.findFirst({where:{id:args.id,ownerId:args.ownerId,deletionPending:false}});
 if(existing)return existing.id;
 let bytes:Buffer;
 if(args.format==="csv")bytes=Buffer.from('\ufeff'+[args.headers,...args.rows].map(row=>row.map(v=>safeCsvCell(String(v))).join(';')).join('\r\n'));
 else{const workbook=new ExcelJS.Workbook();const sheet=workbook.addWorksheet("Report");sheet.addRow(args.headers);for(const row of args.rows)sheet.addRow(row);sheet.views=[{state:"frozen",ySplit:1}];for(const column of sheet.columns)column.width=25;bytes=Buffer.from(await workbook.xlsx.writeBuffer());}
 if(bytes.length>10*1024*1024)throw new Error("EXPORT_BYTE_LIMIT");
 const destination=resolveSafePath(`generated/${args.id}.bin`),temporary=`${destination}.${crypto.randomUUID()}.tmp`;
 await mkdir(path.dirname(destination),{recursive:true});await writeFile(temporary,sealBytes("generated-file",bytes));await rename(temporary,destination);
 await getDb().generatedFile.upsert({where:{id:args.id},create:{id:args.id,ownerId:args.ownerId,titleEnc:sealSecret("generated-file","Aidat / Beiträge"),format:args.format,sizeBytes:bytes.length,source:args.source,expiresAt:new Date(Date.now()+30*86_400_000)},update:{}});
 return args.id;
}
