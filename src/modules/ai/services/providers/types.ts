/**
 * Sağlayıcıdan bağımsız sohbet arayüzü. Maskeleme, araçlar, izinler ve rıza bu katmanın
 * ÜSTÜNDE çalışır; bağlayıcı yalnızca kendi API biçimiyle araç döngüsünü yürütür.
 * Bağlayıcıya giden her metin zaten maskelenmiştir; araç sonuçları da executeTool içinde maskelenir.
 */
export type NeutralTool = { name: string; description: string; inputSchema: Record<string, unknown> };
export type NeutralTurn = { role: "user" | "assistant"; content: string };

export type ProviderRunArgs = {
  model: string;
  system: string;
  turns: NeutralTurn[];
  tools: NeutralTool[];
  maxToolRounds: number;
  /** Aracı çalıştırır ve modele gidecek (maskelenmiş) JSON metnini döndürür. */
  executeTool: (name: string, input: unknown) => Promise<{ content: string; isError: boolean }>;
};

export type ProviderRunResult = { text: string; refused: boolean; inputTokens: number; outputTokens: number };

export type ProviderAdapter = { run: (args: ProviderRunArgs) => Promise<ProviderRunResult> };

/** Sağlayıcı kaynaklı hata (anahtar yok/geçersiz, hız sınırı, erişilemiyor); ayrıntı istemciye sızmaz. */
export class ProviderError extends Error {
  constructor(public readonly kind: "auth" | "rateLimit" | "unavailable") {
    super(kind);
  }
}
