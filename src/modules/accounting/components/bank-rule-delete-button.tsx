"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { ActionButton } from "@/shared/components/ui/action-button";
import { notify } from "@/shared/components/ui/notify";

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
      color="danger"
      variant="light"
      isIconOnly
      ariaLabel={label}
      onPress={async () => {
        const result = await deleteBankRuleAction({ id });
        if (!result.ok) {
          notify(result.error, "danger");
          return;
        }
        router.refresh();
      }}
    >
      {icon}
    </ActionButton>
  );
}
