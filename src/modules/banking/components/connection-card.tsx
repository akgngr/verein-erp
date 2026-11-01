"use client";

import { addToast, Button, Chip, Select, SelectItem } from "@heroui/react";
import { RefreshCw, Trash2, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";

import { mapBankAccountAction, refreshBankConnectionAction, removeBankConnectionAction, syncBankConnectionAction } from "../actions/banking-actions";

export type ConnectionCardData = {
  id: string;
  institutionName: string;
  status: "PENDING" | "LINKED" | "EXPIRED" | "ERROR";
  consentExpiresAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  accounts: { id: string; iban: string | null; name: string | null; accountingAccountId: string | null; lastSyncAt: string | null; lastSyncCount: number | null }[];
};

const STATUS_COLOR = { PENDING: "warning", LINKED: "success", EXPIRED: "danger", ERROR: "danger" } as const;

/** IBAN'ın yalnızca son 4 hanesi gösterilir (ekran paylaşımında sızmasın). */
function maskIban(iban: string | null): string {
  return iban ? `${iban.slice(0, 4)} •••• ${iban.slice(-4)}` : "—";
}

export function ConnectionCard({ connection, bankAccounts, canManage, canSync }: {
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
  const fmt = (value: string | null) => (value ? format.dateTime(new Date(value), { dateStyle: "medium", timeStyle: "short" }) : "—");

  const run = async (key: string, fn: () => Promise<{ ok: boolean; error?: string }>, success?: string) => {
    setBusy(key);
    const response = await fn();
    setBusy(null);
    if (!response.ok) return void addToast({ title: response.error, color: "danger" });
    if (success) addToast({ title: success, color: "success" });
    router.refresh();
  };

  const sync = async () => {
    setBusy("sync");
    const response = await syncBankConnectionAction({ id: connection.id });
    setBusy(null);
    if (!response.ok) return void addToast({ title: response.error, color: "danger" });
    addToast({
      title: response.data.accounts ? t("synced", { created: response.data.created, total: response.data.total }) : t("syncNoAccounts"),
      color: response.data.accounts ? "success" : "warning",
    });
    router.refresh();
  };

  return (
    <section className="space-y-3 rounded-large border border-default-200 bg-content1 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-medium font-semibold">{connection.institutionName}</h2>
        <Chip size="sm" variant="flat" color={STATUS_COLOR[connection.status]}>
          {t(`status.${connection.status}`)}
        </Chip>
        <div className="ml-auto flex flex-wrap gap-2">
          {canSync ? (
            <Button size="sm" variant="flat" startContent={<RefreshCw size={14} />} isLoading={busy === "refresh"} onPress={() => run("refresh", () => refreshBankConnectionAction({ id: connection.id }))}>
              {t("refresh")}
            </Button>
          ) : null}
          {canSync && connection.status === "LINKED" ? (
            <Button size="sm" color="primary" startContent={<Download size={14} />} isLoading={busy === "sync"} onPress={sync}>
              {t("sync")}
            </Button>
          ) : null}
          {canManage ? (
            <Button size="sm" color="danger" variant="light" startContent={<Trash2 size={14} />} onPress={() => setConfirmRemove(true)}>
              {t("remove")}
            </Button>
          ) : null}
        </div>
      </div>
      <dl className="grid gap-x-6 gap-y-1 text-small text-default-600 sm:grid-cols-3">
        <div>
          <dt className="text-tiny text-default-400">{t("consentUntil")}</dt>
          <dd>{fmt(connection.consentExpiresAt)}</dd>
        </div>
        <div>
          <dt className="text-tiny text-default-400">{t("lastSync")}</dt>
          <dd>{fmt(connection.lastSyncAt)}</dd>
        </div>
        {connection.lastError ? (
          <div>
            <dt className="text-tiny text-default-400">{t("lastError")}</dt>
            <dd className="text-danger">{t(`errors.${connection.lastError}` as never)}</dd>
          </div>
        ) : null}
      </dl>
      {connection.status === "EXPIRED" ? <p className="text-small text-danger">{t("expiredHelp")}</p> : null}
      {connection.status === "PENDING" ? <p className="text-small text-warning-600">{t("pendingHelp")}</p> : null}
      {connection.accounts.length ? (
        <table className="w-full text-small">
          <thead>
            <tr className="text-left text-tiny text-default-500">
              <th className="py-1">{t("columns.account")}</th>
              <th className="py-1">{t("columns.mapping")}</th>
              <th className="py-1 text-right">{t("columns.lastSync")}</th>
            </tr>
          </thead>
          <tbody>
            {connection.accounts.map((account) => (
              <tr key={account.id} className="border-t border-default-100 align-middle">
                <td className="py-2">
                  <div>{account.name ?? "—"}</div>
                  <div className="font-mono text-tiny text-default-500">{maskIban(account.iban)}</div>
                </td>
                <td className="py-2 pr-3">
                  <Select
                    aria-label={t("columns.mapping")}
                    size="sm"
                    isDisabled={!canManage}
                    placeholder={t("notMapped")}
                    selectedKeys={account.accountingAccountId ? [account.accountingAccountId] : []}
                    onSelectionChange={(keys) => {
                      const key = Array.from(keys)[0];
                      void run("map", () => mapBankAccountAction({ accountId: account.id, accountingAccountId: typeof key === "string" ? key : null }), t("mapped"));
                    }}
                    className="max-w-xs"
                  >
                    {bankAccounts.map((option) => (
                      <SelectItem key={option.id}>{option.name}</SelectItem>
                    ))}
                  </Select>
                </td>
                <td className="py-2 text-right text-tiny text-default-500">
                  {fmt(account.lastSyncAt)}
                  {account.lastSyncCount !== null ? <div>{t("newRows", { count: account.lastSyncCount })}</div> : null}
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
          const response = await removeBankConnectionAction({ id: connection.id });
          if (!response.ok) return void addToast({ title: response.error, color: "danger" });
          router.refresh();
        }}
      />
    </section>
  );
}
