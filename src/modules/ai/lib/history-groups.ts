export type HistoryGroup = "today" | "yesterday" | "week" | "month" | "older";
const HISTORY_GROUPS: HistoryGroup[] = ["today", "yesterday", "week", "month", "older"];

/** Sohbetleri yerel takvim gününe göre gruplar (boş gruplar atlanır). */
export function groupConversations<T extends { updatedAt: string }>(items: T[], now = new Date()): Array<{ key: HistoryGroup; items: T[] }> {
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const today = startOfDay(now);
  const day = 86_400_000;
  const groupOf = (iso: string): HistoryGroup => {
    const at = startOfDay(new Date(iso));
    if (at >= today) return "today";
    if (at >= today - day) return "yesterday";
    if (at >= today - 7 * day) return "week";
    if (at >= today - 30 * day) return "month";
    return "older";
  };
  return HISTORY_GROUPS.map((key) => ({ key, items: items.filter((item) => groupOf(item.updatedAt) === key) })).filter((group) => group.items.length);
}
