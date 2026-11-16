"use client";
import { statusStyle } from "@/shared/components/ui/status-appearance";
import {
  toast,
  Button,
  Chip,
  Spinner,
  Checkbox,
  Label,
  Modal,
  TextField,
  InputGroup,
  Input,
  FieldError,
  TextArea,
  Select,
  ListBox,
  Description,
} from "@heroui/react";

import { FieldClearButton } from "@/shared/components/forms/field-clear-button";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";
import { statusTone } from "@/shared/components/ui/status-appearance";

import { Lock, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import {
  RoleChip,
  usePermissionResources,
  useRoles,
  type PermissionResourceRef,
} from "@/shared/components/roles/roles-provider";
import {
  effectiveActions,
  PERMISSION_ACTIONS,
  type PermissionAction,
  type PermissionPolicy,
} from "@/shared/permissions/define";
import {
  CHIP_COLORS,
  LOCKED_ROLE,
  type ChipColor,
  type RoleInfo,
} from "@/shared/roles";

import {
  createRoleAction,
  deleteRoleAction,
  resetRoleGrantsAction,
  setRoleGrantAction,
  updateRoleAction,
} from "../actions/roles";

const KIND_ORDER: RoleInfo["kind"][] = ["system", "module", "custom"];
const DOT: Record<ChipColor, string> = {
  default: "bg-ink-400",
  primary: "bg-accent",
  secondary: "bg-secondary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

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
    module: (moduleKey: string) =>
      t.has(`${moduleKey}.module.label`)
        ? t(`${moduleKey}.module.label`)
        : moduleKey,
  };
}

/** Rol açıklaması: sistem → users.matrix.roles.<KEY>.shortDesc, modül → <modül>.roles.<KEY>.shortDesc, özel → kendi açıklaması. */
function useRoleDescription() {
  const t = useTranslations();
  return (role: RoleInfo | undefined) => {
    if (!role) return "";
    if (role.kind === "custom") return role.description ?? "";
    const key =
      role.kind === "system"
        ? `users.matrix.roles.${role.key}.shortDesc`
        : `${role.moduleKey}.roles.${role.key}.shortDesc`;
    return t.has(key) ? t(key) : "";
  };
}

/**
 * Roller ve İzinler: sol tarafta roller (sistem, modül, özel), sağda seçili rolün modül bazında
 * izinleri. Kaynaklar kurulu ve kullanılabilir tüm modüllerden otomatik gelir. Değişiklik anında
 * kaydedilir; koddaki varsayılandan farklı olanlar işaretlenir. Yönetici rolü kilitlidir.
 */
