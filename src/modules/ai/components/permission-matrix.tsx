"use client";

import { addToast, Button, Checkbox, Chip, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { AlertTriangle, CheckCheck, Info, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";

import { setAiPermissionsAction } from "../actions/consent-actions";

type Operation = "read" | "create" | "update" | "delete";
const OPERATIONS: Operation[] = ["read", "create", "update", "delete"];

/**
 * Kişisel veriye yakın modüller: bu modüllerde HER izin ve diğer modüllerde güncelleme/silme
 * işaretlenirken onay istenir. Okuma izni verilse bile araçlar kişisel veri döndürmez.
 */
const SENSITIVE_MODULES = new Set(["members", "students", "progress", "accounting", "donations", "courses"]);
const isRisky = (module: string, operation: Operation) => operation === "update" || operation === "delete" || SENSITIVE_MODULES.has(module);

/** İzin çipinin rengi: açık izinler işlem türüne göre renkli, kapalılar gri. */
const CHIP_COLOR: Record<Operation, "primary" | "success" | "warning" | "danger"> = { read: "primary", create: "success", update: "warning", delete: "danger" };

export type PermissionModule = { key: string; label: string; description: string; icon: ReactNode; availability: "available" | "inactive" | "needsApproval" };

type Matrix = Record<string, Operation[]>;

/**
 * Asistan izinleri: kompakt modül kartları (ikon, ad, kısa açıklama, izin çipleri). Karta
 * tıklayınca modal açılır; izinler orada işaretlenir. Riskli izinler ayrıca onay ister.
 * Varsayılan hepsi kapalıdır (yönetici seçer).
 */
export function PermissionMatrix({
  modules,
  supported,
  matrix,
  canChange,
}: {
  modules: PermissionModule[];
  supported: Matrix;
  matrix: Matrix;
  canChange: boolean;
}) {
  const t = useTranslations("ai.settings.matrix");
  const router = useRouter();
  const [saved, setSaved] = useState<Matrix>(matrix);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<Operation[]>([]);
  const [pendingRisk, setPendingRisk] = useState<{ ops: Operation[]; message: string } | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [busy, setBusy] = useState(false);

  const withTools = modules.filter((module) => (supported[module.key] ?? []).length > 0);
  const withoutTools = modules.filter((module) => !(supported[module.key] ?? []).length);
  const open = modules.find((module) => module.key === openKey) ?? null;
  const openSupported = open ? (supported[open.key] ?? []) : [];

  const save = async (next: Matrix): Promise<boolean> => {
    setBusy(true);
    const result = await setAiPermissionsAction({ matrix: next });
    setBusy(false);
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return false;
    }
    setSaved(next);
    addToast({ title: t("saved"), color: "success" });
    router.refresh();
    return true;
  };

  const openModule = (key: string) => {
    setDraft(saved[key] ?? []);
    setOpenKey(key);
  };

  /** İşaretleme: riskli bir izin AÇILIYORSA önce onay. */
  const toggle = (operation: Operation, checked: boolean) => {
    if (!open) return;
    if (checked && isRisky(open.key, operation)) {
      setPendingRisk({ ops: [operation], message: riskMessage(open, [operation]) });
      return;
    }
    setDraft(apply(draft, [operation], checked));
  };

  const selectAll = () => {
    if (!open) return;
    const missing = openSupported.filter((op) => !draft.includes(op));
    const risky = missing.filter((op) => isRisky(open.key, op));
    if (risky.length) setPendingRisk({ ops: missing, message: riskMessage(open, risky) });
    else setDraft(apply(draft, missing, true));
  };

  const riskMessage = (module: PermissionModule, ops: Operation[]) => {
    const names = ops.map((op) => t(`operations.${op}`)).join(", ");
    return SENSITIVE_MODULES.has(module.key) ? t("risk.sensitive", { module: module.label, operations: names }) : t("risk.write", { module: module.label, operations: names });
  };

  const allSupported: Matrix = Object.fromEntries(withTools.map((module) => [module.key, [...(supported[module.key] ?? [])]]));

  return (
    <div className="flex flex-col gap-3">
      {canChange ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="flat" color="primary" startContent={<CheckCheck className="h-4 w-4" aria-hidden />} isDisabled={busy} onPress={() => setConfirmAll(true)}>
            {t("allowAll")}
          </Button>
          <Button size="sm" variant="flat" startContent={<XCircle className="h-4 w-4" aria-hidden />} isDisabled={busy} onPress={() => void save({})}>
            {t("denyAll")}
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {withTools.map((module) => {
          const available = supported[module.key] ?? [];
          const allowed = saved[module.key] ?? [];
          return (
            <button
              key={module.key}
              type="button"
              onClick={() => openModule(module.key)}
              className="flex flex-col gap-3 rounded-large border border-default-200 bg-content1 p-4 text-left transition hover:border-primary hover:shadow-medium focus-visible:outline-2 focus-visible:outline-primary"
            >
              <ModuleHead module={module} />
              {module.availability !== "available" ? <ModuleStatus availability={module.availability} /> : null}
              <div className="flex flex-wrap gap-1.5">
                {OPERATIONS.filter((op) => available.includes(op)).map((op) => {
                  // Modül kullanılamıyorsa izin açık olsa da etkin değildir: gri ve üstü çizili.
                  const on = allowed.includes(op) && module.availability === "available";
                  const pausedOn = allowed.includes(op) && module.availability !== "available";
                  return (
                    <Chip key={op} size="sm" variant={on ? "flat" : "bordered"} color={on ? CHIP_COLOR[op] : "default"} className={on ? "" : pausedOn ? "text-default-400 line-through" : "text-default-400"}>
                      {t(`short.${op}`)}
                    </Chip>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>

      {withoutTools.length ? (
        <p className="text-tiny text-default-400">{t("noToolsList", { modules: withoutTools.map((module) => module.label).join(", ") })}</p>
      ) : null}

      <Modal isOpen={open !== null} onOpenChange={(isOpen) => !isOpen && setOpenKey(null)} size="lg" scrollBehavior="inside">
        <ModalContent>
          {(close) =>
            open ? (
              <>
                <ModalHeader className="pb-2">
                  <ModuleHead module={open} />
                </ModalHeader>
                <ModalBody className="gap-4">
                  {open.availability !== "available" ? <ModuleStatus availability={open.availability} detailed /> : null}
                  <div className="flex gap-2 rounded-medium bg-default-100 p-3 text-small text-default-600">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <div className="flex flex-col gap-1">
                      <span>{t("notes.noPersonal")}</span>
                      <span>{t("notes.confirmCard")}</span>
                      {SENSITIVE_MODULES.has(open.key) ? <span className="font-medium text-warning-600">{t("notes.sensitive")}</span> : null}
                    </div>
                  </div>
                  <div className="flex flex-col divide-y divide-default-100">
                    {openSupported.map((op) => (
                      <Checkbox key={op} isSelected={draft.includes(op)} isDisabled={!canChange} onValueChange={(checked) => toggle(op, checked)} color={CHIP_COLOR[op]} className="max-w-none py-2.5" classNames={{ label: "w-full" }}>
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1.5 text-small font-medium">
                            {t(`operations.${op}`)}
                            {isRisky(open.key, op) ? <AlertTriangle className="h-3.5 w-3.5 text-warning" aria-label={t("riskBadge")} /> : null}
                          </span>
                          <span className="text-tiny text-default-500">{t(`explain.${op}`)}</span>
                        </div>
                      </Checkbox>
                    ))}
                  </div>
                </ModalBody>
                <ModalFooter className="justify-between">
                  {canChange ? (
                    <Button size="sm" variant="light" onPress={selectAll}>
                      {t("selectAll")}
                    </Button>
                  ) : (
                    <span />
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="flat" onPress={close}>
                      {t("cancel")}
                    </Button>
                    {canChange ? (
                      <Button
                        size="sm"
                        color="primary"
                        isLoading={busy}
                        isDisabled={sameOps(draft, saved[open.key] ?? [])}
                        onPress={async () => {
                          if (await save({ ...saved, [open.key]: OPERATIONS.filter((op) => draft.includes(op)) })) close();
                        }}
                      >
                        {t("save")}
                      </Button>
                    ) : null}
                  </div>
                </ModalFooter>
              </>
            ) : null
          }
        </ModalContent>
      </Modal>

      <ConfirmDialog
        isOpen={pendingRisk !== null}
        onOpenChange={(isOpen) => !isOpen && setPendingRisk(null)}
        title={t("risk.title")}
        message={pendingRisk?.message ?? ""}
        confirmLabel={t("risk.confirm")}
        confirmColor="warning"
        onConfirm={async () => {
          if (pendingRisk) setDraft(apply(draft, pendingRisk.ops, true));
        }}
      />
      <ConfirmDialog
        isOpen={confirmAll}
        onOpenChange={setConfirmAll}
        title={t("allowAllTitle")}
        message={t("allowAllMessage")}
        confirmLabel={t("allowAll")}
        confirmColor="warning"
        onConfirm={async () => {
          await save(allSupported);
        }}
      />
    </div>
  );
}

/** Modül kullanılamıyorsa: neden ve nereden açılacağı (Modül Yönetimi). */
function ModuleStatus({ availability, detailed = false }: { availability: "inactive" | "needsApproval"; detailed?: boolean }) {
  const t = useTranslations("ai.settings.matrix.status");
  return (
    <div className="flex items-start gap-2 rounded-medium bg-warning-50 p-2 text-tiny text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>
        {t(availability)}
        {detailed ? (
          <>
            {" "}
            <a href="/ayarlar/moduller" className="font-medium underline">
              {t("link")}
            </a>
          </>
        ) : null}
      </span>
    </div>
  );
}

function ModuleHead({ module }: { module: PermissionModule }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-medium bg-primary-50 text-primary dark:bg-primary-500/15 [&_svg]:h-5 [&_svg]:w-5">{module.icon}</span>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-small font-semibold">{module.label}</span>
        <span className="line-clamp-1 text-tiny font-normal text-default-500">{module.description}</span>
      </div>
    </div>
  );
}

const apply = (current: Operation[], ops: Operation[], on: boolean) => OPERATIONS.filter((op) => (ops.includes(op) ? on : current.includes(op)));
const sameOps = (a: Operation[], b: Operation[]) => OPERATIONS.every((op) => a.includes(op) === b.includes(op));
