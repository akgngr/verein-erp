"use client";
import { toast, Button, Spinner } from "@heroui/react";
import { actionVariant } from "@/shared/components/ui/action-appearance";

import { RotateCcw, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

import {
  cancelExecutionAction,
  retryExecutionAction,
} from "../actions/automation-actions";

type Props = { id: string; status: string };

/** İptal (bekleyen/çalışan) ve yeniden dene (başarısız/iptal) düğmeleri. */
export function ExecutionActions({ id, status }: Props) {
  const t = useTranslations("automation.monitor");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const cancellable = ["PENDING", "RUNNING", "WAITING"].includes(status);
  const retryable = status === "FAILED" || status === "CANCELLED";
  if (!cancellable && !retryable) return null;

  const run = (action: typeof cancelExecutionAction, success: string) =>
    startTransition(async () => {
      const response = await action({ id });
      if (!response.ok)
        return void toast(response.error, { variant: "danger" });
      toast(success, { variant: "success" });
      router.refresh();
    });

  return (
    <div className="mt-3 flex gap-2">
      {cancellable ? (
        <Button
          size="sm"
          onPress={() => run(cancelExecutionAction, t("cancelled"))}
          variant={actionVariant("danger", "flat")}
          isPending={pending}
        >
          {pending ? <Spinner size="sm" color="current" /> : null}
          {<XCircle className="h-4 w-4" />}
          {t("cancel")}
        </Button>
      ) : null}
      {retryable ? (
        <Button
          size="sm"
          onPress={() => run(retryExecutionAction, t("retried"))}
          variant={actionVariant("primary", "flat")}
          isPending={pending}
        >
          {pending ? <Spinner size="sm" color="current" /> : null}
          {<RotateCcw className="h-4 w-4" />}
          {t("retry")}
        </Button>
      ) : null}
    </div>
  );
}
