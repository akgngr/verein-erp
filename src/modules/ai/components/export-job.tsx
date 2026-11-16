"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getAiExportStatusAction } from "../actions/export-status";
export function AiExportJob({ id }: { id: string }) {
  const t = useTranslations("ai.panel.exportJob");
  const [result, setResult] = useState<{ status: string; url: string | null }>({
    status: "QUEUED",
    url: null,
  });
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function poll() {
      const response = await getAiExportStatusAction({ id }).catch(() => null);
      if (stopped) return;
      if (response?.ok) {
        setResult(response.data);
        if (response.data.status !== "QUEUED") return;
      }
      timer = setTimeout(poll, 3000);
    }
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [id]);
  return (
    <p className="mt-2 text-sm">
      {result.url ? (
        <a className="underline" href={result.url}>
          {t("download")}
        </a>
      ) : (
        t(result.status === "FAILED" ? "failed" : "queued")
      )}
    </p>
  );
}
