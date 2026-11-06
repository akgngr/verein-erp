/**
 * Column layout for overlapping timed items in a day column (like Google
 * Calendar): items that overlap share the width; each gets a column index
 * and the column count of its overlap cluster.
 */
export type Timed = { id: string; start: Date; end: Date };
export type Placed = { id: string; column: number; columns: number };

export function layoutDay(items: Timed[]): Map<string, Placed> {
  const sorted = [...items].sort((a, b) => a.start.getTime() - b.start.getTime() || b.end.getTime() - a.end.getTime());
  const result = new Map<string, Placed>();
  let cluster: { item: Timed; column: number }[] = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    const columns = Math.max(1, ...cluster.map((entry) => entry.column + 1));
    for (const entry of cluster) result.set(entry.item.id, { id: entry.item.id, column: entry.column, columns });
    cluster = [];
  };
  for (const item of sorted) {
    if (item.start.getTime() >= clusterEnd) flush();
    const taken = new Set(cluster.filter((entry) => entry.item.end > item.start).map((entry) => entry.column));
    let column = 0;
    while (taken.has(column)) column += 1;
    cluster.push({ item, column });
    clusterEnd = Math.max(clusterEnd, item.end.getTime());
  }
  flush();
  return result;
}
