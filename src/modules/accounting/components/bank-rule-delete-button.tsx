"use client";
import { toast, Button } from "@heroui/react";
import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { deleteBankRuleAction } from "../actions/bank-actions";

export function BankRuleDeleteButton({
  id,
  label,
  icon,
}: {
  id: string;
  label: string;
  icon: ReactNode;
}) {
  const router = useRouter();
  return (
    <Button
      size="sm"
      isIconOnly
      aria-label={label}
      onPress={async () => {
        const result = await deleteBankRuleAction({ id });
        if (!result.ok) return toast(result.error, { variant: "danger" });
        router.refresh();
      }}
      variant={actionVariant("danger", "light")}
    >
      {icon}
    </Button>
  );
}
