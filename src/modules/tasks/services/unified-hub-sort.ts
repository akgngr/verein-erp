import { berlinToday, formatDateOnly } from "../utils";

export type UnifiedTaskSource = "meetings" | "crm";

export interface UnifiedLinkedTaskItem {
  id: string;
  source: UnifiedTaskSource;
  title: string;
  contextLabel: string;
  assigneeLabel: string | null;
  dueDate: string | null;
  isOverdue: boolean;
  href: string;
}

/** Pure sorter: earliest due dates first, undated items last. */
export function sortUnifiedLinkedItems(
  items: readonly UnifiedLinkedTaskItem[],
): UnifiedLinkedTaskItem[] {
  return [...items].sort((a, b) => {
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return a.title.localeCompare(b.title);
  });
}

/**
 * CRM follow-ups carry a real deadline instant (unlike date-only meeting action items).
 * The hub shows its Europe/Berlin calendar day and, like the CRM list, treats it as overdue
 * once the instant has passed. The link opens the party in the CRM view (`?kayit=`).
 */
export function toCrmHubItem(
  row: { id: string; dueAt: string; note: string; partyId: string; partyName: string },
  now: Date = new Date(),
): UnifiedLinkedTaskItem {
  const due = new Date(row.dueAt);
  return {
    id: `crm:${row.id}`,
    source: "crm",
    title: row.note,
    contextLabel: row.partyName,
    assigneeLabel: null,
    dueDate: formatDateOnly(berlinToday(due)),
    isOverdue: due.getTime() < now.getTime(),
    href: `/crm?kayit=${encodeURIComponent(row.partyId)}`,
  };
}
