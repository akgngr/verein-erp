/** Panelde onay bekleyen öneri (sunucudan gelir; kullanıcı onaylamadan uygulanmaz). */
export type AiProposal = {
  kind: "createTask";
  title: string;
  description: string | null;
  priority: "LOW" | "NORMAL" | "HIGH";
  dueDate: string | null;
};
