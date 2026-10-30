/** Panelde onay bekleyen öneri (sunucudan gelir; kullanıcı onaylamadan uygulanmaz). */
export type AiProposal =
  | { kind: "createTask"; title: string; description: string | null; priority: "LOW" | "NORMAL" | "HIGH"; dueDate: string | null }
  | { kind: "completeTask"; taskId: string; title: string }
  | { kind: "deleteTask"; taskId: string; title: string }
  | {
      kind: "createEvent";
      title: string;
      description: string | null;
      type: "WORKSHOP" | "SEMINAR" | "SOCIAL" | "CULTURAL" | "SPORTS" | "OTHER";
      startDate: string;
      endDate: string | null;
      location: string | null;
      isOnline: boolean;
    };
