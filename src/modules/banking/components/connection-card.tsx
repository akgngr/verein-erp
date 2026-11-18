"use client";

import { notify } from "@/shared/components/ui/notify";
import { Label, Select, Spinner, StatusChip, Button } from "@/shared/components/kit";

import { actionVariant } from "@/shared/components/ui/action-appearance";
import { statusTone } from "@/shared/components/ui/status-appearance";

import { RefreshCw, Trash2, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";

import {
  mapBankAccountAction,
  refreshBankConnectionAction,
  removeBankConnectionAction,
  syncBankConnectionAction,
} from "../actions/banking-actions";

export type ConnectionCardData = {
  id: string;
  institutionName: string;
  status: "PENDING" | "LINKED" | "EXPIRED" | "ERROR";
  consentExpiresAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  accounts: {
    id: string;
    iban: string | null;
    name: string | null;
    accountingAccountId: string | null;
    lastSyncAt: string | null;
    lastSyncCount: number | null;
  }[];
};

const STATUS_COLOR = {
  PENDING: "warning",
  LINKED: "success",
  EXPIRED: "danger",
  ERROR: "danger",
} as const;

/** IBAN'ın yalnızca son 4 hanesi gösterilir (ekran paylaşımında sızmasın). */
function maskIban(iban: string | null): string {
  return iban ? `${iban.slice(0, 4)} •••• ${iban.slice(-4)}` : "—";
}

export function ConnectionCard({
  connection,
  bankAccounts,
  canManage,
  canSync,
}: {
  connection: ConnectionCardData;
  bankAccounts: { id: string; name: string }[];
  canManage: boolean;
  canSync: boolean;
}) {
  const t = useTranslations("banking");
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const format = useFormatter();
  const fmt = (value: string | null) =>
    value
      ? format.dateTime(new Date(value), {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "—";

  const run = async (
    key: string,
    fn: () => Promise<{ ok: boolean; error?: string }>,
    success?: string,
  ) => {
    setBusy(key);
    const response = await fn();
    setBusy(null);
    if (!response.ok) return void notify.error(response.error);
    if (success) notify.success(success);
    router.refresh();
  };

  const sync = async () => {
    setBusy("sync");
    const response = await syncBankConnectionAction({ id: connection.id });
    setBusy(null);
    if (!response.ok) return void notify.error(response.error);
    (response.data.accounts ? notify.success : notify.warning)(
      response.data.accounts
        ? t("synced", {
            created: response.data.created,
            total: response.data.total,
          })
        : t("syncNoAccounts")
    )
    router.refresh();
  };

  return (
    <section className="space-y-3 rounded-xl border border-ink-200 bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold">
          {connection.institutionName}
        </h2>
        <StatusChip tone={STATUS_COLOR[connection.status]}
        >
          {t(`status.${connection.status}`)}
        </StatusChip>
        <div className="ml-auto flex flex-wrap gap-2">
          {canSync ? (
            <Button
              size="sm"
              onPress={() =>
                run("refresh", () =>
                  refreshBankConnectionAction({ id: connection.id }),
                )
              }
              variant={actionVariant("default", "flat")}
              isPending={busy === "refresh"}
            >
              {busy === "refresh" ? (
                <Spinner size="sm" tone="current" />
              ) : null}
              {<RefreshCw size={14} />}
              {t("refresh")}
            </Button>
          ) : null}
          {canSync && connection.status === "LINKED" ? (
            <Button
              size="sm"
              onPress={sync}
              variant={actionVariant("primary", "solid")}
              isPending={busy === "sync"}
            >
              {busy === "sync" ? <Spinner size="sm" tone="current" /> : null}
              {<Download size={14} />}
              {t("sync")}
            </Button>
          ) : null}
          {canManage ? (
            <Button
              size="sm"
              onPress={() => setConfirmRemove(true)}
              variant={actionVariant("danger", "light")}
            >
              {<Trash2 size={14} />}
              {t("remove")}
            </Button>
          ) : null}
        </div>
      </div>
      <dl className="grid gap-x-6 gap-y-1 text-sm text-ink-600 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-ink-400">{t("consentUntil")}</dt>
          <dd>{fmt(connection.consentExpiresAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-400">{t("lastSync")}</dt>
          <dd>{fmt(connection.lastSyncAt)}</dd>
        </div>
        {connection.lastError ? (
          <div>
            <dt className="text-xs text-ink-400">{t("lastError")}</dt>
            <dd className="text-danger">
              {t(`errors.${connection.lastError}` as never)}
            </dd>
          </div>
        ) : null}
      </dl>
      {connection.status === "EXPIRED" ? (
        <p className="text-sm text-danger">{t("expiredHelp")}</p>
      ) : null}
      {connection.status === "PENDING" ? (
        <p className="text-sm text-warning-600">{t("pendingHelp")}</p>
      ) : null}
      {connection.accounts.length ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-500">
              <th className="py-1">{t("columns.account")}</th>
              <th className="py-1">{t("columns.mapping")}</th>
              <th className="py-1 text-right">{t("columns.lastSync")}</th>
            </tr>
          </thead>
          <tbody>
            {connection.accounts.map((account) => (
              <tr
                key={account.id}
                className="border-t border-ink-100 align-middle"
              >
                <td className="py-2">
                  <div>{account.name ?? "—"}</div>
                  <div className="font-mono text-xs text-ink-500">
                    {maskIban(account.iban)}
                  </div>
                </td>
                <td className="py-2 pr-3">
                  <Select
                    aria-label={t("columns.mapping")}
                    isDisabled={!canManage}
                    placeholder={t("notMapped")}
                    className="max-w-xs"
                    value={
                      account.accountingAccountId
                        ? account.accountingAccountId
                        : null
                    }
                    onChange={(selectedValue) => {
                      const keys =
                        selectedValue === null
                          ? undefined
                          : String(selectedValue);
                      const key = keys;
                      void run(
                        "map",
                        () =>
                          mapBankAccountAction({
                            accountId: account.id,
                            accountingAccountId:
                              typeof key === "string" ? key : null,
                          }),
                        t("mapped"),
                      );
                    }} size="sm">
                        {bankAccounts.map((option) => (
                          <Select.Item
                            key={option.id}
                            id={option.id}
                            textValue={String(option.name)}
                          >
                            <Label>{option.name}</Label>
                          </Select.Item>
                        ))}
                  </Select>
                </td>
                <td className="py-2 text-right text-xs text-ink-500">
                  {fmt(account.lastSyncAt)}
                  {account.lastSyncCount !== null ? (
                    <div>{t("newRows", { count: account.lastSyncCount })}</div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <ConfirmDialog
        isOpen={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={t("removeTitle")}
        message={t("removeMessage")}
        confirmColor="danger"
        onConfirm={async () => {
          const response = await removeBankConnectionAction({
            id: connection.id,
          });
          if (!response.ok)
            return void notify.error(response.error);
          router.refresh();
        }}
      />
    </section>
  );
}
