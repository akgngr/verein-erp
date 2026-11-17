"use client";

import { notify } from "@/shared/components/ui/notify";import { Button } from "@heroui/react";
import { Description, Dropdown, Label } from "@/shared/components/kit";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useTranslations } from "next-intl";

import { ChevronDown, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { DocumentStatus } from "@prisma/client";

import { STATUS_VALUES } from "../constants";
import { changeStatusAction } from "../actions/change-status";

/**
 * Durum değiştirme menüsü (8.3): herhangi bir durumdan herhangi birine serbest
 * geçiş (5. bölüm md. 2); seçim anında action çağırır.
 */
export function StatusChangeMenu({
  documentId,
  current,
}: {
  documentId: string;
  current: DocumentStatus;
}) {
  const t = useTranslations("documents.statusChange");
  const tStatus = useTranslations("documents.status");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const change = async (status: DocumentStatus) => {
    setBusy(true);
    const result = await changeStatusAction({ id: documentId, status });
    setBusy(false);
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    notify.success(t("updatedToast", { status: tStatus(status) }));
    router.refresh();
  };

  return (
    <Dropdown>
      <Button
        size="sm"
        isDisabled={busy}
        variant={actionVariant("default", "bordered")}
      >
        {<RefreshCw className="h-4 w-4" aria-hidden />}
        {t("button")}
        {<ChevronDown className="h-4 w-4" aria-hidden />}
      </Button>

      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu aria-label={t("button")} disabledKeys={[current]}>
          {STATUS_VALUES.map((status) => (
            <Dropdown.Item
              key={status}
              id={status}
              textValue={String(tStatus(status))}
              onAction={() => void change(status)}
            >
              <Label>{tStatus(status)}</Label>
              <Description>
                {status === current ? t("current") : undefined}
              </Description>
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
