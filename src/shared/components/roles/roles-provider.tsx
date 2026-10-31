"use client";

import { Chip } from "@heroui/react";
import { useTranslations } from "next-intl";
import { createContext, useContext, type ReactNode } from "react";

import { setActivePermissionPolicy, type PermissionDefinition, type PermissionPolicy } from "@/shared/permissions/define";
import { roleLabelKey, type ChipColor, type RoleInfo } from "@/shared/roles";

export type PermissionResourceRef = { moduleKey: string; definition: PermissionDefinition };

const RolesContext = createContext<{ roles: RoleInfo[]; resources: PermissionResourceRef[]; policy: PermissionPolicy }>({
  roles: [],
  resources: [],
  policy: { overrides: {}, unavailableRoles: [] },
});

/**
 * Rol dizini ve izin politikası istemciye buradan verilir (dashboard düzeni). İstemcideki
 * can(...) çağrıları (örn. menü) böylece yöneticinin değiştirdiği izinleri görür.
 */
export function RolesProvider({
  roles,
  resources,
  policy,
  children,
}: {
  roles: RoleInfo[];
  resources: PermissionResourceRef[];
  policy: PermissionPolicy;
  children: ReactNode;
}) {
  setActivePermissionPolicy(policy);
  return <RolesContext.Provider value={{ roles, resources, policy }}>{children}</RolesContext.Provider>;
}

/** Kullanılabilir modüllerin izin kaynakları ve etkin politika (rol özeti, düzenleyici). */
export function usePermissionResources() {
  const { resources, policy } = useContext(RolesContext);
  return { resources, policy };
}

/** Rol etiketi ve rengi; bilinmeyen anahtar için anahtarın kendisi. */
export function useRoles() {
  const { roles } = useContext(RolesContext);
  const t = useTranslations();
  const find = (key: string) => roles.find((role) => role.key === key);
  const label = (key: string): string => {
    const info = find(key);
    if (!info) return t.has(`roles.${key}`) ? t(`roles.${key}`) : key;
    if (info.kind === "custom") return info.label ?? key;
    const labelKey = roleLabelKey(info);
    return labelKey && t.has(labelKey) ? t(labelKey) : key;
  };
  const color = (key: string): ChipColor => find(key)?.color ?? "default";
  return { roles, find, label, color };
}

export function RoleChip({ role, size = "sm", variant = "flat", className }: { role: string; size?: "sm" | "md"; variant?: "flat" | "dot" | "bordered"; className?: string }) {
  const { label, color, find } = useRoles();
  const unavailable = find(role)?.available === false;
  return (
    <Chip color={color(role)} size={size} variant={variant} className={`${unavailable ? "opacity-60 line-through" : ""} ${className ?? ""}`}>
      {label(role)}
    </Chip>
  );
}