export function RolePermissionsMatrix({
  userCounts,
  canManage,
}: {
  userCounts: Record<string, number>;
  canManage: boolean;
}) {
  const t = useTranslations("users.roles");
  const tActions = useTranslations("users.matrix.actions");
  const router = useRouter();
  const { roles, label, find } = useRoles();
  const { resources, policy } = usePermissionResources();
  const text = useResourceText();
  const describe = useRoleDescription();

  const [selected, setSelected] = useState<string>(
    roles.find((role) => role.key !== LOCKED_ROLE)?.key ?? LOCKED_ROLE,
  );
  const [overrides, setOverrides] = useState<PermissionPolicy["overrides"]>(
    policy.overrides,
  );
  // Sunucudan yeni politika gelince (kaydet → yenile) yerel kopya eşitlenir (render sırasında ayarlama).
  const [syncedFrom, setSyncedFrom] = useState(policy.overrides);
  if (syncedFrom !== policy.overrides) {
    setSyncedFrom(policy.overrides);
    setOverrides(policy.overrides);
  }
  const [query, setQuery] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [editor, setEditor] = useState<{
    mode: "create" | "edit";
    role?: RoleInfo;
  } | null>(null);
  const [confirm, setConfirm] = useState<"delete" | "reset" | null>(null);

  const role = find(selected);
  const locked = selected === LOCKED_ROLE;
  const localPolicy: PermissionPolicy = { overrides, unavailableRoles: [] };

  const groups = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const map = new Map<string, PermissionResourceRef[]>();
    for (const ref of resources) {
      const haystack =
        `${text.module(ref.moduleKey)} ${text.label(ref)} ${text.description(ref)}`.toLocaleLowerCase();
      if (needle && !haystack.includes(needle)) continue;
      map.set(ref.moduleKey, [...(map.get(ref.moduleKey) ?? []), ref]);
    }
    return [...map.entries()].sort((a, b) =>
      text.module(a[0]).localeCompare(text.module(b[0])),
    );
  }, [resources, query, text]);

  const isCustomized = (ref: PermissionResourceRef) =>
    Boolean(overrides[selected]?.[ref.definition.resource]);
  const anyCustomized = Object.keys(overrides[selected] ?? {}).length > 0;
  const totalAllowed = resources.reduce(
    (sum, ref) =>
      sum + effectiveActions(selected, ref.definition, localPolicy).length,
    0,
  );

  const toggle = async (
    ref: PermissionResourceRef,
    action: PermissionAction,
    checked: boolean,
  ) => {
    const current = effectiveActions(selected, ref.definition, localPolicy);
    const next = PERMISSION_ACTIONS.filter((item) =>
      item === action ? checked : current.includes(item),
    );
    const previous = overrides;
    const defaults = ref.definition.grants[selected] ?? [];
    const isDefault =
      next.length === defaults.length &&
      next.every((item) => defaults.includes(item));
    const roleOverrides = { ...(overrides[selected] ?? {}) };
    if (isDefault) delete roleOverrides[ref.definition.resource];
    else roleOverrides[ref.definition.resource] = next;
    setOverrides({ ...overrides, [selected]: roleOverrides });
    setBusyKey(`${ref.definition.resource}:${action}`);
    const result = await setRoleGrantAction({
      role: selected,
      resource: ref.definition.resource,
      actions: next,
    });
    setBusyKey(null);
    if (!result.ok) {
      setOverrides(previous);
      toast(result.error, { variant: "danger" });
      return;
    }
    router.refresh();
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
      {/* Roller */}
      <aside className="flex flex-col gap-3">
        {canManage ? (
          <Button
            onPress={() => setEditor({ mode: "create" })}
            variant={actionVariant("primary", "flat")}
          >
            {<Plus className="h-4 w-4" aria-hidden />}
            {t("newRole")}
          </Button>
        ) : null}
        {KIND_ORDER.map((kind) => {
          const list = roles.filter((item) => item.kind === kind);
          if (!list.length) return null;
          return (
            <div key={kind} className="flex flex-col gap-1">
              <span className="px-1 text-xs font-semibold uppercase text-ink-400">
                {t(`kinds.${kind}`)}
              </span>
              {list.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSelected(item.key)}
                  className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                    item.key === selected
                      ? "bg-brand-50 font-semibold text-accent dark:bg-brand-500/15"
                      : "hover:bg-ink-100"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${DOT[item.color]}`}
                      aria-hidden
                    />
                    <span
                      className={`truncate ${item.available ? "" : "text-ink-400 line-through"}`}
                    >
                      {label(item.key)}
                    </span>
                    {item.key === LOCKED_ROLE ? (
                      <Lock
                        className="h-3 w-3 shrink-0 text-ink-400"
                        aria-label={t("locked")}
                      />
                    ) : null}
                  </span>
                  <span className="shrink-0 text-xs text-ink-400">
                    {userCounts[item.key] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          );
        })}
      </aside>

      {/* Seçili rolün izinleri */}
      <section className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-ink-200 bg-surface p-4">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <RoleChip role={selected} size="md" />
              <Chip
                size="sm"
                variant={"soft"}
                className={"border border-current"}
              >
                {role?.kind === "module"
                  ? t("kindModule", {
                      module: text.module(role.moduleKey ?? ""),
                    })
                  : t(`kind.${role?.kind ?? "system"}`)}
              </Chip>
              <span className="text-xs text-ink-500">
                {t("summary", {
                  users: userCounts[selected] ?? 0,
                  permissions: totalAllowed,
                })}
              </span>
            </div>
            <p className="text-sm text-ink-500">{describe(role)}</p>
            {role && !role.available ? (
              <p className="text-sm text-warning-600">{t("unavailable")}</p>
            ) : null}
            {locked ? (
              <p className="flex items-center gap-1 text-sm text-ink-500">
                <Lock className="h-3.5 w-3.5" aria-hidden />
                {t("lockedHint")}
              </p>
            ) : null}
          </div>
          {canManage && !locked ? (
            <div className="flex flex-wrap gap-2">
              {role?.kind === "custom" ? (
                <>
                  <Button
                    size="sm"
                    onPress={() => setEditor({ mode: "edit", role })}
                    variant={actionVariant("default", "flat")}
                  >
                    {<Pencil className="h-4 w-4" aria-hidden />}
                    {t("edit")}
                  </Button>
                  <Button
                    size="sm"
                    onPress={() => setConfirm("delete")}
                    variant={actionVariant("danger", "flat")}
                  >
                    {<Trash2 className="h-4 w-4" aria-hidden />}
                    {t("delete")}
                  </Button>
                </>
              ) : null}
              {anyCustomized && role?.kind !== "custom" ? (
                <Button
                  size="sm"
                  onPress={() => setConfirm("reset")}
                  variant={actionVariant("default", "flat")}
                >
                  {<RotateCcw className="h-4 w-4" aria-hidden />}
                  {t("reset")}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        <TextField
          value={query}
          aria-label={t("search")}
          onChange={setQuery}
          className={["w-full"].filter(Boolean).join(" ")}
        >
          <InputGroup>
            <InputGroup.Prefix>
              {<Search className="h-4 w-4 text-ink-400" aria-hidden />}
            </InputGroup.Prefix>
            <InputGroup.Input
              placeholder={t("search")}
              className={["h-9 text-sm"].filter(Boolean).join(" ")}
            />
            <InputGroup.Suffix>
              {query ? <FieldClearButton onPress={() => setQuery("")} /> : null}
            </InputGroup.Suffix>
          </InputGroup>
        </TextField>

        {groups.map(([moduleKey, refs]) => (
          <div
            key={moduleKey}
            className="overflow-hidden rounded-xl border border-ink-200 bg-surface"
          >
            <div className="border-b border-ink-100 bg-ink-50 px-4 py-2 text-sm font-semibold dark:bg-ink-100/40">
              {text.module(moduleKey)}
            </div>
            <div className="divide-y divide-ink-100">
              {refs.map((ref) => {
                const supported = ref.definition.grants[LOCKED_ROLE] ?? [];
                const allowed = effectiveActions(
                  selected,
                  ref.definition,
                  localPolicy,
                );
                return (
                  <div
                    key={ref.definition.resource}
                    className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        {text.label(ref)}
                        {isCustomized(ref) ? (
                          <Chip
                            size="sm"
                            color={"warning"}
                            variant={"soft"}
                            className={["h-5 text-[10px]"]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            {t("customized")}
                          </Chip>
                        ) : null}
                      </span>
                      <span className="text-xs text-ink-500">
                        {text.description(ref)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {PERMISSION_ACTIONS.filter((action) =>
                        supported.includes(action),
                      ).map((action) => (
                        <Checkbox
                          key={action}
                          isSelected={allowed.includes(action)}
                          isDisabled={!canManage || locked || busyKey !== null}
                          onChange={(checked) =>
                            void toggle(ref, action, checked)
                          }
                        >
                          <Checkbox.Content>
                            <Checkbox.Control className="size-4">
                              <Checkbox.Indicator />
                            </Checkbox.Control>
                            <Label>
                              <span className="text-sm">
                                {tActions(action)}
                              </span>
                            </Label>
                          </Checkbox.Content>
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
        message={
          confirm === "delete"
            ? t("deleteMessage", { role: label(selected) })
            : t("resetMessage", { role: label(selected) })
        }
        confirmLabel={confirm === "delete" ? t("delete") : t("reset")}
        confirmColor={confirm === "delete" ? "danger" : "warning"}
        onConfirm={async () => {
          const result =
            confirm === "delete"
              ? await deleteRoleAction({ key: selected })
              : await resetRoleGrantsAction({ role: selected });
          if (!result.ok) {
            toast(result.error, { variant: "danger" });
            return;
          }
          toast(confirm === "delete" ? t("deleted") : t("resetDone"), {
            variant: "success",
          });
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
    const payload = {
      label: labelValue,
      description: description || null,
      color,
    };
    const result =
      mode === "create"
        ? await createRoleAction({ ...payload, copyFrom: copyFrom || null })
        : await updateRoleAction({ ...payload, key: role?.key });
    setBusy(false);
    if (!result.ok) {
      setError(result.fieldErrors?.label?.[0] ?? result.error);
      return;
    }
    toast(mode === "create" ? t("created") : t("updated"), {
      variant: "success",
    });
    onSaved(
      mode === "create" &&
        result.data &&
        typeof result.data === "object" &&
        "key" in result.data
        ? String(result.data.key)
        : null,
    );
  };

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog className={"w-full max-w-md "}>
            <DialogDismissButton />

            <Modal.Header>
              <Modal.Heading className="flex items-center gap-2">
                {mode === "create" ? t("newRole") : t("editTitle")}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="gap-4">
              <TextField
                value={labelValue}
                isRequired
                isInvalid={Boolean(error)}
                onChange={setLabelValue}
                className={["w-full"].filter(Boolean).join(" ")}
              >
                <Label>{t("fields.label")}</Label>
                <Input placeholder={t("fields.labelPlaceholder")} />
                <FieldError>{error ?? undefined}</FieldError>
              </TextField>
              <TextField
                value={description}
                onChange={setDescription}
                className={["w-full"].filter(Boolean).join(" ")}
              >
                <Label>{t("fields.description")}</Label>
                <TextArea
                  placeholder={t("fields.descriptionPlaceholder")}
                  rows={2}
                  className={["[field-sizing:content]"]
                    .filter(Boolean)
                    .join(" ")}
                />
              </TextField>
              <div className="flex flex-col gap-2">
                <span className="text-sm">{t("fields.color")}</span>
                <div className="flex flex-wrap gap-2">
                  {CHIP_COLORS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setColor(option)}
                      aria-pressed={color === option}
                      className={`rounded-full p-0.5 ${color === option ? "ring-2 ring-accent" : ""}`}
                    >
                      <Chip
                        size="sm"
                        color={statusTone(option)}
                        variant={"soft"}
                        style={statusStyle(option)}
                      >
                        {labelValue || t("fields.sample")}
                      </Chip>
                    </button>
                  ))}
                </div>
              </div>
              {mode === "create" ? (
                <Select
                  placeholder={t("fields.copyFromNone")}
                  value={copyFrom ? copyFrom : null}
                  onChange={(selectedValue) => {
                    const keys =
                      selectedValue === null
                        ? undefined
                        : String(selectedValue);
                    return setCopyFrom(String(keys ?? ""));
                  }}
                >
                  <Label>{t("fields.copyFrom")}</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {roles.map((item) => (
                        <ListBox.Item
                          key={item.key}
                          id={item.key}
                          textValue={String(roleLabel(item.key))}
                        >
                          <Label>{roleLabel(item.key)}</Label>
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                  <Description>{t("fields.copyFromHint")}</Description>
                </Select>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              <Button
                onPress={onClose}
                variant={actionVariant("default", "flat")}
              >
                {t("cancel")}
              </Button>
              <Button
                isDisabled={labelValue.trim().length < 2}
                onPress={() => void submit()}
                variant={actionVariant("primary", "solid")}
                isPending={busy}
              >
                {busy ? <Spinner size="sm" color="current" /> : null}
                {t("save")}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

/** Kullanıcı formunda seçili rolün modül bazında özeti (Tam / Okuma / Yok). */
export function RolePermissionsPreview({ role }: { role: string }) {
  const t = useTranslations("users.matrix");
  const { resources, policy } = usePermissionResources();
  const text = useResourceText();
  const byModule = new Map<string, PermissionAction[]>();
  for (const ref of resources)
    byModule.set(ref.moduleKey, [
      ...(byModule.get(ref.moduleKey) ?? []),
      ...effectiveActions(role, ref.definition, policy),
    ]);
  const entries = [...byModule.entries()].sort((a, b) =>
    text.module(a[0]).localeCompare(text.module(b[0])),
  );
  if (!role) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([moduleKey, actions]) => {
        const write = actions.some((action) => action !== "view");
        const view = actions.includes("view");
        return (
          <Chip
            key={moduleKey}
            size="sm"
            color={statusTone(write ? "success" : view ? "primary" : "default")}
            variant={"soft"}
            className={[write || view ? "" : "text-ink-400"]
              .filter(Boolean)
              .join(" ")}
            style={statusStyle(
              write ? "success" : view ? "primary" : "default",
            )}
          >
            {text.module(moduleKey)}:{" "}
            {t(write ? "accessFull" : view ? "accessRead" : "accessNone")}
          </Chip>
        );
      })}
    </div>
  );
}
