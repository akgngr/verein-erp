"use client";
import {
  toast,
  Card,
  Button,
  Spinner,
  Select,
  ListBox,
  Label,
} from "@heroui/react";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { importBankStatementAction } from "../actions/bank-actions";
import { BANK_MAX_CHARS } from "../schemas/bank";

const FORMATS = ["AUTO", "CAMT053", "MT940", "CSV"] as const;

/** Dosyayı metne çevirir: önce UTF-8 (katı), olmazsa Windows-1252 (Alman banka CSV'leri). */
async function readStatement(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

export function BankImportCard({
  accounts,
}: {
  accounts: Array<{ value: string; label: string }>;
}) {
  const t = useTranslations("accounting.bank.import");
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [accountId, setAccountId] = useState(
    accounts.find((account) => account.label)?.value ?? "",
  );
  const [format, setFormat] = useState<(typeof FORMATS)[number]>("AUTO");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const content = await readStatement(file);
      if (content.length > BANK_MAX_CHARS) {
        toast(t("tooLarge"), { variant: "danger" });
        return;
      }
      const result = await importBankStatementAction({
        accountId,
        fileName: file.name,
        format,
        content,
      });
      if (!result.ok) {
        toast(result.error, { variant: "danger" });
        return;
      }
      toast(
        t("done", {
          total: result.data.total,
          created: result.data.created,
          format: result.data.format,
        }),
        { variant: "success" },
      );
      setFile(null);
      if (input.current) input.current.value = "";
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={"shadow-sm border border-ink-200/80"}>
      <Card.Content className={["gap-3 p-5"].filter(Boolean).join(" ")}>
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
            {t("title")}
          </h2>
          <p className="text-xs text-ink-500">{t("hint")}</p>
        </div>
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4">
          <Select
            id="bank-import-account"
            value={accountId ? accountId : null}
            onChange={(selectedValue) => {
              const keys =
                selectedValue === null ? undefined : String(selectedValue);
              return setAccountId(String(keys ?? ""));
            }}
          >
            <Label>{t("account")}</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {accounts.map((account) => (
                  <ListBox.Item
                    key={account.value}
                    id={account.value}
                    textValue={String(account.label)}
                  >
                    <Label>{account.label}</Label>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          <Select
            id="bank-import-format"
            value={format}
            onChange={(selectedValue) => {
              const keys =
                selectedValue === null ? undefined : String(selectedValue);
              return setFormat(
                (String(keys ?? "") || "AUTO") as (typeof FORMATS)[number],
              );
            }}
          >
            <Label>{t("format")}</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {FORMATS.map((value) => (
                  <ListBox.Item
                    key={value}
                    id={value}
                    textValue={String(t(`formats.${value}`))}
                  >
                    <Label>{t(`formats.${value}`)}</Label>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          <input
            ref={input}
            id="bank-import-file"
            type="file"
            accept=".xml,.csv,.txt,.sta,.mt940"
            aria-label={t("file")}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-ink-100 file:px-3 file:py-2"
          />
          <Button
            isDisabled={!file || !accountId}
            onPress={submit}
            variant={actionVariant("primary", "solid")}
            isPending={busy}
          >
            {busy ? <Spinner size="sm" color="current" /> : null}
            {<Upload className="h-4 w-4" aria-hidden />}
            {t("submit")}
          </Button>
        </div>
        <p className="text-xs text-ink-400">{t("privacy")}</p>
      </Card.Content>
    </Card>
  );
}
