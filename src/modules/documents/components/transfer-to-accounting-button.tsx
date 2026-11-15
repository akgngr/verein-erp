"use client";

import { Button, addToast } from "@heroui/react";
import { Landmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { DocumentAnalysis } from "../services/document-analysis";

/**
 * "Muhasebeye aktar" (docs/specs/DOCUMENTS_AI.md, EV-3): evrak dosyası analiz edilir ve muhasebede
 * gelen fatura TASLAĞI olarak yüklenir (tedarikçi, numara, tarihler, IBAN önceden dolu). Kesinleştirme,
 * kategori ve KDV dağılımı muhasebe ekranında kullanıcıya kalır. Yetki her iki uçta sunucuda denetlenir.
 */
export function TransferToAccountingButton({ fileId, fileName, registryNumber, counterparty }: { fileId: string; fileName: string; registryNumber: string; counterparty: string }) {
  const t = useTranslations("documents.actions");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const transfer = async () => {
    setBusy(true);
    try {
      const fileResponse = await fetch(`/api/documents/files/${fileId}`);
      if (!fileResponse.ok) throw new Error("download");
      const blob = await fileResponse.blob();
      const file = new File([blob], fileName, { type: blob.type });

      const analyzeBody = new FormData();
      analyzeBody.append("file", file);
      const analyzed = (await (await fetch("/api/documents/analyze", { method: "POST", body: analyzeBody })).json().catch(() => null)) as { ok: boolean; analysis?: DocumentAnalysis } | null;
      const s = analyzed?.ok ? analyzed.analysis!.suggestions : {};
      const amount = s.amountCents ? (s.amountCents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" }) : null;
      const prefill = {
        supplierName: (s.counterparty ?? counterparty).slice(0, 150) || undefined,
        number: s.referenceNumber,
        issueDate: s.documentDate,
        dueDate: s.dueDate,
        iban: s.iban,
        notes: t("transferNote", { registryNumber, amount: amount ?? "—" }).slice(0, 500),
      };

      const body = new FormData();
      body.append("file", file);
      body.append("prefill", JSON.stringify(prefill));
      const response = await fetch("/api/accounting/payables", { method: "POST", body });
      const result = (await response.json().catch(() => null)) as { ok: boolean; id?: string; error?: string } | null;
      if (result?.id && (result.ok || response.status === 409)) {
        addToast({ title: result.ok ? t("transferred") : (result.error ?? t("transferDuplicate")), color: result.ok ? "success" : "warning" });
        router.push(`/muhasebe/gelen-faturalar/${result.id}`);
        return;
      }
      addToast({ title: result?.error ?? t("transferFailed"), color: "danger" });
    } catch {
      addToast({ title: t("transferFailed"), color: "danger" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size="sm" variant="flat" color="primary" startContent={busy ? null : <Landmark className="h-4 w-4" aria-hidden />} isLoading={busy} onPress={transfer}>
      {t("transfer")}
    </Button>
  );
}
