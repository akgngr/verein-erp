export const AI_EXPORT_RETRY_POLICY=Object.freeze({maxAttempts:3,initialDelaySeconds:5,maxDelaySeconds:30,backoffMultiplier:2});
const permanentCodes=new Set(["AI_PERSONAL_EXPORT_DISABLED","AI_EXPORT_NOT_FOUND","AI_EXPORT_CANCELLED","AI_EXPORT_ACCESS_REVOKED","AI_EXPORT_EXECUTION_MISMATCH","AI_DATASET_UNAVAILABLE","AI_DATASET_UNREADABLE","AI_DATASET_STALE_PREVIEW","AI_DATASET_COLUMN_DENIED","AI_DATASET_ROW_LIMIT","EXPORT_ROW_LIMIT","EXPORT_BYTE_LIMIT","FILE_GENERATION_LEASE_REQUIRED","FILE_GENERATION_UNAVAILABLE","FILE_GENERATION_EXPIRED","FILE_GENERATION_INVALID_ATTEMPT","FILE_GENERATION_BYTES_UNAVAILABLE"]);
export function permanentExportFailure(error:unknown):boolean{
 return error instanceof Error&&(permanentCodes.has(error.message)||error.name==="ZodError"||error.name==="SyntaxError");
}
