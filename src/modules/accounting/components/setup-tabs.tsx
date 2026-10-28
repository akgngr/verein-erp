"use client";

import { Button, Card, CardBody, Tab, Tabs, addToast } from "@heroui/react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { Select, SelectItem } from "@heroui/react";

import { updateAccountAction } from "../actions/account-actions";
import { updateCategoryAction } from "../actions/category-actions";
import { updateProjectAction } from "../actions/project-actions";
import { saveSettingsAction } from "../actions/settings-actions";
import { AccountFormModal } from "./account-form-modal";
import { CategoryFormModal } from "./category-form-modal";
import { ProjectFormModal } from "./project-form-modal";

/**
 * Ayarlar sekmeleri (§ 11.4): hesaplar/kategoriler/projeler tabloları +
 * üyelik aktarımı ayar kartı (§ 11.7). Silme YOK — aktif/pasif geçişi.
 */

type AccountRow = {
  id: string;
  name: string;
  type: string;
  openingBalanceCents: number;
  openingDate: Date | string;
  isActive: boolean;
  bookingCount: number;
};
type CategoryRow = {
  id: string;
  name: string;
  direction: string;
  sphere: string;
  helpText: string | null;
  isActive: boolean;
  bookingCount: number;
  sortOrder: number;
};
type ProjectRow = { id: string; name: string; note: string | null; isActive: boolean; bookingCount: number };
type SettingsData = {
  memberFeeCategoryId: string | null;
  cashAccountId: string | null;
  bankAccountId: string | null;
  memberFeeCategoryName: string | null;
  cashAccountName: string | null;
  bankAccountName: string | null;
  donationCategoryId: string | null;
  donationCategoryName: string | null;
};

