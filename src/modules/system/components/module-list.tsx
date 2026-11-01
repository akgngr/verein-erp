"use client";

import {
  Button,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Switch,
  Tab,
  Tabs,
  addToast,
} from "@heroui/react";
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
import { approveModuleAccessAction, revokeModuleAccessAction } from "../actions/module-access";
import { toggleModuleAction } from "../actions/toggle-module";
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
  const tAccess = useTranslations("system.access");

  const filteredModules = useMemo(() => {
    return initialModules.filter((mod) => {
      const matchSearch =
        search === "" ||
        mod.label.toLowerCase().includes(search.toLowerCase()) ||
        mod.key.toLowerCase().includes(search.toLowerCase()) ||
        (mod.description && mod.description.toLowerCase().includes(search.toLowerCase()));

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

    startTransition(async () => {
      const result = await toggleModuleAction({ key: mod.key, isActive: newActive });
      if (!result.ok) {
        addToast({ title: result.error, color: "danger" });
        return;
      }
      addToast({
        title: newActive
          ? t("status.activatedToast", { label: mod.label })
          : t("status.deactivatedToast", { label: mod.label }),
        color: "success",
      });
      router.refresh();
    });
  };

  const approveAccess = async (mod: ModuleItem) => {
    const result = await approveModuleAccessAction({ key: mod.key, activate: true });
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    addToast({ title: tAccess("approvedToast", { label: mod.label }), color: "success" });
    setConsentModule(null);
    router.refresh();
  };

  const revokeAccess = (mod: ModuleItem) =>
    startTransition(async () => {
      const result = await revokeModuleAccessAction({ key: mod.key });
      if (!result.ok) {
        addToast({ title: result.error, color: "danger" });
        return;
      }
      addToast({ title: tAccess("revokedToast", { label: mod.label }), color: "success" });
      router.refresh();
    });

  const handleConfirmDelete = async () => {
    if (!deletingModule) return;
    const result = await deleteModuleAction({ key: deletingModule.key });
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    addToast({
      title: t("deleteModal.successToast", { label: deletingModule.label }),
      color: "success",
    });
    setDeletingModule(null);
    router.refresh();
  };

  const handleSyncSchemas = () => {
    startTransition(async () => {
      const res = await syncSchemasAction();
      if (!res.ok) {
        addToast({ title: res.error, color: "danger" });
        return;
      }
      addToast({
        title: t("syncSuccess"),
        color: "success",
      });
      router.refresh();
    });
  };

  const getCategoryBadge = (category: ModuleCategory) => {
    switch (category) {
      case "CORE":
        return (
          <Chip
            size="sm"
            variant="flat"
            color="secondary"
            className="font-semibold text-tiny tracking-wide"
            startContent={<Shield className="h-3 w-3 ml-1" />}
          >
            {t("badges.core")}
          </Chip>
        );
      case "OFFICIAL":
        return (
          <Chip
            size="sm"
            variant="flat"
            color="primary"
            className="font-semibold text-tiny tracking-wide"
            startContent={<Zap className="h-3 w-3 ml-1" />}
          >
            {t("badges.official")}
          </Chip>
        );
      case "EXTENSION":
        return (
          <Chip
            size="sm"
            variant="flat"
            color="warning"
            className="font-semibold text-tiny tracking-wide"
            startContent={<Boxes className="h-3 w-3 ml-1" />}
          >
            {t("badges.extension")}
          </Chip>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. İstatistik Kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-content1 border border-default-200/80 shadow-xs flex flex-col gap-1">
          <span className="text-tiny font-semibold text-default-400 uppercase tracking-wider">
            {t("stats.total")}
          </span>
          <span className="text-2xl font-bold text-foreground tracking-tight">
            {stats.total}
          </span>
          <span className="text-[11px] text-default-400">
            {stats.active} {t("stats.active")}, {stats.inactive} {t("stats.inactive")}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-content1 border border-default-200/80 shadow-xs flex flex-col gap-1">
          <span className="text-tiny font-semibold text-secondary-500 uppercase tracking-wider flex items-center gap-1">
            <Shield className="h-3 w-3" /> {t("stats.core")}
          </span>
          <span className="text-2xl font-bold text-foreground tracking-tight">
            {stats.core}
          </span>
          <span className="text-[11px] text-default-400">{t("stats.coreDesc")}</span>
        </div>

        <div className="p-4 rounded-2xl bg-content1 border border-default-200/80 shadow-xs flex flex-col gap-1">
          <span className="text-tiny font-semibold text-primary-500 uppercase tracking-wider flex items-center gap-1">
            <Zap className="h-3 w-3" /> {t("stats.official")}
          </span>
          <span className="text-2xl font-bold text-foreground tracking-tight">
            {stats.official}
          </span>
          <span className="text-[11px] text-default-400">{t("stats.officialDesc")}</span>
        </div>

        <div className="p-4 rounded-2xl bg-content1 border border-default-200/80 shadow-xs flex flex-col gap-1">
          <span className="text-tiny font-semibold text-warning-500 uppercase tracking-wider flex items-center gap-1">
            <Boxes className="h-3 w-3" /> {t("stats.extension")}
          </span>
          <span className="text-2xl font-bold text-foreground tracking-tight">
            {stats.extension}
          </span>
          <span className="text-[11px] text-default-400">{t("stats.extensionDesc")}</span>
        </div>
      </div>

      {/* 2. Filtreleme Araç Çubuğu */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="w-full sm:w-72">
            <Input
              size="sm"
              placeholder={t("searchPlaceholder")}
              value={search}
              onValueChange={setSearch}
              onClear={() => setSearch("")}
              isClearable
              startContent={<Search className="h-4 w-4 text-default-400" />}
              classNames={{
                inputWrapper:
                  "h-9 bg-default-100/60 hover:bg-default-100 border border-default-200/80 rounded-xl transition-colors",
              }}
            />
          </div>

          <Tabs
            size="sm"
            selectedKey={selectedCategory}
            onSelectionChange={(key) => setSelectedCategory(String(key))}
            classNames={{
              tabList: "bg-default-100/70 border border-default-200/80 h-9 p-0.5 rounded-xl",
              cursor: "bg-background shadow-xs rounded-lg",
              tab: "h-7 text-small font-medium px-3",
            }}
          >
            <Tab key="all" title={t("tabs.all")} />
            <Tab key="CORE" title={t("tabs.core")} />
            <Tab key="OFFICIAL" title={t("tabs.official")} />
            <Tab key="EXTENSION" title={t("tabs.extension")} />
          </Tabs>
        </div>

        {canManage && devTools ? (
          <Button
            size="sm"
            variant="bordered"
            onPress={handleSyncSchemas}
            isLoading={isPending}
            startContent={<RefreshCw className="h-3.5 w-3.5" />}
            className="h-9 px-3 text-small font-medium border-default-200/80 hover:bg-default-100 rounded-xl"
          >
            {t("syncSchemas")}
          </Button>
        ) : null}
      </div>

      {/* 3. Modüller Tablosu */}
      <div className="overflow-hidden rounded-2xl border border-default-200/80 bg-content1 shadow-xs">
        <div className="divide-y divide-default-100">
          {filteredModules.length === 0 ? (
            <div className="p-8 text-center text-default-400 text-small">
              {t("noModulesFound")}
            </div>
          ) : (
            filteredModules.map((mod) => (
              <div
                key={mod.key}
                className={cn(
                  "p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors",
                  !mod.isActive && "bg-default-50/40 opacity-70",
                )}
              >
                {/* Sol: Modül Bilgileri */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-default-100 border border-default-200/60 flex items-center justify-center shrink-0 text-foreground shadow-xs">
                    <Boxes className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-small font-bold text-foreground">
                        {mod.label}
                      </span>
                      <span className="text-tiny font-mono text-default-400 px-1.5 py-0.5 rounded-md bg-default-100">
                        {mod.key}
                      </span>
                      {getCategoryBadge(mod.category)}
                      <Link
                        href={`/ayarlar/surum-notlari?modul=${mod.key}`}
                        className="text-[11px] text-default-400 font-medium underline-offset-2 hover:text-primary hover:underline"
                        title={t("releaseNotes")}
                      >
                        v{mod.version}
                      </Link>
                    </div>
                    <p className="text-tiny text-default-500 mt-0.5 line-clamp-1">
                      {mod.description ?? t("noDescription")}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-default-400">
                      <span>{t("author")}: <span className="font-medium text-default-600">{mod.author}</span></span>
                      {mod.routes.length > 0 ? (
                        <span>{t("routes")}: <code className="text-primary-600">{mod.routes.join(", ")}</code></span>
                      ) : null}
                    </div>
                    {mod.access.length > 0 ? (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {mod.accessStatus === "pending" ? (
                          <Chip size="sm" color="warning" variant="flat" startContent={<ShieldAlert className="h-3 w-3" aria-hidden />}>
                            {tAccess("pending")}
                          </Chip>
                        ) : (
                          <Chip size="sm" color="success" variant="flat" startContent={<ShieldCheck className="h-3 w-3" aria-hidden />}>
                            {tAccess("approved")}
                          </Chip>
                        )}
                        {mod.access.map((request) => (
                          <span key={request.module} className="rounded-md bg-default-100 px-1.5 py-0.5 text-[11px] text-default-600">
                            {request.moduleLabel}: {request.operations.map((op) => tAccess(`op.${op}`)).join(", ")}
                          </span>
                        ))}
                        {canManage && mod.accessStatus === "pending" ? (
                          <Button size="sm" variant="light" color="warning" className="h-6" onPress={() => setConsentModule(mod)}>
                            {tAccess("review")}
                          </Button>
                        ) : null}
                        {canManage && mod.accessStatus === "approved" && !mod.isProtected ? (
                          <Button size="sm" variant="light" className="h-6 text-default-500" isDisabled={isPending} onPress={() => revokeAccess(mod)}>
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
                      <div className="flex items-center gap-1.5 text-xs text-default-400 font-medium px-2.5 py-1 rounded-lg bg-default-100/70">
                        <Lock className="h-3 w-3" />
                        <span>{t("status.protected")}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-default-500">
                          {mod.isActive ? t("status.active") : t("status.inactive")}
                        </span>
                        <Switch
                          size="sm"
                          aria-label={t("toggleAria", { label: mod.label })}
                          isSelected={mod.isActive}
                          isDisabled={!canManage || isPending}
                          onValueChange={(val) => handleToggle(mod, val)}
                        />
                      </div>
                    )}
                  </div>

                  {mod.category === "EXTENSION" && canManage && devTools ? (
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      color="danger"
                      aria-label={t("deleteAria", { label: mod.label })}
                      title={t("deleteModal.confirm")}
                      className="rounded-lg"
                      onPress={() => setDeletingModule(mod)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Erişim izni (onay) penceresi */}
      <Modal isOpen={consentModule !== null} onOpenChange={(open) => !open && setConsentModule(null)} size="lg">
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-warning-500" aria-hidden />
            {consentModule ? tAccess("title", { label: consentModule.label }) : null}
          </ModalHeader>
          <ModalBody>
            {consentModule ? (
              <div className="flex flex-col gap-3">
                <p className="text-small text-default-600">{tAccess("intro", { label: consentModule.label })}</p>
                <ul className="flex flex-col gap-2">
                  {consentModule.access.map((request) => (
                    <li key={request.module} className="rounded-medium border border-default-200 p-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-small font-semibold">{request.moduleLabel}</span>
                        {request.operations.map((op) => (
                          <Chip key={op} size="sm" variant="flat" color={op === "read" ? "default" : op === "write" ? "warning" : "danger"}>
                            {tAccess(`op.${op}`)}
                          </Chip>
                        ))}
                      </div>
                      {request.reason ? <p className="mt-1 text-tiny text-default-500">{request.reason}</p> : null}
                    </li>
                  ))}
                </ul>
                <p className="text-tiny text-default-500">{tAccess("note")}</p>
              </div>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setConsentModule(null)}>
              {tAccess("deny")}
            </Button>
            <Button color="warning" isLoading={isPending} onPress={() => consentModule && startTransition(() => approveAccess(consentModule))}>
              {tAccess("allow")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Silme Onay Modalı */}
      <ConfirmDialog
        isOpen={deletingModule !== null}
        onOpenChange={(open) => !open && setDeletingModule(null)}
        title={t("deleteModal.title")}
        message={t("deleteModal.message", { label: deletingModule?.label ?? "" })}
        confirmLabel={t("deleteModal.confirm")}
        confirmColor="danger"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
