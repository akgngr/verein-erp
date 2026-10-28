"use client";

import {
  Button,
  Chip,
  Input,
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
  Trash2,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import type { ModuleCategory } from "@/shared/types/module";
import { cn } from "@/shared/utils";

import { deleteModuleAction } from "../actions/delete-module";
import { syncSchemasAction } from "../actions/sync-schemas-action";
import { toggleModuleAction } from "../actions/toggle-module";
import type { ModuleItem } from "../queries/get-modules";

export function ModuleList({
  initialModules,
  stats,
  canManage,
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
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [deletingModule, setDeletingModule] = useState<ModuleItem | null>(null);

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

    startTransition(async () => {
      const result = await toggleModuleAction({ key: mod.key, isActive: newActive });
      if (!result.ok) {
        addToast({ title: result.error, color: "danger" });
        return;
      }
      addToast({
        title: `${mod.label} modülü ${newActive ? "etkinleştirildi" : "devre dışı bırakıldı"}.`,
        color: "success",
      });
      router.refresh();
    });
  };

  const handleConfirmDelete = async () => {
    if (!deletingModule) return;
    const result = await deleteModuleAction({ key: deletingModule.key });
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    addToast({
      title: `${deletingModule.label} modülü başarıyla silindi.`,
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
        title: "Prisma şemaları başarıyla senkronize edildi.",
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
            Çekirdek
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
            Resmi Modül
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
            Geliştirici Eklentisi
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
            Toplam Modül
          </span>
          <span className="text-2xl font-bold text-foreground tracking-tight">
            {stats.total}
          </span>
          <span className="text-[11px] text-default-400">
            {stats.active} aktif, {stats.inactive} pasif
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-content1 border border-default-200/80 shadow-xs flex flex-col gap-1">
          <span className="text-tiny font-semibold text-secondary-500 uppercase tracking-wider flex items-center gap-1">
            <Shield className="h-3 w-3" /> Çekirdek
          </span>
          <span className="text-2xl font-bold text-foreground tracking-tight">
            {stats.core}
          </span>
          <span className="text-[11px] text-default-400">Korumalı sistem altyapısı</span>
        </div>

        <div className="p-4 rounded-2xl bg-content1 border border-default-200/80 shadow-xs flex flex-col gap-1">
          <span className="text-tiny font-semibold text-primary-500 uppercase tracking-wider flex items-center gap-1">
            <Zap className="h-3 w-3" /> Resmi Modüller
          </span>
          <span className="text-2xl font-bold text-foreground tracking-tight">
            {stats.official}
          </span>
          <span className="text-[11px] text-default-400">Yerleşik dernek ERP araçları</span>
        </div>

        <div className="p-4 rounded-2xl bg-content1 border border-default-200/80 shadow-xs flex flex-col gap-1">
          <span className="text-tiny font-semibold text-warning-500 uppercase tracking-wider flex items-center gap-1">
            <Boxes className="h-3 w-3" /> Eklentiler
          </span>
          <span className="text-2xl font-bold text-foreground tracking-tight">
            {stats.extension}
          </span>
          <span className="text-[11px] text-default-400">AI veya geliştirici eklentileri</span>
        </div>
      </div>

      {/* 2. Filtreleme Araç Çubuğu */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="w-full sm:w-72">
            <Input
              size="sm"
              placeholder="Modül ara..."
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
            <Tab key="all" title="Tümü" />
            <Tab key="CORE" title="Çekirdek" />
            <Tab key="OFFICIAL" title="Resmi" />
            <Tab key="EXTENSION" title="Eklentiler" />
          </Tabs>
        </div>

        {canManage ? (
          <Button
            size="sm"
            variant="bordered"
            onPress={handleSyncSchemas}
            isLoading={isPending}
            startContent={<RefreshCw className="h-3.5 w-3.5" />}
            className="h-9 px-3 text-small font-medium border-default-200/80 hover:bg-default-100 rounded-xl"
          >
            Şemaları Senkronize Et
          </Button>
        ) : null}
      </div>

      {/* 3. Modüller Tablosu */}
      <div className="overflow-hidden rounded-2xl border border-default-200/80 bg-content1 shadow-xs">
        <div className="divide-y divide-default-100">
          {filteredModules.length === 0 ? (
            <div className="p-8 text-center text-default-400 text-small">
              Arama kriterlerine uygun modül bulunamadı.
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
                      <span className="text-[11px] text-default-400 font-medium">
                        v{mod.version}
                      </span>
                    </div>
                    <p className="text-tiny text-default-500 mt-0.5 line-clamp-1">
                      {mod.description ?? "Açıklama bulunmuyor."}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-default-400">
                      <span>Geliştirici: <span className="font-medium text-default-600">{mod.author}</span></span>
                      {mod.routes.length > 0 ? (
                        <span>Rotalar: <code className="text-primary-600">{mod.routes.join(", ")}</code></span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Sağ: Aktif/Pasif Switch ve Eylemler */}
                <div className="flex items-center gap-4 shrink-0 sm:self-center ml-auto sm:ml-0">
                  <div className="flex items-center gap-2">
                    {mod.isProtected ? (
                      <div className="flex items-center gap-1.5 text-xs text-default-400 font-medium px-2.5 py-1 rounded-lg bg-default-100/70">
                        <Lock className="h-3 w-3" />
                        <span>Korumalı</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-default-500">
                          {mod.isActive ? "Aktif" : "Pasif"}
                        </span>
                        <Switch
                          size="sm"
                          aria-label={`${mod.label} durumunu değiştir`}
                          isSelected={mod.isActive}
                          isDisabled={!canManage || isPending}
                          onValueChange={(val) => handleToggle(mod, val)}
                        />
                      </div>
                    )}
                  </div>

                  {mod.category === "EXTENSION" && canManage ? (
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      color="danger"
                      aria-label={`${mod.label} modülünü sil`}
                      title="Modülü sil"
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

      {/* Silme Onay Modalı */}
      <ConfirmDialog
        isOpen={deletingModule !== null}
        onOpenChange={(open) => !open && setDeletingModule(null)}
        title="Modülü Sil"
        message={`"${deletingModule?.label}" modül klasörü ve tüm dosyaları kalıcı olarak silinecek. Bu işlem geri alınamaz. Onaylıyor musunuz?`}
        confirmLabel="Sil"
        confirmColor="danger"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
