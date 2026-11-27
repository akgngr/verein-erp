"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/shared/components/kit";

/** #580: E-postayla ek doğrulama bağlantısı ister (hassas işlemler: makbuz, Art. 15, düzeltme). */
export function PortalStepUpButton() {
  const t = useTranslations("member-portal.shell");
  const locale = useLocale();
  const [state, setState] = useState<"idle" | "busy" | "sent" | "failed" | "rateLimited">("idle");

  async function request() {
    setState("busy");
    try {
      const res = await fetch("/api/member-portal/step-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: locale === "de" ? "de" : "tr" }),
      });
      setState(res.ok ? "sent" : res.status === 429 ? "rateLimited" : "failed");
    } catch {
      setState("failed");
    }
  }

  if (state === "sent") return <p className="text-xs text-success-700" role="status">{t("stepUpSent")}</p>;
  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="sm" variant="secondary" isDisabled={state === "busy"} onPress={() => void request()}>
        {t("stepUpRequest")}
      </Button>
      {state === "failed" ? <p className="text-xs text-danger-600" role="alert">{t("stepUpFailed")}</p> : null}
      {state === "rateLimited" ? <p className="text-xs text-danger-600" role="alert">{t("stepUpRateLimited")}</p> : null}
    </div>
  );
}
