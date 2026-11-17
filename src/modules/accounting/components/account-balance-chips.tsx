"use client";

import { StatusChip } from "@/shared/components/ui/status-chip";
import type { AccountBalance } from "../types";

export function AccountBalanceChips({
  balances,
}: {
  balances: AccountBalance[];
}) {
  const format = (cents: number) =>
    (cents / 100).toLocaleString("tr-TR", {
      style: "currency",
      currency: "EUR",
    });

  if (balances.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {balances.map((balance) => (
        <StatusChip
          key={balance.id}
          tone={balance.balanceCents < 0 ? "danger" : "default"}
          className="border border-current"
        >
          {balance.name}: {format(balance.balanceCents)}
        </StatusChip>
      ))}
    </div>
  );
}
