/** Cloud models receive canonical intents, never arbitrary user text or restored chat history. */
export function canonicalCloudIntent(message:string,year:number):string|null {
 const text=message.trim().normalize("NFKC").toLocaleLowerCase("tr");
 const match=/^(üye sayısı|üye istatistikleri|member statistics|mitgliederstatistik|bağış özeti|donation statistics|spendenübersicht|aidat dosyası|dues export|beitragsdatei)(?:\s+(20\d{2}))?[?.!]?$/.exec(text);
 if(!match)return null;
 const requestedYear=match[2]?Number(match[2]):year;
 if(requestedYear<2000||requestedYear>2100)return null;
 if(["üye sayısı","üye istatistikleri","member statistics","mitgliederstatistik"].includes(match[1]))return `Use get_member_statistics for year ${requestedYear}.`;
 if(["bağış özeti","donation statistics","spendenübersicht"].includes(match[1]))return `Use get_donation_statistics for year ${requestedYear}.`;
 return `Create an overdue dues dataset for year ${requestedYear}, then propose an XLSX export with columns member.fullName and dues.overdueAmount. Do not request or return personal identities.`;
}
export function cloudToolAllowed(name:string):boolean {
 return ["get_member_statistics","get_donation_statistics","create_dues_dataset","query_dataset","propose_dataset_export"].includes(name);
}
