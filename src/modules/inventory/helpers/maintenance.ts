export type InspectionStatus = "none" | "overdue" | "due_soon" | "ok";

export function classifyInspectionStatus(
  nextInspectionAt: Date | null,
  today: Date = new Date(),
  soonDays = 30,
): InspectionStatus {
  if (!nextInspectionAt) return "none";
  const targetUtc = Date.UTC(
    nextInspectionAt.getUTCFullYear(),
    nextInspectionAt.getUTCMonth(),
    nextInspectionAt.getUTCDate(),
  );
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const diffDays = Math.floor((targetUtc - todayUtc) / 86_400_000);
  if (diffDays < 0) return "overdue";
  if (diffDays <= soonDays) return "due_soon";
  return "ok";
}

export function computeNextDueDate(
  performedAt: Date,
  intervalMonths: number | null | undefined,
): Date | null {
  if (!intervalMonths || intervalMonths <= 0) return null;
  const d = new Date(
    Date.UTC(
      performedAt.getUTCFullYear(),
      performedAt.getUTCMonth() + intervalMonths,
      performedAt.getUTCDate(),
    ),
  );
  return d;
}
