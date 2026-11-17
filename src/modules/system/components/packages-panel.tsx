"use client";
import { ActionButton } from "@/shared/components/ui/action-button";
import { notify } from "@/shared/components/ui/notify";
import { StatusChip } from "@/shared/components/ui/status-chip";

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

const KNOWN_ERRORS = [
  "format",
  "manifest",
  "key",
  "version",
  "category",
  "files",
  "moduleConfig",
  "appVersion",
  "untrusted",
  "signature",
  "publisher",
  "categoryNotAllowed",
  "unreadable",
];

/** Paket yükleme/doğrulama sonuçları; geçerli paket için kurulum komutu. */
export function PackagesPanel({
  rows,
  canUpload,
  canDelete,
}: {
  rows: PackageRow[];
  canUpload: boolean;
  canDelete: boolean;
}) {
  const t = useTranslations("system.packages");
  const format = useFormatter();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/system/packages", {
      method: "POST",
      body,
    });
    const json = (await response.json()) as {
      ok: boolean;
      error?: string;
      verified?: boolean;
    };
    setBusy(false);
    if (!json.ok)
      return void notify(json.error ?? t("errors.file"), "danger");
    notify(
      json.verified ? t("verifiedToast") : t("rejectedToast"),
      json.verified ? "success" : "danger",
    );
    router.refresh();
  };

  const errorText = (code: string) => {
    const [kind, detail] = code.split(":");
    if (KNOWN_ERRORS.includes(kind) && !detail)
      return t(`errorCodes.${kind}` as never);
    if (kind === "path") return t("errorCodes.path", { file: detail ?? "" });
    if (kind === "hash") return t("errorCodes.hash", { file: detail ?? "" });
    if (kind === "mismatch")
      return t("errorCodes.mismatch", { file: detail ?? "" });
    return code;
  };

  return (
    <div className="flex flex-col gap-4">
      {canUpload ? (
        <div>
          <ActionButton
            isPending={busy}
            startIcon={<PackagePlus size={16} />}
            onPress={() => input.current?.click()}
          >
            {t("upload")}
          </ActionButton>
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
        <p className="text-sm text-ink-500">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => {
            const installed =
              row.installedVersion !== null &&
              row.installedVersion === row.version;
            return (
              <li
                key={row.id}
                className="rounded-xl border border-ink-200 bg-surface p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{row.name}</span>
                  <span className="font-mono text-xs text-ink-500">
                    {row.moduleKey} v{row.version}
                  </span>
                  <StatusChip tone={row.verified ? "success" : "danger"}>
                    {row.verified ? t("verified") : t("rejected")}
                  </StatusChip>
                  {installed ? (
                    <StatusChip tone="primary">{t("installed")}</StatusChip>
                  ) : row.installedVersion ? (
                    <span className="text-xs text-ink-500">
                      {t("installedOther", { version: row.installedVersion })}
                    </span>
                  ) : null}
                  {canDelete ? (
                    <ActionButton
                      color="danger"
                      variant="light"
                      isIconOnly
                      className="ml-auto"
                      ariaLabel={t("delete")}
                      onPress={() => {
                        void deleteModulePackageAction({ id: row.id }).then(
                          (response) => {
                            if (response.ok) router.refresh();
                          },
                        );
                      }}
                    >
                      <Trash2 size={16} />
                    </ActionButton>
                  ) : null}
                </div>
                <div className="mt-1 text-xs text-ink-500">
                  {t("meta", {
                    publisher: row.publisher,
                    category: row.category,
                    date: format.dateTime(new Date(row.createdAt), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }),
                    by: row.uploadedByLabel,
                  })}
                </div>
                {row.errors.length ? (
                  <ul className="mt-2 list-disc pl-5 text-sm text-danger">
                    {row.errors.map((code) => (
                      <li key={code}>{errorText(code)}</li>
                    ))}
                  </ul>
                ) : null}
                {row.verified && row.installCommand && !installed ? (
                  <div className="mt-3 flex flex-col gap-1">
                    <span className="text-xs text-ink-500">
                      {t("installHelp")}
                    </span>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 overflow-x-auto rounded-lg bg-ink-100 px-2 py-1 text-xs">
                        {row.installCommand}
                      </code>
                      <ActionButton
                        color="default"
                        variant="flat"
                        isIconOnly
                        ariaLabel={t("copy")}
                        onPress={() =>
                          void navigator.clipboard?.writeText(
                            row.installCommand ?? "",
                          )
                        }
                      >
                        <Copy size={14} />
                      </ActionButton>
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
