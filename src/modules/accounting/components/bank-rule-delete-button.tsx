"use client";
import { ActionButton } from "@/shared/components/ui/action-button";
import { notify } from "@/shared/components/ui/notify";

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
    <ActionButton
      isIconOnly
      ariaLabel={label}
      color="danger"
      variant="light"
      onPress={async () => {
        const result = await deleteBankRuleAction({ id });
        if (!result.ok) return void notify(result.error, "danger");
        router.refresh();
      }}
    >
      {icon}
    </ActionButton>
  );
}
