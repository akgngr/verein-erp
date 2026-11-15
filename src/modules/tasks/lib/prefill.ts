/** Adres parametrelerinden güvenli ön doldurma (baslik, aciklama, bitis=YYYY-AA-GG). */
export function taskPrefillFromParams(raw: Record<string, string | string[] | undefined>) {
  const one = (key: string) => (typeof raw[key] === "string" ? (raw[key] as string).trim() : "");
  const dueDate = one("bitis");
  return {
    title: one("baslik").slice(0, 200) || undefined,
    description: one("aciklama").slice(0, 2000) || undefined,
    dueDate: /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? dueDate : undefined,
  };
}
