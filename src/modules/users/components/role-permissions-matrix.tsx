"use client";

import {
  addToast,
  Button,
  Checkbox,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Textarea,
} from "@heroui/react";
import { Lock, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { RoleChip, usePermissionResources, useRoles, type PermissionResourceRef } from "@/shared/components/roles/roles-provider";
import { effectiveActions, PERMISSION_ACTIONS, type PermissionAction, type PermissionPolicy } from "@/shared/permissions/define";
import { CHIP_COLORS, LOCKED_ROLE, type ChipColor, type RoleInfo } from "@/shared/roles";

import { createRoleAction, deleteRoleAction, resetRoleGrantsAction, setRoleGrantAction, updateRoleAction } from "../actions/roles";

const KIND_ORDER: RoleInfo["kind"][] = ["system", "module", "custom"];
const DOT: Record<ChipColor, string> = { default: "bg-default-400", primary: "bg-primary", secondary: "bg-secondary", success: "bg-success", warning: "bg-warning", danger: "bg-danger" };

/** Kaynak etiketi: modülün kendi mesajları → permissions.<kaynak>.label/description. */
function useResourceText() {
  const t = useTranslations();
  return {
    label: (ref: PermissionResourceRef) => {
      const key = `${ref.moduleKey}.permissions.${ref.definition.resource}.label`;
      return t.has(key) ? t(key) : ref.definition.resource;
    },
    description: (ref: PermissionResourceRef) => {
      const key = `${ref.moduleKey}.permissions.${ref.definition.resource}.description`;
      return t.has(key) ? t(key) : "";
    },
    module: (moduleKey: string) => (t.has(`${moduleKey}.module.label`) ? t(`${moduleKey}.module.label`) : moduleKey),
  };
}

/** Rol açıklaması: sistem → users.matrix.roles.<KEY>.shortDesc, modül → <modül>.roles.<KEY>.shortDesc, özel → kendi açıklaması. */
function useRoleDescription() {
  const t = useTranslations();
  return (role: RoleInfo | undefined) => {
    if (!role) return "";
    if (role.kind === "custom") return role.description ?? "";
    const key = role.kind === "system" ? `users.matrix.roles.${role.key}.shortDesc` : `${role.moduleKey}.roles.${role.key}.shortDesc`;
    return t.has(key) ? t(key) : "";
  };
}

/**
 * Roller ve İzinler: sol tarafta roller (sistem, modül, özel), sağda seçili rolün modül bazında
 * izinleri. Kaynaklar kurulu ve kullanılabilir tüm modüllerden otomatik gelir. Değişiklik anında
 * kaydedilir; koddaki varsayılandan farklı olanlar işaretlenir. Yönetici rolü kilitlidir.
 */
export function RolePermissionsMatrix({ userCounts, canManage }: { userCounts: Record<string, number>; canManage: boolean }) {
  const t = useTranslations("users.roles");
  const tActions = useTranslations("users.matrix.actions");
  const router = useRouter();
  const { roles, label, find } = useRoles();
  const { resources, policy } = usePermissionResources();
  const text = useResourceText();
  const describe = useRoleDescription();

  const [selected, setSelected] = useState<string>(roles.find((role) => role.key !== LOCKED_ROLE)?.key ?? LOCKED_ROLE);
  const [overrides, setOverrides] = useState<PermissionPolicy["overrides"]>(policy.overrides);
  // Sunucudan yeni politika gelince (kaydet → yenile) yerel kopya eşitlenir (render sırasında ayarlama).
  const [syncedFrom, setSyncedFrom] = useState(policy.overrides);
  if (syncedFrom !== policy.overrides) {
    setSyncedFrom(policy.overrides);
    setOverrides(policy.overrides);
  }
  const [query, setQuery] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ mode: "create" | "edit"; role?: RoleInfo } | null>(null);
  const [confirm, setConfirm] = useState<"delete" | "reset" | null>(null);

  const role = find(selected);
  const locked = selected === LOCKED_ROLE;
  const localPolicy: PermissionPolicy = { overrides, unavailableRoles: [] };

  const groups = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const map = new Map<string, PermissionResourceRef[]>();
    for (const ref of resources) {
      const haystack = `${text.module(ref.moduleKey)} ${text.label(ref)} ${text.description(ref)}`.toLocaleLowerCase();
      if (needle && !haystack.includes(needle)) continue;
      map.set(ref.moduleKey, [...(map.get(ref.moduleKey) ?? []), ref]);
    }
    return [...map.entries()].sort((a, b) => text.module(a[0]).localeCompare(text.module(b[0])));
  }, [resources, query, text]);

  const isCustomized = (ref: PermissionResourceRef) => Boolean(overrides[selected]?.[ref.definition.resource]);
  const anyCustomized = Object.keys(overrides[selected] ?? {}).length > 0;
  const totalAllowed = resources.reduce((sum, ref) => sum + effectiveActions(selected, ref.definition, localPolicy).length, 0);

  const toggle = async (ref: PermissionResourceRef, action: PermissionAction, checked: boolean) => {
    const current = effectiveActions(selected, ref.definition, localPolicy);
    const next = PERMISSION_ACTIONS.filter((item) => (item === action ? checked : current.includes(item)));
    const previous = overrides;
    const defaults = ref.definition.grants[selected] ?? [];
    const isDefault = next.length === defaults.length && next.every((item) => defaults.includes(item));
    const roleOverrides = { ...(overrides[selected] ?? {}) };
    if (isDefault) delete roleOverrides[ref.definition.resource];
    else roleOverrides[ref.definition.resource] = next;
    setOverrides({ ...overrides, [selected]: roleOverrides });
    setBusyKey(`${ref.definition.resource}:${action}`);
    const result = await setRoleGrantAction({ role: selected, resource: ref.definition.resource, actions: next });
    setBusyKey(null);
    if (!result.ok) {
      setOverrides(previous);
      addToast({ title: result.error, color: "danger" });
      return;
    }
    router.refresh();
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
      {/* Roller */}
      <aside className="flex flex-col gap-3">
        {canManage ? (
          <Button color="primary" variant="flat" startContent={<Plus className="h-4 w-4" aria-hidden />} onPress={() => setEditor({ mode: "create" })}>
            {t("newRole")}
          </Button>
        ) : null}
        {KIND_ORDER.map((kind) => {
          const list = roles.filter((item) => item.kind === kind);
          if (!list.length) return null;
          return (
            <div key={kind} className="flex flex-col gap-1">
              <span className="px-1 text-tiny font-semibold uppercase text-default-400">{t(`kinds.${kind}`)}</span>
              {list.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSelected(item.key)}
                  className={`flex items-center justify-between gap-2 rounded-medium px-3 py-2 text-left text-small transition ${
                    item.key === selected ? "bg-primary-50 font-semibold text-primary dark:bg-primary-500/15" : "hover:bg-default-100"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[item.color]}`} aria-hidden />
                    <span className={`truncate ${item.available ? "" : "text-default-400 line-through"}`}>{label(item.key)}</span>
                    {item.key === LOCKED_ROLE ? <Lock className="h-3 w-3 shrink-0 text-default-400" aria-label={t("locked")} /> : null}
                  </span>
                  <span className="shrink-0 text-tiny text-default-400">{userCounts[item.key] ?? 0}</span>
                </button>
              ))}
            </div>
          );
        })}
      </aside>

      {/* Seçili rolün izinleri */}
      <section className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-large border border-default-200 bg-content1 p-4">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <RoleChip role={selected} size="md" />
              <Chip size="sm" variant="bordered">
                {role?.kind === "module" ? t("kindModule", { module: text.module(role.moduleKey ?? "") }) : t(`kind.${role?.kind ?? "system"}`)}
              </Chip>
              <span className="text-tiny text-default-500">{t("summary", { users: userCounts[selected] ?? 0, permissions: totalAllowed })}</span>
            </div>
            <p className="text-small text-default-500">{describe(role)}</p>
            {role && !role.available ? <p className="text-small text-warning-600">{t("unavailable")}</p> : null}
            {locked ? <p className="flex items-center gap-1 text-small text-default-500"><Lock className="h-3.5 w-3.5" aria-hidden />{t("lockedHint")}</p> : null}
          </div>
          {canManage && !locked ? (
            <div className="flex flex-wrap gap-2">
              {role?.kind === "custom" ? (
                <>
                  <Button size="sm" variant="flat" startContent={<Pencil className="h-4 w-4" aria-hidden />} onPress={() => setEditor({ mode: "edit", role })}>
                    {t("edit")}
                  </Button>
                  <Button size="sm" variant="flat" color="danger" startContent={<Trash2 className="h-4 w-4" aria-hidden />} onPress={() => setConfirm("delete")}>
                    {t("delete")}
                  </Button>
                </>
              ) : null}
              {anyCustomized && role?.kind !== "custom" ? (
                <Button size="sm" variant="flat" startContent={<RotateCcw className="h-4 w-4" aria-hidden />} onPress={() => setConfirm("reset")}>
                  {t("reset")}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        <Input
          size="sm"
          value={query}
          onValueChange={setQuery}
          placeholder={t("search")}
          aria-label={t("search")}
          startContent={<Search className="h-4 w-4 text-default-400" aria-hidden />}
          isClearable
          onClear={() => setQuery("")}
        />

        {groups.map(([moduleKey, refs]) => (
          <div key={moduleKey} className="overflow-hidden rounded-large border border-default-200 bg-content1">
            <div className="border-b border-default-100 bg-default-50 px-4 py-2 text-small font-semibold dark:bg-default-100/40">{text.module(moduleKey)}</div>
            <div className="divide-y divide-default-100">
              {refs.map((ref) => {
                const supported = ref.definition.grants[LOCKED_ROLE] ?? [];
                const allowed = effectiveActions(selected, ref.definition, localPolicy);
                return (
                  <div key={ref.definition.resource} className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 flex-col">
                      <span className="flex items-center gap-2 text-small font-medium">
                        {text.label(ref)}
                        {isCustomized(ref) ? (
                          <Chip size="sm" variant="flat" color="warning" className="h-5 text-[10px]">
                            {t("customized")}
                          </Chip>
                        ) : null}
                      </span>
                      <span className="text-tiny text-default-500">{text.description(ref)}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {PERMISSION_ACTIONS.filter((action) => supported.includes(action)).map((action) => (
                        <Checkbox
                          key={action}
                          size="sm"
                          isSelected={allowed.includes(action)}
                          isDisabled={!canManage || locked || busyKey !== null}
                          onValueChange={(checked) => void toggle(ref, action, checked)}
                          color={action === "delete" ? "danger" : action === "approve" ? "warning" : "primary"}
                        >
                          <span className="text-small">{tActions(action)}</span>
                        </Checkbox>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {editor ? (
        <RoleEditor
          mode={editor.mode}
          role={editor.role}
          roles={roles}
          roleLabel={label}
          onClose={() => setEditor(null)}
          onSaved={(key) => {
            setEditor(null);
            if (key) setSelected(key);
            router.refresh();
          }}
        />
      ) : null}

      <ConfirmDialog
        isOpen={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm === "delete" ? t("deleteTitle") : t("resetTitle")}
        message={confirm === "delete" ? t("deleteMessage", { role: label(selected) }) : t("resetMessage", { role: label(selected) })}
        confirmLabel={confirm === "delete" ? t("delete") : t("reset")}
        confirmColor={confirm === "delete" ? "danger" : "warning"}
        onConfirm={async () => {
          const result = confirm === "delete" ? await deleteRoleAction({ key: selected }) : await resetRoleGrantsAction({ role: selected });
          if (!result.ok) {
            addToast({ title: result.error, color: "danger" });
            return;
          }
          addToast({ title: confirm === "delete" ? t("deleted") : t("resetDone"), color: "success" });
          if (confirm === "delete") setSelected(LOCKED_ROLE);
          else setOverrides({ ...overrides, [selected]: {} });
          setConfirm(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function RoleEditor({
  mode,
  role,
  roles,
  roleLabel,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  role?: RoleInfo;
  roles: RoleInfo[];
  roleLabel: (key: string) => string;
  onClose: () => void;
  onSaved: (key: string | null) => void;
}) {
  const t = useTranslations("users.roles");
  const [labelValue, setLabelValue] = useState(role?.label ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [color, setColor] = useState<ChipColor>(role?.color ?? "secondary");
  const [copyFrom, setCopyFrom] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const payload = { label: labelValue, description: description || null, color };
    const result = mode === "create" ? await createRoleAction({ ...payload, copyFrom: copyFrom || null }) : await updateRoleAction({ ...payload, key: role?.key });
    setBusy(false);
    if (!result.ok) {
      setError(result.fieldErrors?.label?.[0] ?? result.error);
      return;
    }
    addToast({ title: mode === "create" ? t("created") : t("updated"), color: "success" });
    onSaved(mode === "create" && result.data && typeof result.data === "object" && "key" in result.data ? String(result.data.key) : null);
  };

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()} size="md">
      <ModalContent>
        <ModalHeader>{mode === "create" ? t("newRole") : t("editTitle")}</ModalHeader>
        <ModalBody className="gap-4">
          <Input label={t("fields.label")} labelPlacement="outside" placeholder={t("fields.labelPlaceholder")} value={labelValue} onValueChange={setLabelValue} isRequired errorMessage={error ?? undefined} isInvalid={Boolean(error)} />
          <Textarea label={t("fields.description")} labelPlacement="outside" placeholder={t("fields.descriptionPlaceholder")} value={description} onValueChange={setDescription} minRows={2} />
          <div className="flex flex-col gap-2">
            <span className="text-small">{t("fields.color")}</span>
            <div className="flex flex-wrap gap-2">
              {CHIP_COLORS.map((option) => (
                <button key={option} type="button" onClick={() => setColor(option)} aria-pressed={color === option} className={`rounded-full p-0.5 ${color === option ? "ring-2 ring-primary" : ""}`}>
                  <Chip size="sm" variant="flat" color={option}>
                    {labelValue || t("fields.sample")}
                  </Chip>
                </button>
              ))}
            </div>
          </div>
          {mode === "create" ? (
            <Select
              label={t("fields.copyFrom")}
              labelPlacement="outside"
              placeholder={t("fields.copyFromNone")}
              description={t("fields.copyFromHint")}
              selectedKeys={copyFrom ? [copyFrom] : []}
              onSelectionChange={(keys) => setCopyFrom(String([...keys][0] ?? ""))}
            >
              {roles.map((item) => (
                <SelectItem key={item.key}>{roleLabel(item.key)}</SelectItem>
              ))}
            </Select>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>
            {t("cancel")}
          </Button>
          <Button color="primary" isLoading={busy} isDisabled={labelValue.trim().length < 2} onPress={() => void submit()}>
            {t("save")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

/** Kullanıcı formunda seçili rolün modül bazında özeti (Tam / Okuma / Yok). */
export function RolePermissionsPreview({ role }: { role: string }) {
  const t = useTranslations("users.matrix");
  const { resources, policy } = usePermissionResources();
  const text = useResourceText();
  const byModule = new Map<string, PermissionAction[]>();
  for (const ref of resources) byModule.set(ref.moduleKey, [...(byModule.get(ref.moduleKey) ?? []), ...effectiveActions(role, ref.definition, policy)]);
  const entries = [...byModule.entries()].sort((a, b) => text.module(a[0]).localeCompare(text.module(b[0])));
  if (!role) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([moduleKey, actions]) => {
        const write = actions.some((action) => action !== "view");
        const view = actions.includes("view");
        return (
          <Chip key={moduleKey} size="sm" variant="flat" color={write ? "success" : view ? "primary" : "default"} className={write || view ? "" : "text-default-400"}>
            {text.module(moduleKey)}: {t(write ? "accessFull" : view ? "accessRead" : "accessNone")}
          </Chip>
        );
      })}
    </div>
  );
}
