"use client";

import { addToast, Button, Chip } from "@heroui/react";
import { Copy, PackagePlus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { deleteModulePackageAction } from "../actions/package-actions";

export type PackageRow = {
  id: string;
  moduleKey: string;
  version: string;
  name: string;
  publisher: string;
  category: string;
  verified: boolean;
  errors: string[];
  createdAt: string;
  uploadedByLabel: string;
  installedVersion: string | null;
  installCommand: string | null;
};

const KNOWN_ERRORS = ["format", "manifest", "key", "version", "category", "files", "moduleConfig", "appVersion", "untrusted", "signature", "publisher", "categoryNotAllowed", "unreadable"];

/** Paket yükleme/doğrulama sonuçları; geçerli paket için kurulum komutu. */
export function PackagesPanel({ rows, canUpload, canDelete }: { rows: PackageRow[]; canUpload: boolean; canDelete: boolean }) {
  const t = useTranslations("system.packages");
  const format = useFormatter();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/system/packages", { method: "POST", body });
    const json = (await response.json()) as { ok: boolean; error?: string; verified?: boolean };
    setBusy(false);
    if (!json.ok) return void addToast({ title: json.error ?? t("errors.file"), color: "danger" });
    addToast({ title: json.verified ? t("verifiedToast") : t("rejectedToast"), color: json.verified ? "success" : "danger" });
    router.refresh();
  };

  const errorText = (code: string) => {
    const [kind, detail] = code.split(":");
    if (KNOWN_ERRORS.includes(kind) && !detail) return t(`errorCodes.${kind}` as never);
    if (kind === "path") return t("errorCodes.path", { file: detail ?? "" });
    if (kind === "hash") return t("errorCodes.hash", { file: detail ?? "" });
    if (kind === "mismatch") return t("errorCodes.mismatch", { file: detail ?? "" });
    return code;
  };

  return (
    <div className="flex flex-col gap-4">
      {canUpload ? (
        <div>
          <Button color="primary" startContent={<PackagePlus size={16} />} isLoading={busy} onPress={() => input.current?.click()}>
            {t("upload")}
          </Button>
          <input
            ref={input}
            type="file"
            accept=".vmod"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void upload(file);
            }}
          />
        </div>
      ) : null}
      {rows.length === 0 ? (
        <p className="text-small text-default-500">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => {
            const installed = row.installedVersion !== null && row.installedVersion === row.version;
            return (
              <li key={row.id} className="rounded-large border border-default-200 bg-content1 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{row.name}</span>
                  <span className="font-mono text-tiny text-default-500">
                    {row.moduleKey} v{row.version}
                  </span>
                  <Chip size="sm" variant="flat" color={row.verified ? "success" : "danger"}>
                    {row.verified ? t("verified") : t("rejected")}
                  </Chip>
                  {installed ? (
                    <Chip size="sm" variant="flat" color="primary">
                      {t("installed")}
                    </Chip>
                  ) : row.installedVersion ? (
                    <span className="text-tiny text-default-500">{t("installedOther", { version: row.installedVersion })}</span>
                  ) : null}
                  {canDelete ? (
                    <Button size="sm" variant="light" color="danger" isIconOnly className="ml-auto" aria-label={t("delete")} onPress={async () => {
                      const response = await deleteModulePackageAction({ id: row.id });
                      if (response.ok) router.refresh();
                    }}>
                      <Trash2 size={16} />
                    </Button>
                  ) : null}
                </div>
                <div className="mt-1 text-tiny text-default-500">
                  {t("meta", { publisher: row.publisher, category: row.category, date: format.dateTime(new Date(row.createdAt), { dateStyle: "medium", timeStyle: "short" }), by: row.uploadedByLabel })}
                </div>
                {row.errors.length ? (
                  <ul className="mt-2 list-disc pl-5 text-small text-danger">
                    {row.errors.map((code) => (
                      <li key={code}>{errorText(code)}</li>
                    ))}
                  </ul>
                ) : null}
                {row.verified && row.installCommand && !installed ? (
                  <div className="mt-3 flex flex-col gap-1">
                    <span className="text-tiny text-default-500">{t("installHelp")}</span>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 overflow-x-auto rounded-medium bg-default-100 px-2 py-1 text-tiny">{row.installCommand}</code>
                      <Button size="sm" variant="flat" isIconOnly aria-label={t("copy")} onPress={() => void navigator.clipboard?.writeText(row.installCommand ?? "")}>
                        <Copy size={14} />
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
