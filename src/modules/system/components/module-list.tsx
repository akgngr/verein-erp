"use client";

import { notify } from "@/shared/components/ui/notify";
import { Checkbox, Dialog, InputGroup, Label, Spinner, StatusChip, Switch, Tabs, TextField, Tooltip, Button } from "@/shared/components/kit";

import { FieldClearButton } from "@/shared/components/forms/field-clear-button";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import {
  Boxes,
  Lock,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import type { ModuleCategory } from "@/shared/types/module";
import { cn } from "@/shared/utils";

import { deleteModuleAction } from "../actions/delete-module";
import { syncSchemasAction } from "../actions/sync-schemas-action";
import {
  approveModuleAccessAction,
  revokeModuleAccessAction,
} from "../actions/module-access";
import {
  getModuleTogglePlanAction,
  toggleModuleAction,
  type ModuleTogglePlan,
} from "../actions/toggle-module";
import type { ModuleItem } from "../queries/get-modules";

export function ModuleList({
  initialModules,
  stats,
  canManage,
  devTools,
}: {
  initialModules: ModuleItem[];
  stats: {
    total: number;
    core: number;
    official: number;
    extension: number;
    active: number;
    inactive: number;
  };
  canManage: boolean;
  /** Dosya yazan araçlar (şema senkronu, eklenti silme) yalnızca geliştirmede. */
  devTools: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("system");
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [deletingModule, setDeletingModule] = useState<ModuleItem | null>(null);
  const [consentModule, setConsentModule] = useState<ModuleItem | null>(null);
  const [dependencyDialog, setDependencyDialog] = useState<{
    mod: ModuleItem;
    isActive: boolean;
    plan: ModuleTogglePlan;
  } | null>(null);
  const [selectedRecommended, setSelectedRecommended] = useState<string[]>([]);
  const tDeps = useTranslations("system.dependencies");
  const tAccess = useTranslations("system.access");

  const filteredModules = useMemo(() => {
    return initialModules.filter((mod) => {
      const matchSearch =
        search === "" ||
        mod.label.toLowerCase().includes(search.toLowerCase()) ||
        mod.key.toLowerCase().includes(search.toLowerCase()) ||
        (mod.description &&
          mod.description.toLowerCase().includes(search.toLowerCase()));

      const matchCategory =
        selectedCategory === "all" || mod.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [initialModules, search, selectedCategory]);

  const handleToggle = (mod: ModuleItem, newActive: boolean) => {
    if (mod.isProtected) return;
    // Erişim izni yoksa önce onay penceresi: kullanıcı neye izin verdiğini görmeden modül açılmaz.
    if (newActive && mod.accessStatus === "pending") {
      setConsentModule(mod);
      return;
    }
    startTransition(() => planAndToggle(mod, newActive));
  };

  /** Bağımlılık planı: gerekiyorsa pencere açılır, yoksa doğrudan aç/kapat. */
  const planAndToggle = async (mod: ModuleItem, newActive: boolean) => {
    const plan = await getModuleTogglePlanAction({
      key: mod.key,
      isActive: newActive,
    });
    if (!plan.ok) {
      notify.error(plan.error);
      return;
    }
    const { enable, missing, recommended, disable } = plan.data;
    if (
      enable.length ||
      missing.length ||
      recommended.length ||
      disable.length
    ) {
      setDependencyDialog({ mod, isActive: newActive, plan: plan.data });
      setSelectedRecommended(recommended.map((item) => item.key));
      return;
    }
    await runToggle(mod, newActive, false, []);
  };

  const runToggle = async (
    mod: ModuleItem,
    newActive: boolean,
    confirmed: boolean,
    extras: string[],
  ) => {
    const result = await toggleModuleAction({
      key: mod.key,
      isActive: newActive,
      confirmed,
      recommended: extras,
    });
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    notify.success(
      newActive
        ? t("status.activatedToast", { label: mod.label })
        : t("status.deactivatedToast", { label: mod.label }));
    setDependencyDialog(null);
    router.refresh();
  };

  /** Pencerede onay: izin bekleyen bağımlılıklara izin verilir, sonra hepsi birlikte açılır/kapanır. */
  const confirmDependencies = async () => {
    if (!dependencyDialog) return;
    const { mod, isActive, plan } = dependencyDialog;
    const needApproval = [
      ...plan.enable,
      ...plan.recommended.filter((item) =>
        selectedRecommended.includes(item.key),
      ),
    ].filter((item) => item.needsApproval);
    for (const item of needApproval) {
      const approved = await approveModuleAccessAction({
        key: item.key,
        activate: false,
      });
      if (!approved.ok) {
        notify.error(approved.error);
        return;
      }
    }
    await runToggle(mod, isActive, true, selectedRecommended);
  };

  const labelOf = (key: string) =>
    initialModules.find((item) => item.key === key)?.label ?? key;
  const accessOf = (key: string) =>
    initialModules.find((item) => item.key === key)?.access ?? [];

  const approveAccess = async (mod: ModuleItem) => {
    // İzin verilir; etkinleştirme bağımlılık planından geçer (zorunlular birlikte açılır).
    const result = await approveModuleAccessAction({
      key: mod.key,
      activate: false,
    });
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    setConsentModule(null);
    await planAndToggle({ ...mod, accessStatus: "approved" }, true);
  };

  const revokeAccess = (mod: ModuleItem) =>
    startTransition(async () => {
      const result = await revokeModuleAccessAction({ key: mod.key });
      if (!result.ok) {
        notify.error(result.error);
        return;
      }
      notify.success(tAccess("revokedToast", { label: mod.label }));
      router.refresh();
    });

  const handleConfirmDelete = async () => {
    if (!deletingModule) return;
    const result = await deleteModuleAction({ key: deletingModule.key });
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    notify.success(t("deleteModal.successToast", { label: deletingModule.label }));
    setDeletingModule(null);
    router.refresh();
  };

  const handleSyncSchemas = () => {
    startTransition(async () => {
      const res = await syncSchemasAction();
      if (!res.ok) {
        notify.error(res.error);
        return;
      }
      notify.success(t("syncSuccess"));
      router.refresh();
    });
  };

  const getCategoryBadge = (category: ModuleCategory) => {
    switch (category) {
      case "CORE":
        return (
          <StatusChip tone="primary"
            className={["font-semibold text-xs tracking-wide"]
              .filter(Boolean)
              .join(" ")}
          >
            {<Shield className="h-3 w-3 ml-1" />}
            {t("badges.core")}
          </StatusChip>
        );
      case "OFFICIAL":
        return (
          <StatusChip tone="primary"
            className={["font-semibold text-xs tracking-wide"]
              .filter(Boolean)
              .join(" ")}
          >
            {<Zap className="h-3 w-3 ml-1" />}
            {t("badges.official")}
          </StatusChip>
        );
      case "EXTENSION":
        return (
          <StatusChip tone="warning"
            className={["font-semibold text-xs tracking-wide"]
              .filter(Boolean)
              .join(" ")}
          >
            {<Boxes className="h-3 w-3 ml-1" />}
            {t("badges.extension")}
          </StatusChip>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. İstatistik Kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-surface border border-ink-200/80 shadow-xs flex flex-col gap-1">
          <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider">
            {t("stats.total")}
          </span>
          <span className="text-2xl font-bold text-foreground tracking-tight">
            {stats.total}
          </span>
          <span className="text-[11px] text-ink-400">
            {stats.active} {t("stats.active")}, {stats.inactive}{" "}
            {t("stats.inactive")}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-ink-200/80 shadow-xs flex flex-col gap-1">
          <span className="text-xs font-semibold text-secondary-500 uppercase tracking-wider flex items-center gap-1">
            <Shield className="h-3 w-3" /> {t("stats.core")}
          </span>
          <span className="text-2xl font-bold text-foreground tracking-tight">
            {stats.core}
          </span>
          <span className="text-[11px] text-ink-400">
            {t("stats.coreDesc")}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-ink-200/80 shadow-xs flex flex-col gap-1">
          <span className="text-xs font-semibold text-brand-500 uppercase tracking-wider flex items-center gap-1">
            <Zap className="h-3 w-3" /> {t("stats.official")}
          </span>
          <span className="text-2xl font-bold text-foreground tracking-tight">
            {stats.official}
          </span>
          <span className="text-[11px] text-ink-400">
            {t("stats.officialDesc")}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-ink-200/80 shadow-xs flex flex-col gap-1">
          <span className="text-xs font-semibold text-warning-500 uppercase tracking-wider flex items-center gap-1">
            <Boxes className="h-3 w-3" /> {t("stats.extension")}
          </span>
          <span className="text-2xl font-bold text-foreground tracking-tight">
            {stats.extension}
          </span>
          <span className="text-[11px] text-ink-400">
            {t("stats.extensionDesc")}
          </span>
        </div>
      </div>

      {/* 2. Filtreleme Araç Çubuğu */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="w-full sm:w-72">
            <TextField
              value={search}
              onChange={setSearch}
              className={["w-full"].filter(Boolean).join(" ")}
            >
              <InputGroup
                className={
                  "h-9 bg-ink-100/60 hover:bg-ink-100 border border-ink-200/80 rounded-xl transition-colors"
                }
              >
                <InputGroup.Prefix>
                  {<Search className="h-4 w-4 text-ink-400" />}
                </InputGroup.Prefix>
                <InputGroup.Input
                  placeholder={t("searchPlaceholder")}
                  className={["h-9 text-sm"].filter(Boolean).join(" ")}
                />
                <InputGroup.Suffix>
                  {search ? (
                    <FieldClearButton onPress={() => setSearch("")} />
                  ) : null}
                </InputGroup.Suffix>
              </InputGroup>
            </TextField>
          </div>

          <Tabs
            selectedKey={selectedCategory}
            onSelectionChange={(key) => setSelectedCategory(String(key))}
            emphasis="secondary"
          >
              <Tabs.List
                className={
                  "bg-ink-100/70 border border-ink-200/80 h-9 p-0.5 rounded-xl"
                }
              >
                <Tabs.Tab
                  id={"all"}
                  key={"all"}
                  className={"h-7 text-sm font-medium px-3"}
                >
                  {t("tabs.all")}
                </Tabs.Tab>
                <Tabs.Tab
                  id={"CORE"}
                  key={"CORE"}
                  className={"h-7 text-sm font-medium px-3"}
                >
                  {t("tabs.core")}
                </Tabs.Tab>
                <Tabs.Tab
                  id={"OFFICIAL"}
                  key={"OFFICIAL"}
                  className={"h-7 text-sm font-medium px-3"}
                >
                  {t("tabs.official")}
                </Tabs.Tab>
                <Tabs.Tab
                  id={"EXTENSION"}
                  key={"EXTENSION"}
                  className={"h-7 text-sm font-medium px-3"}
                >
                  {t("tabs.extension")}
                </Tabs.Tab>
              </Tabs.List>
          </Tabs>
        </div>

        {canManage && devTools ? (
          <Button
            size="sm"
            onPress={handleSyncSchemas}
            className="h-9 px-3 text-sm font-medium border-ink-200/80 hover:bg-ink-100 rounded-xl"
            variant={actionVariant("default", "bordered")}
            isPending={isPending}
          >
            {isPending ? <Spinner size="sm" tone="current" /> : null}
            {<RefreshCw className="h-3.5 w-3.5" />}
            {t("syncSchemas")}
          </Button>
        ) : null}
      </div>

      {/* 3. Modüller Tablosu */}
      <div className="overflow-hidden rounded-2xl border border-ink-200/80 bg-surface shadow-xs">
        <div className="divide-y divide-ink-100">
          {filteredModules.length === 0 ? (
            <div className="p-8 text-center text-ink-400 text-sm">
              {t("noModulesFound")}
            </div>
          ) : (
            filteredModules.map((mod) => (
              <div
                key={mod.key}
                className={cn(
                  "p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors",
                  !mod.isActive && "bg-ink-50/40 opacity-70",
                )}
              >
                {/* Sol: Modül Bilgileri */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-ink-100 border border-ink-200/60 flex items-center justify-center shrink-0 text-foreground shadow-xs">
                    <Boxes className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-foreground">
                        {mod.label}
                      </span>
                      <span className="text-xs font-mono text-ink-400 px-1.5 py-0.5 rounded-md bg-ink-100">
                        {mod.key}
                      </span>
                      {getCategoryBadge(mod.category)}
                      <Link
                        href={`/ayarlar/surum-notlari?modul=${mod.key}`}
                        className="text-[11px] text-ink-400 font-medium underline-offset-2 hover:text-accent hover:underline"
                        title={t("releaseNotes")}
                      >
                        v{mod.version}
                      </Link>
                    </div>
                    <p className="text-xs text-ink-500 mt-0.5 line-clamp-1">
                      {mod.description ?? t("noDescription")}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-ink-400">
                      <span>
                        {t("author")}:{" "}
                        <span className="font-medium text-ink-600">
                          {mod.author}
                        </span>
                      </span>
                      {mod.routes.length > 0 ? (
                        <span>
                          {t("routes")}:{" "}
                          <code className="text-brand-600">
                            {mod.routes.join(", ")}
                          </code>
                        </span>
                      ) : null}
                    </div>
                    {mod.access.length > 0 ? (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {mod.accessStatus === "pending" ? (
                          <StatusChip tone="warning">
                            {<ShieldAlert className="h-3 w-3" aria-hidden />}
                            {tAccess("pending")}
                          </StatusChip>
                        ) : (
                          <StatusChip tone="success">
                            {<ShieldCheck className="h-3 w-3" aria-hidden />}
                            {tAccess("approved")}
                          </StatusChip>
                        )}
                        {mod.access.map((request) => (
                          <span
                            key={request.module}
                            className="rounded-md bg-ink-100 px-1.5 py-0.5 text-[11px] text-ink-600"
                          >
                            {request.moduleLabel}:{" "}
                            {request.operations
                              .map((op) => tAccess(`op.${op}`))
                              .join(", ")}
                          </span>
                        ))}
                        {canManage && mod.accessStatus === "pending" ? (
                          <Button
                            size="sm"
                            className="h-6"
                            onPress={() => setConsentModule(mod)}
                            variant={actionVariant("warning", "light")}
                          >
                            {tAccess("review")}
                          </Button>
                        ) : null}
                        {canManage &&
                        mod.accessStatus === "approved" &&
                        !mod.isProtected ? (
                          <Button
                            size="sm"
                            className="h-6 text-ink-500"
                            isDisabled={isPending}
                            onPress={() => revokeAccess(mod)}
                            variant={actionVariant("default", "light")}
                          >
                            {tAccess("revoke")}
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Sağ: Aktif/Pasif Switch ve Eylemler */}
                <div className="flex items-center gap-4 shrink-0 sm:self-center ml-auto sm:ml-0">
                  <div className="flex items-center gap-2">
                    {mod.isProtected ? (
                      <div className="flex items-center gap-1.5 text-xs text-ink-400 font-medium px-2.5 py-1 rounded-lg bg-ink-100/70">
                        <Lock className="h-3 w-3" />
                        <span>{t("status.protected")}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-ink-500">
                          {mod.isActive
                            ? t("status.active")
                            : t("status.inactive")}
                        </span>
                        <Switch
                          aria-label={t("toggleAria", { label: mod.label })}
                          isSelected={mod.isActive}
                          isDisabled={!canManage || isPending}
                          onChange={(val) => handleToggle(mod, val)}
                          size={"sm"}
                        >
                            <Label></Label>
                        </Switch>
                      </div>
                    )}
                  </div>

                  {mod.category === "EXTENSION" && canManage && devTools ? (
                    <Tooltip delay={300}>
                      <Button
                        isIconOnly
                        size="sm"
                        aria-label={t("deleteAria", { label: mod.label })}
                        className="rounded-lg"
                        onPress={() => setDeletingModule(mod)}
                        variant={actionVariant("danger", "light")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Tooltip.Content>
                        {t("deleteModal.confirm")}
                      </Tooltip.Content>
                    </Tooltip>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Erişim izni (onay) penceresi */}
      <Dialog
        isOpen={consentModule !== null}
        onOpenChange={(open) => !open && setConsentModule(null)} size="lg" className={"w-full max-w-lg "}>
              <DialogDismissButton />

              <Dialog.Header className="flex items-center gap-2">
                <Dialog.Heading className="flex items-center gap-2">
                  <ShieldAlert
                    className="h-5 w-5 text-warning-500"
                    aria-hidden
                  />
                  {consentModule
                    ? tAccess("title", { label: consentModule.label })
                    : null}
                </Dialog.Heading>
              </Dialog.Header>
              <Dialog.Body>
                {consentModule ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-ink-600">
                      {tAccess("intro", { label: consentModule.label })}
                    </p>
                    <ul className="flex flex-col gap-2">
                      {consentModule.access.map((request) => (
                        <li
                          key={request.module}
                          className="rounded-lg border border-ink-200 p-3"
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-semibold">
                              {request.moduleLabel}
                            </span>
                            {request.operations.map((op) => (
                              <StatusChip tone={op === "read"
                                    ? "default"
                                    : op === "write"
                                      ? "warning"
                                      : "danger"}
                                key={op}
                              >
                                {tAccess(`op.${op}`)}
                              </StatusChip>
                            ))}
                          </div>
                          {request.reason ? (
                            <p className="mt-1 text-xs text-ink-500">
                              {request.reason}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-ink-500">{tAccess("note")}</p>
                  </div>
                ) : null}
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  onPress={() => setConsentModule(null)}
                  variant={actionVariant("default", "light")}
                >
                  {tAccess("deny")}
                </Button>
                <Button
                  onPress={() =>
                    consentModule &&
                    startTransition(() => approveAccess(consentModule))
                  }
                  variant={actionVariant("warning", "solid")}
                  isPending={isPending}
                >
                  {isPending ? <Spinner size="sm" tone="current" /> : null}
                  {tAccess("allow")}
                </Button>
              </Dialog.Footer>
      </Dialog>

      {/* Bağımlılık penceresi */}
      <Dialog
        isOpen={dependencyDialog !== null}
        onOpenChange={(open) => !open && setDependencyDialog(null)} size="lg" className={"w-full max-w-lg "}>
              <DialogDismissButton />

              <Dialog.Header>
                <Dialog.Heading className="flex items-center gap-2">
                  {dependencyDialog
                    ? dependencyDialog.isActive
                      ? tDeps("enableTitle", {
                          label: dependencyDialog.mod.label,
                        })
                      : tDeps("disableTitle", {
                          label: dependencyDialog.mod.label,
                        })
                    : null}
                </Dialog.Heading>
              </Dialog.Header>
              <Dialog.Body>
                {dependencyDialog ? (
                  <div className="flex flex-col gap-4 text-sm">
                    {dependencyDialog.plan.missing.length ? (
                      <div className="rounded-lg bg-danger-50 p-3 text-danger-700">
                        <p className="font-medium">{tDeps("missingTitle")}</p>
                        <ul className="mt-1 list-disc pl-5">
                          {dependencyDialog.plan.missing.map((item) => (
                            <li key={item.module}>
                              {item.installed
                                ? tDeps("versionTooLow", {
                                    module: labelOf(item.module),
                                    installed: item.installed,
                                    required: item.version ?? "",
                                  })
                                : tDeps("notInstalled", {
                                    module: item.module,
                                    required: item.version ?? "",
                                  })}
                            </li>
                          ))}
                        </ul>
                        <Link
                          href="/ayarlar/moduller/paketler"
                          className="mt-2 inline-block underline"
                        >
                          {tDeps("installLink")}
                        </Link>
                      </div>
                    ) : null}
                    {dependencyDialog.plan.enable.length ? (
                      <div>
                        <p className="font-medium">
                          {tDeps("requiredTitle", {
                            label: dependencyDialog.mod.label,
                          })}
                        </p>
                        <ul className="mt-1 flex flex-col gap-1">
                          {dependencyDialog.plan.enable.map((item) => (
                            <li
                              key={item.key}
                              className="flex flex-wrap items-center gap-2"
                            >
                              <StatusChip tone="primary">
                                {labelOf(item.key)}
                              </StatusChip>
                              {item.needsApproval ? (
                                <span className="text-xs text-warning-600">
                                  {tDeps("needsApproval", {
                                    modules: accessOf(item.key)
                                      .map((request) => request.moduleLabel)
                                      .join(", "),
                                  })}
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {dependencyDialog.plan.recommended.length ? (
                      <div>
                        <p className="font-medium">
                          {tDeps("recommendedTitle")}
                        </p>
                        <div className="mt-1 flex flex-col gap-1">
                          {dependencyDialog.plan.recommended.map((item) => (
                            <Checkbox
                              key={item.key}
                              isSelected={selectedRecommended.includes(
                                item.key,
                              )}
                              onChange={(checked) =>
                                setSelectedRecommended((current) =>
                                  checked
                                    ? [...current, item.key]
                                    : current.filter((key) => key !== item.key),
                                )
                              }
                            >
                                <Label>
                                  {labelOf(item.key)}
                                  {item.needsApproval ? (
                                    <span className="ml-2 text-xs text-warning-600">
                                      {tDeps("needsApproval", {
                                        modules: accessOf(item.key)
                                          .map((request) => request.moduleLabel)
                                          .join(", "),
                                      })}
                                    </span>
                                  ) : null}
                                </Label>
                            </Checkbox>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {dependencyDialog.plan.disable.length ? (
                      <div className="rounded-lg bg-warning-50 p-3 text-warning-800">
                        <p className="font-medium">
                          {tDeps("dependentsTitle", {
                            label: dependencyDialog.mod.label,
                          })}
                        </p>
                        <ul className="mt-1 list-disc pl-5">
                          {dependencyDialog.plan.disable.map((key) => (
                            <li key={key}>{labelOf(key)}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  onPress={() => setDependencyDialog(null)}
                  variant={actionVariant("default", "light")}
                >
                  {tDeps("cancel")}
                </Button>
                <Button
                  isDisabled={Boolean(dependencyDialog?.plan.missing.length)}
                  onPress={() => startTransition(confirmDependencies)}
                  variant={actionVariant(
                    dependencyDialog?.isActive ? "primary" : "warning",
                    "solid",
                  )}
                  isPending={isPending}
                >
                  {isPending ? <Spinner size="sm" tone="current" /> : null}
                  {dependencyDialog?.isActive
                    ? tDeps("enableAll")
                    : tDeps("disableAll")}
                </Button>
              </Dialog.Footer>
      </Dialog>

      {/* Silme Onay Modalı */}
      <ConfirmDialog
        isOpen={deletingModule !== null}
        onOpenChange={(open) => !open && setDeletingModule(null)}
        title={t("deleteModal.title")}
        message={t("deleteModal.message", {
          label: deletingModule?.label ?? "",
        })}
        confirmLabel={t("deleteModal.confirm")}
        confirmColor="danger"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
