import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";
import { systemPermissions } from "@/shared/permissions/system";

import { PackagesPanel } from "../components/packages-panel";
import { listModulePackages, listTrustedPublishers } from "../services/packages";

/** Ayarlar → Modül Yönetimi → Paketler: imzalı modül paketleri ve güvenilen yayıncılar. */
export async function PackagesView() {
  let user;
  try {
    user = await requirePermission(systemPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const t = await getTranslations("system.packages");
  const [rows, publishers] = await Promise.all([listModulePackages(), Promise.resolve(listTrustedPublishers())]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      <PackagesPanel
        canUpload={can(user.role, systemPermissions, "update")}
        canDelete={can(user.role, systemPermissions, "delete")}
        rows={rows.map((row) => ({
          id: row.id,
          moduleKey: row.moduleKey,
          version: row.version,
          name: row.name,
          publisher: row.publisher,
          category: row.category,
          verified: row.verified,
          errors: row.errors,
          createdAt: row.createdAt.toISOString(),
          uploadedByLabel: row.uploadedByLabel,
          installedVersion: row.installedVersion,
          installCommand: row.installCommand,
        }))}
      />
      <section className="space-y-2 rounded-large border border-default-200 bg-content1 p-4">
        <h2 className="text-medium font-semibold">{t("trustedTitle")}</h2>
        {publishers.length ? (
          <ul className="text-small">
            {publishers.map((entry) => (
              <li key={entry.keyId} className="flex gap-2">
                <span className="font-medium">{entry.publisher}</span>
                <code className="text-tiny text-default-500">{entry.keyId}</code>
                {entry.official ? <span className="text-tiny text-primary">{t("official")}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-small text-default-500">{t("noTrusted")}</p>
        )}
        <p className="text-tiny text-default-500">{t("trustedHelp")}</p>
      </section>
    </div>
  );
}
