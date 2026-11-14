/** Bound the actual streamed body, not just a caller-controlled Content-Length header. */
export async function readAiRequestBody(request:Request):Promise<unknown> {
 if(!request.body)return null;
 const reader=request.body.getReader(),chunks:Uint8Array[]=[];
 let size=0;
 try{
  for(;;){const result=await reader.read();if(result.done)break;size+=result.value.byteLength;if(size>8192){await reader.cancel();return null;}chunks.push(result.value);}
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
 }catch{return null;}finally{reader.releaseLock();}
}