export function SetupTabs({
  tab,
  accounts,
  categories,
  projects,
  settings,
  canUpdate,
}: {
  tab: "hesaplar" | "kategoriler" | "projeler";
  accounts: AccountRow[];
  categories: CategoryRow[];
  projects: ProjectRow[];
  settings: SettingsData;
  canUpdate: boolean;
}) {
  const t = useTranslations("accounting.setup");
  const router = useRouter();
  const [accountModal, setAccountModal] = useState<{ open: boolean; account?: AccountRow }>({ open: false });
  const [categoryModal, setCategoryModal] = useState<{ open: boolean; category?: CategoryRow }>({ open: false });
  const [projectModal, setProjectModal] = useState<{ open: boolean; project?: ProjectRow }>({ open: false });

  const toggleActive = async (
    entity: "account" | "category" | "project",
    row: AccountRow | CategoryRow | ProjectRow,
    isActive: boolean,
  ) => {
    let result;
    if (entity === "account") {
      const account = row as AccountRow;
      result = await updateAccountAction({
        id: account.id,
        name: account.name,
        type: account.type,
        isActive,
      });
    } else if (entity === "category") {
      const category = row as CategoryRow;
      result = await updateCategoryAction({
        id: category.id,
        name: category.name,
        direction: category.direction,
        sphere: category.sphere,
        helpText: category.helpText ?? undefined,
        isActive,
      });
    } else {
      const project = row as ProjectRow;
      result = await updateProjectAction({
        id: project.id,
        name: project.name,
        note: project.note ?? undefined,
        isActive,
      });
    }
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      <Tabs
        aria-label={t("title")}
        selectedKey={tab}
        onSelectionChange={(key) => router.push(`/muhasebe/ayarlar?sekme=${String(key)}`)}
      >
        <Tab key="hesaplar" title={t("tabs.accounts")}>
          <div className="pt-3">
            {canUpdate ? (
              <Button
                size="sm"
                color="primary"
                variant="flat"
                className="mb-3"
                startContent={<Plus className="h-4 w-4" aria-hidden />}
                onPress={() => setAccountModal({ open: true })}
              >
                {t("accounts.new")}
              </Button>
            ) : null}
            <table className="w-full text-small" aria-label={t("tabs.accounts")}>
              <thead>
                <tr className="border-b border-default-200 text-left text-tiny uppercase tracking-wide text-default-400">
                  <th className="py-2 pr-3">{t("accounts.name")}</th>
                  <th className="py-2 pr-3">{t("accounts.type")}</th>
                  <th className="py-2 pr-3">{t("accounts.openingBalance")}</th>
                  <th className="py-2 pr-3">{t("accounts.bookings")}</th>
                  <th className="py-2 pr-3">{t("accounts.status")}</th>
                  <th className="py-2" aria-label="" />
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} className={`border-b border-default-100 last:border-none${account.isActive ? "" : " opacity-60"}`}>
                    <td className="py-2 pr-3 font-medium">{account.name}</td>
                    <td className="py-2 pr-3">{t(`accounts.type${account.type}`)}</td>
                    <td className="py-2 pr-3">
                      {(account.openingBalanceCents / 100).toLocaleString("tr-TR", { style: "currency", currency: "EUR" })}
                    </td>
                    <td className="py-2 pr-3">{account.bookingCount}</td>
                    <td className="py-2 pr-3">
                      {account.isActive ? (
                        <span className="text-success">✓</span>
                      ) : (
                        <span className="text-default-400">✗</span>
                      )}
                    </td>
                    <td className="py-2">
                      {canUpdate ? (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="light" onPress={() => setAccountModal({ open: true, account })}>
                            {t("accounts.edit")}
                          </Button>
                          <Button
                            size="sm"
                            variant="light"
                            color={account.isActive ? "danger" : "success"}
                            onPress={() => toggleActive("account", account, !account.isActive)}
                          >
                            {account.isActive ? t("accounts.deactivate") : t("accounts.activate")}
                          </Button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tab>

        <Tab key="kategoriler" title={t("tabs.categories")}>
          <div className="pt-3">
            {canUpdate ? (
              <Button
                size="sm"
                color="primary"
                variant="flat"
                className="mb-3"
                startContent={<Plus className="h-4 w-4" aria-hidden />}
                onPress={() => setCategoryModal({ open: true })}
              >
                {t("categories.new")}
              </Button>
            ) : null}
            <table className="w-full text-small" aria-label={t("tabs.categories")}>
              <thead>
                <tr className="border-b border-default-200 text-left text-tiny uppercase tracking-wide text-default-400">
                  <th className="py-2 pr-3">{t("categories.name")}</th>
                  <th className="py-2 pr-3">{t("categories.direction")}</th>
                  <th className="py-2 pr-3">{t("categories.sphere")}</th>
                  <th className="py-2 pr-3">{t("categories.bookings")}</th>
                  <th className="py-2 pr-3">{t("categories.status")}</th>
                  <th className="py-2" aria-label="" />
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} className={`border-b border-default-100 last:border-none${category.isActive ? "" : " opacity-60"}`}>
                    <td className="py-2 pr-3 font-medium">{category.name}</td>
                    <td className="py-2 pr-3">{t(`categories.direction${category.direction}`)}</td>
                    <td className="py-2 pr-3">{t(`categories.sphere${category.sphere}`)}</td>
                    <td className="py-2 pr-3">{category.bookingCount}</td>
                    <td className="py-2 pr-3">
                      {category.isActive ? (
                        <span className="text-success">✓</span>
                      ) : (
                        <span className="text-default-400">✗</span>
                      )}
                    </td>
                    <td className="py-2">
                      {canUpdate ? (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="light" onPress={() => setCategoryModal({ open: true, category })}>
                            {t("categories.edit")}
                          </Button>
                          <Button
                            size="sm"
                            variant="light"
                            color={category.isActive ? "danger" : "success"}
                            onPress={() => toggleActive("category", category, !category.isActive)}
                          >
                            {category.isActive ? t("categories.deactivate") : t("categories.activate")}
                          </Button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tab>

        <Tab key="projeler" title={t("tabs.projects")}>
          <div className="pt-3">
            {canUpdate ? (
              <Button
                size="sm"
                color="primary"
                variant="flat"
                className="mb-3"
                startContent={<Plus className="h-4 w-4" aria-hidden />}
                onPress={() => setProjectModal({ open: true })}
              >
                {t("projects.new")}
              </Button>
            ) : null}
            <table className="w-full text-small" aria-label={t("tabs.projects")}>
              <thead>
                <tr className="border-b border-default-200 text-left text-tiny uppercase tracking-wide text-default-400">
                  <th className="py-2 pr-3">{t("projects.name")}</th>
                  <th className="py-2 pr-3">{t("projects.note")}</th>
                  <th className="py-2 pr-3">{t("projects.bookings")}</th>
                  <th className="py-2 pr-3">{t("projects.status")}</th>
                  <th className="py-2" aria-label="" />
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className={`border-b border-default-100 last:border-none${project.isActive ? "" : " opacity-60"}`}>
                    <td className="py-2 pr-3 font-medium">{project.name}</td>
                    <td className="py-2 pr-3">{project.note ?? "—"}</td>
                    <td className="py-2 pr-3">{project.bookingCount}</td>
                    <td className="py-2 pr-3">
                      {project.isActive ? (
                        <span className="text-success">✓</span>
                      ) : (
                        <span className="text-default-400">✗</span>
                      )}
                    </td>
                    <td className="py-2">
                      {canUpdate ? (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="light" onPress={() => setProjectModal({ open: true, project })}>
                            {t("projects.edit")}
                          </Button>
                          <Button
                            size="sm"
                            variant="light"
                            color={project.isActive ? "danger" : "success"}
                            onPress={() => toggleActive("project", project, !project.isActive)}
                          >
                            {project.isActive ? t("projects.deactivate") : t("projects.activate")}
                          </Button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tab>
      </Tabs>

      {/* Üyelik aktarımı ayar kartı (§ 11.7) */}
      <SyncSettingsCard
        settings={settings}
        canUpdate={canUpdate}
        categoryOptions={categories
          .filter((category) => category.direction === "INCOME" && category.isActive)
          .map((category) => ({ value: category.id, label: category.name }))}
        accountOptions={accounts
          .filter((account) => account.isActive)
          .map((account) => ({ value: account.id, label: account.name }))}
      />

      <AccountFormModal
        isOpen={accountModal.open}
        onOpenChange={(open) => setAccountModal({ open })}
        account={accountModal.account}
      />
      <CategoryFormModal
        isOpen={categoryModal.open}
        onOpenChange={(open) => setCategoryModal({ open })}
        category={categoryModal.category}
      />
      <ProjectFormModal
        isOpen={projectModal.open}
        onOpenChange={(open) => setProjectModal({ open })}
        project={projectModal.project}
      />
    </div>
  );
}

/** Üyelik aktarımı ayarları (§ 11.7): aidat kategorisi + kasa/banka hesabı. */
function SyncSettingsCard({
  settings,
  canUpdate,
  categoryOptions,
  accountOptions,
}: {
  settings: SettingsData;
  canUpdate: boolean;
  categoryOptions: Array<{ value: string; label: string }>;
  accountOptions: Array<{ value: string; label: string }>;
}) {
  const t = useTranslations("accounting.setup.syncSettings");
  const tAccounts = useTranslations("accounting.setup.accounts");
  const tCategories = useTranslations("accounting.setup.categories");
  const router = useRouter();
  const [memberFeeCategoryId, setMemberFeeCategoryId] = useState(settings.memberFeeCategoryId ?? "");
  const [cashAccountId, setCashAccountId] = useState(settings.cashAccountId ?? "");
  const [bankAccountId, setBankAccountId] = useState(settings.bankAccountId ?? "");
  // Faz 5 (§ 6): bağış kategorisi.
  const [donationCategoryId, setDonationCategoryId] = useState(settings.donationCategoryId ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const result = await saveSettingsAction({
        memberFeeCategoryId: memberFeeCategoryId || null,
        cashAccountId: cashAccountId || null,
        bankAccountId: bankAccountId || null,
        donationCategoryId: donationCategoryId || null,
      });
      if (!result.ok) {
        addToast({ title: result.error, color: "danger" });
        return;
      }
      addToast({ title: t("toastSaved"), color: "success" });
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card shadow="sm">
      <CardBody className="gap-4 p-6">
        <h2 className="text-small font-semibold uppercase tracking-wide text-default-500">
          {t("title")}
        </h2>
        {canUpdate ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Select
                label={t("memberFeeCategory")}
                labelPlacement="outside"
                selectedKeys={memberFeeCategoryId ? [memberFeeCategoryId] : []}
                onSelectionChange={(keys) => setMemberFeeCategoryId(String(Array.from(keys)[0] ?? ""))}
              >
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value}>{option.label}</SelectItem>
                ))}
              </Select>
              <Select
                label={t("cashAccount")}
                labelPlacement="outside"
                selectedKeys={cashAccountId ? [cashAccountId] : []}
                onSelectionChange={(keys) => setCashAccountId(String(Array.from(keys)[0] ?? ""))}
              >
                {accountOptions.map((option) => (
                  <SelectItem key={option.value}>{option.label}</SelectItem>
                ))}
              </Select>
              <Select
                label={t("bankAccount")}
                labelPlacement="outside"
                selectedKeys={bankAccountId ? [bankAccountId] : []}
                onSelectionChange={(keys) => setBankAccountId(String(Array.from(keys)[0] ?? ""))}
              >
                {accountOptions.map((option) => (
                  <SelectItem key={option.value}>{option.label}</SelectItem>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Select
                label={t("donationCategory")}
                labelPlacement="outside"
                selectedKeys={donationCategoryId ? [donationCategoryId] : []}
                onSelectionChange={(keys) => setDonationCategoryId(String(Array.from(keys)[0] ?? ""))}
              >
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value}>{option.label}</SelectItem>
                ))}
              </Select>
            </div>
            <div>
              <Button color="primary" onPress={save} isLoading={saving}>
                {t("save")}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-small text-default-500">
            {tCategories("name")}: <strong>{settings.memberFeeCategoryName ?? "—"}</strong> ·{" "}
            {tAccounts("typeCASH")}: <strong>{settings.cashAccountName ?? "—"}</strong> ·{" "}
            {tAccounts("typeBANK")}: <strong>{settings.bankAccountName ?? "—"}</strong> · Bağış:{" "}
            <strong>{settings.donationCategoryName ?? "—"}</strong>
          </p>
        )}
      </CardBody>
    </Card>
  );
}
