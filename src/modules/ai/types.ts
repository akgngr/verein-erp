/**
 * Asistanın onay kartı önerileri (sunucu araçları üretir, panel gösterir, kullanıcı onaylayınca
 * executeAiProposalAction uygular). Kişi adı içermez; başlıklar kaydın kendi başlığıdır.
 */
/** Asistanın oluşturduğu, kullanıcının indirebileceği dosya (yanıtın altında düğme olarak). */
export type AiFile = { title: string; url: string; format: "pdf" };

export type AiProposal = {
  kind: "module";
  module: string;
  action: string;
  operation: "read" | "create" | "update" | "delete";
  title: string;
  details: string[];
  payload: unknown;
};
