"use client";

import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, addToast } from "@heroui/react";
import { ChevronDown, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { DocumentStatus } from "@prisma/client";

import { STATUS_LABELS } from "../constants";
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
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const change = async (status: DocumentStatus) => {
    setBusy(true);
    const result = await changeStatusAction({ id: documentId, status });
    setBusy(false);
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    addToast({ title: `Durum güncellendi: ${STATUS_LABELS[status]}`, color: "success" });
    router.refresh();
  };

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          size="sm"
          variant="bordered"
          isDisabled={busy}
          startContent={<RefreshCw className="h-4 w-4" aria-hidden />}
          endContent={<ChevronDown className="h-4 w-4" aria-hidden />}
        >
          Durum değiştir
        </Button>
      </DropdownTrigger>
      <DropdownMenu aria-label="Durum değiştir" disabledKeys={[current]}>
        {(Object.keys(STATUS_LABELS) as DocumentStatus[]).map((status) => (
          <DropdownItem
            key={status}
            description={status === current ? "Mevcut durum" : undefined}
            onPress={() => void change(status)}
          >
            {STATUS_LABELS[status]}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
}
