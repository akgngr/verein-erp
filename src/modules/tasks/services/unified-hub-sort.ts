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
