"use client";

import { addToast, Button } from "@heroui/react";
import { Database, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";

import { clearDemoDataAction, seedDemoDataAction } from "../actions/demo-actions";

/** Yükle / sil butonları (onay penceresiyle). */
export function DemoControls({ hasData }: { hasData: boolean }) {
  const t = useTranslations("demo");
  const router = useRouter();
  const [confirm, setConfirm] = useState<"seed" | "clear" | null>(null);

  const seed = async () => {
    const response = await seedDemoDataAction({});
    if (!response.ok) return void addToast({ title: response.error, color: "danger" });
    addToast({ title: t("seeded", { count: response.data.total }), color: "success" });
    router.refresh();
  };
  const clear = async () => {
    const response = await clearDemoDataAction({});
    if (!response.ok) return void addToast({ title: response.error, color: "danger" });
    addToast({
      title: response.data.remaining > 0 ? t("clearedPartial", { removed: response.data.removed, remaining: response.data.remaining }) : t("cleared", { count: response.data.removed }),
      color: response.data.remaining > 0 ? "warning" : "success",
    });
    router.refresh();
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button color="primary" startContent={<Database size={16} />} isDisabled={hasData} onPress={() => setConfirm("seed")}>
        {t("seed")}
      </Button>
      <Button color="danger" variant="flat" startContent={<Trash2 size={16} />} isDisabled={!hasData} onPress={() => setConfirm("clear")}>
        {t("clear")}
      </Button>
      <ConfirmDialog
        isOpen={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm === "clear" ? t("confirmClearTitle") : t("confirmSeedTitle")}
        message={confirm === "clear" ? t("confirmClear") : t("confirmSeed")}
        confirmColor={confirm === "clear" ? "danger" : "primary"}
        onConfirm={confirm === "clear" ? clear : seed}
      />
    </div>
  );
}
