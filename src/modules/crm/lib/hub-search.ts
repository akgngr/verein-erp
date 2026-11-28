/** Open follow-ups scanned when the task hub searches (party names resolve only after loading). */
export const HUB_SEARCH_SCAN = 500;

const fold = (value: string) => value.trim().toLocaleLowerCase("tr");

/**
 * Task-hub search over open CRM follow-ups: matches the note or the permission-resolved party
 * name, and applies the result limit only after matching, so later deadlines stay findable.
 */
export function matchHubFollowUps<T extends { note: string; partyName: string }>(
  rows: readonly T[],
  q: string | undefined,
  limit: number,
): T[] {
  const needle = fold(q ?? "");
  const matching = needle
    ? rows.filter((row) => fold(row.note).includes(needle) || fold(row.partyName).includes(needle))
    : rows;
  return matching.slice(0, limit);
}
