"use client";

import { addToast, Button, Card, CardBody, Select, SelectItem } from "@heroui/react";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { importBankStatementAction } from "../actions/bank-actions";
import { BANK_MAX_CHARS } from "../schemas/bank";

const FORMATS = ["AUTO", "CAMT053", "MT940", "CSV"] as const;

/** HeroUI seçimi: normalde Set; gizli native <select> düz string verebilir. */
export const selectionKey = (keys: unknown): string => (typeof keys === "string" ? keys : String(Array.from(keys as Iterable<unknown>)[0] ?? ""));

/** Dosyayı metne çevirir: önce UTF-8 (katı), olmazsa Windows-1252 (Alman banka CSV'leri). */
async function readStatement(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

export function BankImportCard({ accounts }: { accounts: Array<{ value: string; label: string }> }) {
  const t = useTranslations("accounting.bank.import");
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [accountId, setAccountId] = useState(accounts.find((account) => account.label)?.value ?? "");
  const [format, setFormat] = useState<(typeof FORMATS)[number]>("AUTO");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const content = await readStatement(file);
      if (content.length > BANK_MAX_CHARS) {
        addToast({ title: t("tooLarge"), color: "danger" });
        return;
      }
      const result = await importBankStatementAction({ accountId, fileName: file.name, format, content });
      if (!result.ok) {
        addToast({ title: result.error, color: "danger" });
        return;
      }
      addToast({ title: t("done", { total: result.data.total, created: result.data.created, format: result.data.format }), color: "success" });
      setFile(null);
      if (input.current) input.current.value = "";
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card shadow="sm">
      <CardBody className="gap-3 p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-small font-semibold uppercase tracking-wide text-default-500">{t("title")}</h2>
          <p className="text-tiny text-default-500">{t("hint")}</p>
        </div>
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4">
          <Select id="bank-import-account" label={t("account")} labelPlacement="outside" selectedKeys={accountId ? [accountId] : []} onSelectionChange={(keys) => setAccountId(selectionKey(keys))}>
            {accounts.map((account) => (
              <SelectItem key={account.value}>{account.label}</SelectItem>
            ))}
          </Select>
          <Select id="bank-import-format" label={t("format")} labelPlacement="outside" selectedKeys={[format]} onSelectionChange={(keys) => setFormat((selectionKey(keys) || "AUTO") as (typeof FORMATS)[number])}>
            {FORMATS.map((value) => (
              <SelectItem key={value}>{t(`formats.${value}`)}</SelectItem>
            ))}
          </Select>
          <input
            ref={input}
            id="bank-import-file"
            type="file"
            accept=".xml,.csv,.txt,.sta,.mt940"
            aria-label={t("file")}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="text-small file:mr-3 file:rounded-medium file:border-0 file:bg-default-100 file:px-3 file:py-2"
          />
          <Button color="primary" startContent={<Upload className="h-4 w-4" aria-hidden />} isDisabled={!file || !accountId} isLoading={busy} onPress={submit}>
            {t("submit")}
          </Button>
        </div>
        <p className="text-tiny text-default-400">{t("privacy")}</p>
      </CardBody>
    </Card>
  );
}
