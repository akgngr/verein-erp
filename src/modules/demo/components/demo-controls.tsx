"use client";
import { statusTone } from "@/shared/components/ui/status-appearance";
import { toast, Button } from "@heroui/react";
import { actionVariant } from "@/shared/components/ui/action-appearance";

import { Database, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";

import {
  clearDemoDataAction,
  seedDemoDataAction,
} from "../actions/demo-actions";

/** Yükle / sil butonları (onay penceresiyle). */
export function DemoControls({ hasData }: { hasData: boolean }) {
  const t = useTranslations("demo");
  const router = useRouter();
  const [confirm, setConfirm] = useState<"seed" | "clear" | null>(null);

  const seed = async () => {
    const response = await seedDemoDataAction({});
    if (!response.ok) return void toast(response.error, { variant: "danger" });
    toast(t("seeded", { count: response.data.total }), { variant: "success" });
    router.refresh();
  };
  const clear = async () => {
    const response = await clearDemoDataAction({});
    if (!response.ok) return void toast(response.error, { variant: "danger" });
    toast(
      response.data.remaining > 0
        ? t("clearedPartial", {
            removed: response.data.removed,
            remaining: response.data.remaining,
          })
        : t("cleared", { count: response.data.removed }),
      {
        variant: statusTone(
          response.data.remaining > 0 ? "warning" : "success",
        ),
      },
    );
    router.refresh();
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        isDisabled={hasData}
        onPress={() => setConfirm("seed")}
        variant={actionVariant("primary", "solid")}
      >
        {<Database size={16} />}
        {t("seed")}
      </Button>
      <Button
        isDisabled={!hasData}
        onPress={() => setConfirm("clear")}
        variant={actionVariant("danger", "flat")}
      >
        {<Trash2 size={16} />}
        {t("clear")}
      </Button>
      <ConfirmDialog
        isOpen={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={
          confirm === "clear" ? t("confirmClearTitle") : t("confirmSeedTitle")
        }
        message={confirm === "clear" ? t("confirmClear") : t("confirmSeed")}
        confirmColor={confirm === "clear" ? "danger" : "primary"}
        onConfirm={confirm === "clear" ? clear : seed}
      />
    </div>
  );
}
