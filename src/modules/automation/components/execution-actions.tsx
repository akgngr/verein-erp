"use client";

import { addToast, Button } from "@heroui/react";
import { RotateCcw, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { cancelExecutionAction, retryExecutionAction } from "../actions/automation-actions";

type Props = { id: string; status: string };

/** İptal (bekleyen/çalışan) ve yeniden dene (başarısız/iptal) düğmeleri. */
export function ExecutionActions({ id, status }: Props) {
  const t = useTranslations("automation.monitor");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const cancellable = ["PENDING", "RUNNING", "WAITING"].includes(status);
  const retryable = status === "FAILED" || status === "CANCELLED";
  if (!cancellable && !retryable) return null;

  const run = (action: typeof cancelExecutionAction, success: string) => startTransition(async () => {
    const response = await action({ id });
    if (!response.ok) return void addToast({ title: response.error, color: "danger" });
    addToast({ title: success, color: "success" });
    router.refresh();
  });

  return (
    <div className="mt-3 flex gap-2">
      {cancellable ? (
        <Button size="sm" variant="flat" color="danger" isLoading={pending} startContent={<XCircle className="h-4 w-4" />}
          onPress={() => run(cancelExecutionAction, t("cancelled"))}>
          {t("cancel")}
        </Button>
      ) : null}
      {retryable ? (
        <Button size="sm" variant="flat" color="primary" isLoading={pending} startContent={<RotateCcw className="h-4 w-4" />}
          onPress={() => run(retryExecutionAction, t("retried"))}>
          {t("retry")}
        </Button>
      ) : null}
    </div>
  );
}
