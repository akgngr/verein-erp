"use client";

import { addToast, Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { deleteBankRuleAction } from "../actions/bank-actions";

export function BankRuleDeleteButton({ id, label, icon }: { id: string; label: string; icon: ReactNode }) {
  const router = useRouter();
  return (
    <Button
      size="sm"
      variant="light"
      color="danger"
      isIconOnly
      aria-label={label}
      onPress={async () => {
        const result = await deleteBankRuleAction({ id });
        if (!result.ok) return addToast({ title: result.error, color: "danger" });
        router.refresh();
      }}
    >
      {icon}
    </Button>
  );
}
