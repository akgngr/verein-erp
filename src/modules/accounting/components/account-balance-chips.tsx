"use client";

import { Chip } from "@heroui/react";

import type { AccountBalance } from "../types";

/** Hesap bakiyesi çipleri (§ 11.1): aktif hesapların güncel bakiyesi. */
export function AccountBalanceChips({ balances }: { balances: AccountBalance[] }) {
  const format = (cents: number) =>
    (cents / 100).toLocaleString("tr-TR", { style: "currency", currency: "EUR" });
  if (balances.length === 0) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {balances.map((balance) => (
        <Chip
          key={balance.id}
          size="sm"
          variant="bordered"
          color={balance.balanceCents < 0 ? "danger" : "default"}
        >
          {balance.name}: {format(balance.balanceCents)}
        </Chip>
      ))}
    </div>
  );
}
