import { getTranslations } from "next-intl/server";

import { listAccountOptions } from "@/modules/accounting/server";
import { requirePermission } from "@/modules/auth/server";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";

import { BankingSettingsForm } from "../components/banking-settings-form";
import { ConnectBankButton } from "../components/connect-bank-button";
import { ConnectionCard } from "../components/connection-card";
import { bankingPermissions } from "../permissions";
import { listConnections } from "../services/connections";
import { getBankingSettings } from "../services/settings";

const RESULTS = ["baglandi", "bekliyor", "hata"] as const;

/** Ayarlar → Banka bağlantısı. */
export async function BankingView({ result }: { result?: string | null }) {
  const user = await requirePermission(bankingPermissions, "view");
  const t = await getTranslations("banking");
  const canManage = can(user.role, bankingPermissions, "approve");
  const canSync = can(user.role, bankingPermissions, "update");
  const [settings, connections, accounts] = await Promise.all([getBankingSettings(), listConnections(), listAccountOptions()]);
  const bankAccounts = accounts.filter((row) => row.type === "BANK").map((row) => ({ id: row.id, name: row.name }));
  const configured = settings.provider === "MOCK" || settings.hasCredentials;
  const shownResult = RESULTS.find((value) => value === result);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} actions={canManage ? <ConnectBankButton disabled={!configured} /> : undefined} />
      {shownResult ? (
        <p className={shownResult === "hata" ? "rounded-medium bg-danger-50 p-3 text-small text-danger-700" : "rounded-medium bg-success-50 p-3 text-small text-success-700"}>
          {t(`result.${shownResult}`)}
        </p>
      ) : null}
      {!configured ? <p className="rounded-medium bg-warning-50 p-3 text-small text-warning-700">{t("notConfigured")}</p> : null}
      {!bankAccounts.length ? <p className="text-small text-default-500">{t("noBankAccounts")}</p> : null}
      {connections.length ? (
        connections.map((connection) => (
          <ConnectionCard
            key={connection.id}
            canManage={canManage}
            canSync={canSync}
            bankAccounts={bankAccounts}
            connection={{
              id: connection.id,
              institutionName: connection.institutionName,
              status: connection.status,
              consentExpiresAt: connection.consentExpiresAt?.toISOString() ?? null,
              lastSyncAt: connection.lastSyncAt?.toISOString() ?? null,
              lastError: connection.lastError,
              accounts: connection.accounts.map((account) => ({
                id: account.id,
                iban: account.iban,
                name: account.name,
                accountingAccountId: account.accountingAccountId,
                lastSyncAt: account.lastSyncAt?.toISOString() ?? null,
                lastSyncCount: account.lastSyncCount,
              })),
            }}
          />
        ))
      ) : (
        <p className="text-small text-default-500">{t("empty")}</p>
      )}
      <p className="text-tiny text-default-500">{t("privacy")}</p>
      {canManage ? (
        <section className="space-y-3 rounded-large border border-default-200 bg-content1 p-4">
          <h2 className="text-medium font-semibold">{t("settings.title")}</h2>
          <BankingSettingsForm provider={settings.provider} hasCredentials={settings.hasCredentials} mockAllowed={settings.mockAllowed} />
        </section>
      ) : null}
    </div>
  );
}
