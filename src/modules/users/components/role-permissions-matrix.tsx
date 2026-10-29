"use client";

import { useTranslations } from "next-intl";

import { useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Select,
  SelectItem,
  Tab,
  Tabs,
} from "@heroui/react";
import {
  Check,
  Search,
  Shield,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react";

import { can, type PermissionAction } from "@/shared/permissions/define";
import type { Role } from "@/shared/roles";
import { ROLE_COLORS } from "@/shared/roles";

import {
  ALL_RESOURCES_META,
  ALL_ROLES_META,
  type PermissionResourceMeta,
} from "../permissions-matrix";
import type { UserRow } from "../queries/list-users";

const ACTION_COLORS: Record<PermissionAction, "default" | "primary" | "secondary" | "success" | "warning" | "danger"> = {
  view: "default",
  create: "primary",
  update: "secondary",
  delete: "danger",
  approve: "success",
};

/** Matris metinleri `users.matrix` çevirilerinden okunur (permissions-matrix.ts yalnızca yapı taşır). */
function useMatrixLabels() {
  const t = useTranslations("users.matrix");
  return useMemo(() => ({
    t,
    action: (action: PermissionAction) => t(`actions.${action}`),
    roleLabel: (role: Role) => t(`roles.${role}.label`),
    roleShort: (role: Role) => t(`roles.${role}.shortDesc`),
    roleLegal: (role: Role) => t(`roles.${role}.legalContext`),
    module: (res: PermissionResourceMeta) => t(`modules.${res.moduleKey}`),
    resource: (res: PermissionResourceMeta) => t(`resources.${res.resourceKey}.label`),
    description: (res: PermissionResourceMeta) => t(`resources.${res.resourceKey}.description`),
  }), [t]);
}

export function RolePermissionsMatrix({
  users = [],
  roleCounts = {
    ADMIN: 0,
    BOARD: 0,
    SECRETARY: 0,
    TREASURER: 0,
    AUDITOR: 0,
    VIEWER: 0,
  },
}: {
  users?: UserRow[];
  roleCounts?: Record<Role, number>;
}) {
  const tRoles = useTranslations("roles");
  const labels = useMatrixLabels();
  const { t } = labels;
  const [selectedRole, setSelectedRole] = useState<Role>("ADMIN");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>("");
  const [viewMode, setViewMode] = useState<string>("role-detail");

  const currentRoleMeta = useMemo(
    () => ALL_ROLES_META.find((r) => r.role === selectedRole) || ALL_ROLES_META[0],
    [selectedRole],
  );

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserFilter),
    [users, selectedUserFilter],
  );

  // Filtrelenmiş kaynaklar
  const filteredResources = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return ALL_RESOURCES_META;
    return ALL_RESOURCES_META.filter(
      (res) =>
        labels.module(res).toLowerCase().includes(q) ||
        labels.resource(res).toLowerCase().includes(q) ||
        labels.description(res).toLowerCase().includes(q) ||
        res.resourceKey.toLowerCase().includes(q),
    );
  }, [searchQuery, labels]);

  // Kaynakları modül bazında grupla
  const groupedResources = useMemo(() => {
    const map = new Map<string, PermissionResourceMeta[]>();
    for (const res of filteredResources) {
      const list = map.get(res.moduleKey) || [];
      list.push(res);
      map.set(res.moduleKey, list);
    }
    return Array.from(map.entries());
  }, [filteredResources]);

  // Aktif role ait toplam yetki sayısı
  const totalPermissionsForRole = useMemo(() => {
    let count = 0;
    for (const res of ALL_RESOURCES_META) {
      for (const act of res.supportedActions) {
        if (can(selectedRole, res.definition, act)) count++;
      }
    }
    return count;
  }, [selectedRole]);

  return (
    <div className="flex flex-col gap-6">
      {/* Üst Bilgi Başlığı */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {t("title")}
          </h2>
          <p className="text-small text-default-500">
            {t("subtitle")}
          </p>
        </div>

        {/* Görünüm Sekmeleri */}
        <Tabs
          selectedKey={viewMode}
          onSelectionChange={(k) => setViewMode(k as string)}
          variant="bordered"
          size="sm"
          color="primary"
        >
          <Tab key="role-detail" title={t("viewRole")} />
          <Tab key="matrix-table" title={t("viewMatrix")} />
        </Tabs>
      </div>

      {/* Rol Seçim Kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {ALL_ROLES_META.map((meta) => {
          const isSelected = selectedRole === meta.role;
          const userCount = roleCounts[meta.role] ?? 0;
          return (
            <Card
              key={meta.role}
              isPressable
              onPress={() => setSelectedRole(meta.role)}
              className={`border transition-all cursor-pointer ${
                isSelected
                  ? "border-primary bg-primary-50/40 dark:bg-primary-950/20 shadow-xs ring-2 ring-primary/20"
                  : "border-default-200/80 hover:border-default-300 hover:bg-default-50"
              }`}
            >
              <CardBody className="p-3.5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Chip size="sm" color={meta.badgeColor} variant={isSelected ? "solid" : "flat"}>
                    {tRoles(meta.role)}
                  </Chip>
                  <span className="text-[11px] font-semibold text-default-400">
                    {t("memberCount", { count: userCount })}
                  </span>
                </div>
                <p className="text-xs text-default-600 line-clamp-2 leading-relaxed">
                  {labels.roleShort(meta.role)}
                </p>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Arama ve Kullanıcı Simülatörü Araç Çubuğu */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-default-50 p-3 rounded-xl border border-default-200/70">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Input
            size="sm"
            placeholder={t("search")}
            startContent={<Search className="h-4 w-4 text-default-400" />}
            value={searchQuery}
            onValueChange={setSearchQuery}
            isClearable
            className="w-full"
          />
        </div>

        {users.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-default-500 shrink-0 flex items-center gap-1">
              <UserCheck className="h-3.5 w-3.5 text-primary" />
              {t("previewUser")}
            </span>
            <Select
              id="users-permission-preview-user"
              size="sm"
              placeholder={t("selectUser")}
              aria-label={t("selectUser")}
              className="w-56"
              selectedKeys={selectedUserFilter ? [selectedUserFilter] : []}
              onSelectionChange={(keys) => {
                const id = Array.from(keys)[0] as string;
                setSelectedUserFilter(id || "");
                const found = users.find((u) => u.id === id);
                if (found) setSelectedRole(found.role);
              }}
            >
              {users.map((u) => (
                <SelectItem key={u.id} textValue={`${u.name} (${tRoles(u.role)})`}>
                  <div className="flex items-center justify-between">
                    <span className="truncate">{u.name}</span>
                    <Chip size="sm" variant="dot" color={ROLE_COLORS[u.role]}>
                      {tRoles(u.role)}
                    </Chip>
                  </div>
                </SelectItem>
              ))}
            </Select>
            {selectedUserFilter && (
              <Button
                size="sm"
                isIconOnly
                variant="light"
                aria-label={t("clearUser")}
                onPress={() => setSelectedUserFilter("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 1. Görünüm: Rol Detay İncelemesi */}
      {viewMode === "role-detail" && (
        <div className="flex flex-col gap-5">
          {/* Seçili Rol Özet Kartı */}
          <div className="bg-gradient-to-r from-default-100 to-default-50/50 p-4 rounded-xl border border-default-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-xs">
                <Shield className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">
                    {labels.roleLabel(currentRoleMeta.role)}
                  </h3>
                  <Chip size="sm" color={currentRoleMeta.badgeColor} variant="solid">
                    {tRoles(selectedRole)}
                  </Chip>
                  {selectedUser && (
                    <Chip size="sm" variant="flat" color="success">
                      {t("simulated", { name: selectedUser.name })}
                    </Chip>
                  )}
                </div>
                <p className="text-xs text-default-500 mt-0.5">
                  {labels.roleLegal(currentRoleMeta.role)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-xs text-default-400 block font-medium">{t("totalActive")}</span>
                <span className="text-lg font-bold text-primary">
                  {t("actionCount", { count: totalPermissionsForRole })}
                </span>
              </div>
            </div>
          </div>

          {/* Modül Gruplu Yetki Listesi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groupedResources.map(([moduleKey, resources]) => (
              <Card key={moduleKey} className="border border-default-200/80 shadow-xs">
                <CardHeader className="bg-default-50/80 border-b border-default-200/60 py-2.5 px-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    {labels.module(resources[0])}
                  </span>
                  <span className="text-xs text-default-400 font-medium">
                    {t("resourceCount", { count: resources.length })}
                  </span>
                </CardHeader>
                <CardBody className="p-4 flex flex-col gap-4">
                  {resources.map((res) => (
                    <div
                      key={res.resourceKey}
                      className="flex flex-col gap-2 pb-3 border-b border-default-100 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">
                          {labels.resource(res)}
                        </span>
                        <code className="text-[10px] font-mono bg-default-100 text-default-600 px-1.5 py-0.5 rounded">
                          {res.resourceKey}
                        </code>
                      </div>
                      <p className="text-[11px] text-default-400 leading-snug">
                        {labels.description(res)}
                      </p>

                      {/* Eylem Rozetleri */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {res.supportedActions.map((action) => {
                          const isGranted = can(selectedRole, res.definition, action);
                          return (
                            <Chip
                              key={action}
                              size="sm"
                              variant={isGranted ? "flat" : "bordered"}
                              color={isGranted ? ACTION_COLORS[action] : "default"}
                              startContent={
                                isGranted ? (
                                  <Check className="h-3 w-3 shrink-0 ml-1" />
                                ) : (
                                  <X className="h-3 w-3 shrink-0 ml-1 text-default-300" />
                                )
                              }
                              className={`text-[11px] ${
                                !isGranted ? "opacity-40 border-dashed" : "font-medium"
                              }`}
                            >
                              {labels.action(action)}
                            </Chip>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 2. Görünüm: Tüm Roller Karşılaştırma Matrisi */}
      {viewMode === "matrix-table" && (
        <Card className="border border-default-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-default-100 text-default-700 uppercase tracking-wider text-[11px] font-semibold border-b border-default-200">
                <tr>
                  <th className="py-3 px-4 w-64">{t("colResource")}</th>
                  <th className="py-3 px-3 w-36">{t("colAction")}</th>
                  {ALL_ROLES_META.map((meta) => (
                    <th
                      key={meta.role}
                      className={`py-3 px-3 text-center ${
                        selectedRole === meta.role ? "bg-primary-50 dark:bg-primary-950/30 text-primary font-bold" : ""
                      }`}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span>{tRoles(meta.role)}</span>
                        <span className="text-[9px] text-default-400 font-normal lowercase">
                          {meta.role}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100">
                {filteredResources.flatMap((res) =>
                  res.supportedActions.map((action, actionIdx) => {
                    return (
                      <tr
                        key={`${res.resourceKey}-${action}`}
                        className="hover:bg-default-50/70 transition-colors"
                      >
                        {actionIdx === 0 ? (
                          <td
                            rowSpan={res.supportedActions.length}
                            className="py-3 px-4 align-top font-medium border-r border-default-100 bg-background/50"
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="text-default-400 text-[10px] uppercase font-semibold">
                                {labels.module(res)}
                              </span>
                              <span className="font-semibold text-foreground text-xs">
                                {labels.resource(res)}
                              </span>
                              <code className="text-[10px] text-default-400 font-mono mt-0.5">
                                {res.resourceKey}
                              </code>
                            </div>
                          </td>
                        ) : null}
                        <td className="py-2.5 px-3 border-r border-default-100">
                          <Chip size="sm" variant="flat" color={ACTION_COLORS[action]} className="text-[10px] h-6">
                            {labels.action(action)}
                          </Chip>
                        </td>
                        {ALL_ROLES_META.map((meta) => {
                          const isGranted = can(meta.role, res.definition, action);
                          const isSelectedColumn = selectedRole === meta.role;
                          return (
                            <td
                              key={meta.role}
                              className={`py-2.5 px-3 text-center ${
                                isSelectedColumn ? "bg-primary-50/30 dark:bg-primary-950/20" : ""
                              }`}
                            >
                              {isGranted ? (
                                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-success-50 text-success-600 dark:bg-success-950/40">
                                  <Check className="h-3.5 w-3.5" />
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full text-default-300">
                                  —
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  }),
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/** Form içinde canlı rol yetki önizleme bileşeni */
export function RolePermissionsPreview({ role }: { role: Role }) {
  const meta = ALL_ROLES_META.find((r) => r.role === role) || ALL_ROLES_META[0];
  const labels = useMatrixLabels();
  const { t } = labels;

  const permissionsCount = useMemo(() => {
    let count = 0;
    for (const res of ALL_RESOURCES_META) {
      for (const act of res.supportedActions) {
        if (can(role, res.definition, act)) count++;
      }
    }
    return count;
  }, [role]);

  return (
    <div className="rounded-xl border border-default-200/80 bg-default-50/60 p-3.5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">
            {t("previewTitle", { role: labels.roleLabel(meta.role) })}
          </span>
        </div>
        <Chip size="sm" color={meta.badgeColor} variant="flat">
          {t("previewCount", { count: permissionsCount })}
        </Chip>
      </div>
      <p className="text-xs text-default-500 leading-relaxed">
        {labels.roleLegal(meta.role)}
      </p>
      <div className="flex flex-wrap gap-1.5 pt-1">
        {ALL_RESOURCES_META.slice(0, 6).map((res) => {
          const hasView = can(role, res.definition, "view");
          const hasWrite =
            can(role, res.definition, "create") ||
            can(role, res.definition, "update") ||
            can(role, res.definition, "delete");

          return (
            <Chip
              key={res.resourceKey}
              size="sm"
              variant={hasView ? "flat" : "bordered"}
              color={hasWrite ? "primary" : hasView ? "default" : "danger"}
              className={`text-[10px] h-5 ${!hasView ? "opacity-30" : ""}`}
            >
              {labels.module(res)}: {t(hasWrite ? "accessFull" : hasView ? "accessRead" : "accessNone")}
            </Chip>
          );
        })}
      </div>
    </div>
  );
}
