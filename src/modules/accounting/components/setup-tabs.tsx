"use client";

import { notify } from "@/shared/components/ui/notify";
import { Card, Label, Select, Spinner, Tabs, Button } from "@/shared/components/kit";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { updateAccountAction } from "../actions/account-actions";
import { updateCategoryAction } from "../actions/category-actions";
import { updateProjectAction } from "../actions/project-actions";
import { saveSettingsAction } from "../actions/settings-actions";
import { AccountFormModal } from "./account-form-modal";
import { CategoryFormModal } from "./category-form-modal";
import { ProjectFormModal } from "./project-form-modal";
import { TaxSettingsCard } from "./tax-settings-card";
import type { TaxSettings } from "../services/tax";

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
  accountNumber: string | null;
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
  accountNumber: string | null;
  defaultTaxRate: number;
  isAsset: boolean;
};
type ProjectRow = {
  id: string;
  name: string;
  note: string | null;
  isActive: boolean;
  bookingCount: number;
};
type SettingsData = {
  memberFeeCategoryId: string | null;
  cashAccountId: string | null;
  bankAccountId: string | null;
  memberFeeCategoryName: string | null;
  cashAccountName: string | null;
  bankAccountName: string | null;
  donationCategoryId: string | null;
  donationCategoryName: string | null;
  tax: TaxSettings;
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
  const [accountModal, setAccountModal] = useState<{
    open: boolean;
    account?: AccountRow;
  }>({ open: false });
  const [categoryModal, setCategoryModal] = useState<{
    open: boolean;
    category?: CategoryRow;
  }>({ open: false });
  const [projectModal, setProjectModal] = useState<{
    open: boolean;
    project?: ProjectRow;
  }>({ open: false });

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
      notify.error(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      <Tabs
        selectedKey={tab}
        onSelectionChange={(key) =>
          router.push(`/muhasebe/ayarlar?sekme=${String(key)}`)
        }
        emphasis="secondary"
      >
          <Tabs.List aria-label={t("title")}>
            <Tabs.Tab id={"hesaplar"} key={"hesaplar"}>
              {t("tabs.accounts")}
            </Tabs.Tab>

            <Tabs.Tab id={"kategoriler"} key={"kategoriler"}>
              {t("tabs.categories")}
            </Tabs.Tab>

            <Tabs.Tab id={"projeler"} key={"projeler"}>
              {t("tabs.projects")}
            </Tabs.Tab>
          </Tabs.List>
        <Tabs.Panel id={"hesaplar"} key={"hesaplar"}>
          <div className="pt-3">
            {canUpdate ? (
              <Button
                size="sm"
                className="mb-3"
                onPress={() => setAccountModal({ open: true })}
                variant={actionVariant("primary", "flat")}
              >
                {<Plus className="h-4 w-4" aria-hidden />}
                {t("accounts.new")}
              </Button>
            ) : null}
            <table className="w-full text-sm" aria-label={t("tabs.accounts")}>
              <thead>
                <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-400">
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
                  <tr
                    key={account.id}
                    className={`border-b border-ink-100 last:border-none${account.isActive ? "" : " opacity-60"}`}
                  >
                    <td className="py-2 pr-3 font-medium">{account.name}</td>
                    <td className="py-2 pr-3">
                      {t(`accounts.type${account.type}`)}
                    </td>
                    <td className="py-2 pr-3">
                      {(account.openingBalanceCents / 100).toLocaleString(
                        "tr-TR",
                        { style: "currency", currency: "EUR" },
                      )}
                    </td>
                    <td className="py-2 pr-3">{account.bookingCount}</td>
                    <td className="py-2 pr-3">
                      {account.isActive ? (
                        <span className="text-success">✓</span>
                      ) : (
                        <span className="text-ink-400">✗</span>
                      )}
                    </td>
                    <td className="py-2">
                      {canUpdate ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            onPress={() =>
                              setAccountModal({ open: true, account })
                            }
                            variant={actionVariant("default", "light")}
                          >
                            {t("accounts.edit")}
                          </Button>
                          <Button
                            size="sm"
                            onPress={() =>
                              toggleActive(
                                "account",
                                account,
                                !account.isActive,
                              )
                            }
                            variant={actionVariant(
                              account.isActive ? "danger" : "success",
                              "light",
                            )}
                          >
                            {account.isActive
                              ? t("accounts.deactivate")
                              : t("accounts.activate")}
                          </Button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tabs.Panel>

        <Tabs.Panel id={"kategoriler"} key={"kategoriler"}>
          <div className="pt-3">
            {canUpdate ? (
              <Button
                size="sm"
                className="mb-3"
                onPress={() => setCategoryModal({ open: true })}
                variant={actionVariant("primary", "flat")}
              >
                {<Plus className="h-4 w-4" aria-hidden />}
                {t("categories.new")}
              </Button>
            ) : null}
            <table className="w-full text-sm" aria-label={t("tabs.categories")}>
              <thead>
                <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-400">
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
                  <tr
                    key={category.id}
                    className={`border-b border-ink-100 last:border-none${category.isActive ? "" : " opacity-60"}`}
                  >
                    <td className="py-2 pr-3 font-medium">{category.name}</td>
                    <td className="py-2 pr-3">
                      {t(`categories.direction${category.direction}`)}
                    </td>
                    <td className="py-2 pr-3">
                      {t(`categories.sphere${category.sphere}`)}
                    </td>
                    <td className="py-2 pr-3">{category.bookingCount}</td>
                    <td className="py-2 pr-3">
                      {category.isActive ? (
                        <span className="text-success">✓</span>
                      ) : (
                        <span className="text-ink-400">✗</span>
                      )}
                    </td>
                    <td className="py-2">
                      {canUpdate ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            onPress={() =>
                              setCategoryModal({ open: true, category })
                            }
                            variant={actionVariant("default", "light")}
                          >
                            {t("categories.edit")}
                          </Button>
                          <Button
                            size="sm"
                            onPress={() =>
                              toggleActive(
                                "category",
                                category,
                                !category.isActive,
                              )
                            }
                            variant={actionVariant(
                              category.isActive ? "danger" : "success",
                              "light",
                            )}
                          >
                            {category.isActive
                              ? t("categories.deactivate")
                              : t("categories.activate")}
                          </Button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tabs.Panel>

        <Tabs.Panel id={"projeler"} key={"projeler"}>
          <div className="pt-3">
            {canUpdate ? (
              <Button
                size="sm"
                className="mb-3"
                onPress={() => setProjectModal({ open: true })}
                variant={actionVariant("primary", "flat")}
              >
                {<Plus className="h-4 w-4" aria-hidden />}
                {t("projects.new")}
              </Button>
            ) : null}
            <table className="w-full text-sm" aria-label={t("tabs.projects")}>
              <thead>
                <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-400">
                  <th className="py-2 pr-3">{t("projects.name")}</th>
                  <th className="py-2 pr-3">{t("projects.note")}</th>
                  <th className="py-2 pr-3">{t("projects.bookings")}</th>
                  <th className="py-2 pr-3">{t("projects.status")}</th>
                  <th className="py-2" aria-label="" />
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr
                    key={project.id}
                    className={`border-b border-ink-100 last:border-none${project.isActive ? "" : " opacity-60"}`}
                  >
                    <td className="py-2 pr-3 font-medium">{project.name}</td>
                    <td className="py-2 pr-3">{project.note ?? "—"}</td>
                    <td className="py-2 pr-3">{project.bookingCount}</td>
                    <td className="py-2 pr-3">
                      {project.isActive ? (
                        <span className="text-success">✓</span>
                      ) : (
                        <span className="text-ink-400">✗</span>
                      )}
                    </td>
                    <td className="py-2">
                      {canUpdate ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            onPress={() =>
                              setProjectModal({ open: true, project })
                            }
                            variant={actionVariant("default", "light")}
                          >
                            {t("projects.edit")}
                          </Button>
                          <Button
                            size="sm"
                            onPress={() =>
                              toggleActive(
                                "project",
                                project,
                                !project.isActive,
                              )
                            }
                            variant={actionVariant(
                              project.isActive ? "danger" : "success",
                              "light",
                            )}
                          >
                            {project.isActive
                              ? t("projects.deactivate")
                              : t("projects.activate")}
                          </Button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tabs.Panel>
      </Tabs>

      {/* Vergi ayarları (ACC-1) */}
      <TaxSettingsCard settings={settings.tax} canUpdate={canUpdate} />

      {/* Üyelik aktarımı ayar kartı (§ 11.7) */}
      <SyncSettingsCard
        settings={settings}
        canUpdate={canUpdate}
        categoryOptions={categories
          .filter(
            (category) => category.direction === "INCOME" && category.isActive,
          )
          .map((category) => ({ value: category.id, label: category.name }))}
        accountOptions={accounts
          .filter((account) => account.isActive)
          .map((account) => ({ value: account.id, label: account.name }))}
      />

      <AccountFormModal
        isOpen={accountModal.open}
        onOpenChange={(open) => setAccountModal({ open })}
        account={accountModal.account}
        chart={settings.tax.chartOfAccounts}
      />
      <CategoryFormModal
        isOpen={categoryModal.open}
        onOpenChange={(open) => setCategoryModal({ open })}
        category={categoryModal.category}
        chart={settings.tax.chartOfAccounts}
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
  const tSettingsShort = useTranslations("accounting.settings");
  const t = useTranslations("accounting.setup.syncSettings");
  const tAccounts = useTranslations("accounting.setup.accounts");
  const tCategories = useTranslations("accounting.setup.categories");
  const router = useRouter();
  const [memberFeeCategoryId, setMemberFeeCategoryId] = useState(
    settings.memberFeeCategoryId ?? "",
  );
  const [cashAccountId, setCashAccountId] = useState(
    settings.cashAccountId ?? "",
  );
  const [bankAccountId, setBankAccountId] = useState(
    settings.bankAccountId ?? "",
  );
  // Faz 5 (§ 6): bağış kategorisi.
  const [donationCategoryId, setDonationCategoryId] = useState(
    settings.donationCategoryId ?? "",
  );
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
        notify.error(result.error);
        return;
      }
      notify.success(t("toastSaved"));
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className={"shadow-sm border border-ink-200/80"}>
      <Card.Content className={["gap-4 p-6"].filter(Boolean).join(" ")}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
          {t("title")}
        </h2>
        {canUpdate ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Select
                id="accounting-setup-memberFeeCategory"
                value={memberFeeCategoryId ? memberFeeCategoryId : null}
                onChange={(selectedValue) => {
                  const keys =
                    selectedValue === null ? undefined : String(selectedValue);
                  return setMemberFeeCategoryId(String(keys ?? ""));
                }}
              >
                <Label>{t("memberFeeCategory")}</Label>
                    {categoryOptions.map((option) => (
                      <Select.Item
                        key={option.value}
                        id={option.value}
                        textValue={String(option.label)}
                      >
                        <Label>{option.label}</Label>
                      </Select.Item>
                    ))}
              </Select>
              <Select
                id="accounting-setup-cashAccount"
                value={cashAccountId ? cashAccountId : null}
                onChange={(selectedValue) => {
                  const keys =
                    selectedValue === null ? undefined : String(selectedValue);
                  return setCashAccountId(String(keys ?? ""));
                }}
              >
                <Label>{t("cashAccount")}</Label>
                    {accountOptions.map((option) => (
                      <Select.Item
                        key={option.value}
                        id={option.value}
                        textValue={String(option.label)}
                      >
                        <Label>{option.label}</Label>
                      </Select.Item>
                    ))}
              </Select>
              <Select
                id="accounting-setup-bankAccount"
                value={bankAccountId ? bankAccountId : null}
                onChange={(selectedValue) => {
                  const keys =
                    selectedValue === null ? undefined : String(selectedValue);
                  return setBankAccountId(String(keys ?? ""));
                }}
              >
                <Label>{t("bankAccount")}</Label>
                    {accountOptions.map((option) => (
                      <Select.Item
                        key={option.value}
                        id={option.value}
                        textValue={String(option.label)}
                      >
                        <Label>{option.label}</Label>
                      </Select.Item>
                    ))}
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Select
                id="accounting-setup-donationCategory"
                value={donationCategoryId ? donationCategoryId : null}
                onChange={(selectedValue) => {
                  const keys =
                    selectedValue === null ? undefined : String(selectedValue);
                  return setDonationCategoryId(String(keys ?? ""));
                }}
              >
                <Label>{t("donationCategory")}</Label>
                    {categoryOptions.map((option) => (
                      <Select.Item
                        key={option.value}
                        id={option.value}
                        textValue={String(option.label)}
                      >
                        <Label>{option.label}</Label>
                      </Select.Item>
                    ))}
              </Select>
            </div>
            <div>
              <Button
                onPress={save}
                variant={actionVariant("primary", "solid")}
                isPending={saving}
              >
                {saving ? <Spinner size="sm" tone="current" /> : null}
                {t("save")}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-ink-500">
            {tCategories("name")}:{" "}
            <strong>{settings.memberFeeCategoryName ?? "—"}</strong> ·{" "}
            {tAccounts("typeCASH")}:{" "}
            <strong>{settings.cashAccountName ?? "—"}</strong> ·{" "}
            {tAccounts("typeBANK")}:{" "}
            <strong>{settings.bankAccountName ?? "—"}</strong> ·{" "}
            {tSettingsShort("donationShort")}:{" "}
            <strong>{settings.donationCategoryName ?? "—"}</strong>
          </p>
        )}
      </Card.Content>
    </Card>
  );
}
