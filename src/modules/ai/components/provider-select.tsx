"use client";

import { addToast, Button } from "@heroui/react";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { cn } from "@/shared/utils";

import { setAiProviderAction } from "../actions/consent-actions";

type ProviderRow = { id: "local" | "mistral" | "anthropic" | "openai"; ready: boolean; model: string | null };

/** Yönetici: izinli sağlayıcılardan birini seçer (yalnızca yapılandırılmış olanlar seçilebilir). */
export function ProviderSelect({ providers, active, canChange }: { providers: ProviderRow[]; active: string | null; canChange: boolean }) {
  const t = useTranslations("ai.settings");
  const tProvider = useTranslations("ai.providers");
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {providers.map((provider) => {
        const selected = provider.id === active;
        return (
          <div key={provider.id} className={cn("flex flex-col gap-2 rounded-medium border p-4", selected ? "border-primary bg-primary-50/40 dark:bg-primary-500/10" : "border-default-200 bg-content1")}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-small font-semibold">{tProvider(`${provider.id}.name`)}</span>
              {selected ? <CheckCircle2 className="h-4 w-4 text-primary" aria-label={t("providerActive")} /> : null}
            </div>
            <span className="text-small text-default-600">{tProvider(`${provider.id}.where`)}</span>
            <span className="text-tiny text-default-500">{tProvider(`${provider.id}.setup`)}</span>
            <span className="text-tiny text-default-500">
              {provider.ready ? t("providerReady", { model: provider.model ?? "" }) : t("providerMissing")}
            </span>
            {canChange && !selected ? (
              <Button
                size="sm"
                variant="flat"
                color="primary"
                className="self-start"
                isDisabled={!provider.ready}
                isLoading={busy === provider.id}
                onPress={async () => {
                  setBusy(provider.id);
                  const result = await setAiProviderAction({ provider: provider.id });
                  setBusy(null);
                  if (!result.ok) return void addToast({ title: result.error, color: "danger" });
                  addToast({ title: t("providerChanged"), color: "success" });
                  router.refresh();
                }}
              >
                {t("providerUse")}
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
