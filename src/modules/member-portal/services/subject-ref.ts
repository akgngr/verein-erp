/**
 * #580: Portal öznesi tek biçimdedir: "member:<id>" veya "guardian:<id>". Önceden giriş bağlantısı öneksiz
 * üye kimliği (`member.id`) saklıyor, servisler ise önek bekliyordu; gerçek her oturumda rıza, düzeltme,
 * makbuz, Art. 15, etkinlik ve imza işlemleri başarısız oluyordu.
 *
 * Geriye dönük: önceki sürümün oluşturduğu öneksiz değerler (aktif oturumlar) üye olarak okunur.
 */
export type SubjectKind = "member" | "guardian";
export type ParsedSubjectRef = { kind: SubjectKind; id: string };

export function memberSubjectRef(memberId: string): string {
  return `member:${memberId}`;
}

export function parseSubjectRef(ref: string | null | undefined): ParsedSubjectRef | null {
  if (!ref) return null;
  const idx = ref.indexOf(":");
  if (idx < 0) return /^[A-Za-z0-9_-]{8,64}$/.test(ref) ? { kind: "member", id: ref } : null;
  const kind = ref.slice(0, idx);
  const id = ref.slice(idx + 1);
  if ((kind !== "member" && kind !== "guardian") || !id) return null;
  return { kind, id };
}

/** Saklanan/karşılaştırılan biçim her zaman öneklidir. */
export function normalizeSubjectRef(ref: string): string | null {
  const parsed = parseSubjectRef(ref);
  return parsed ? `${parsed.kind}:${parsed.id}` : null;
}
