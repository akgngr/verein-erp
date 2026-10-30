"use client";

import { addToast, Button, Radio, RadioGroup } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { setAiPermissionsAction } from "../actions/consent-actions";

type Operation = "read" | "create" | "update" | "delete";
const OPERATIONS: Operation[] = ["read", "create", "update", "delete"];

/**
 * Modül bazında izin matrisi: her modül için okuma / oluşturma / güncelleme / silme ayrı ayrı
 * "İzin ver / İzin verme". Asistanın aracı olmayan işlemler seçilemez ve öyle belirtilir.
 * Varsayılan hepsi "İzin verme".
 */
export function PermissionMatrix({
  modules,
  supported,
  matrix,
  canChange,
}: {
  modules: { key: string; label: string }[];
  supported: Record<string, Operation[]>;
  matrix: Record<string, Operation[]>;
  canChange: boolean;
}) {
  const t = useTranslations("ai.settings");
  const router = useRouter();
  const [state, setState] = useState<Record<string, Operation[]>>(matrix);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(state) !== JSON.stringify(matrix);

  const set = (module: string, operation: Operation, allow: boolean) => {
    const current = new Set(state[module] ?? []);
    if (allow) current.add(operation);
    else current.delete(operation);
    setState({ ...state, [module]: OPERATIONS.filter((op) => current.has(op)) });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {modules.map((module) => {
          const available = supported[module.key] ?? [];
          return (
            <div key={module.key} className="flex flex-col gap-2 rounded-medium border border-default-200 bg-content1 p-4">
              <span className="text-small font-semibold">{module.label}</span>
              {available.length === 0 ? <span className="text-tiny text-default-400">{t("matrix.noTools")}</span> : null}
              <div className="flex flex-col divide-y divide-default-100">
                {OPERATIONS.map((operation) => {
                  const isSupported = available.includes(operation);
                  const allowed = state[module.key]?.includes(operation) ?? false;
                  return (
                    <div key={operation} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                      <span className={isSupported ? "text-small" : "text-small text-default-400"}>{t(`matrix.operations.${operation}`)}</span>
                      {isSupported ? (
                        <RadioGroup
                          aria-label={`${module.label} – ${t(`matrix.operations.${operation}`)}`}
                          orientation="horizontal"
                          size="sm"
                          value={allowed ? "allow" : "deny"}
                          isDisabled={!canChange}
                          onValueChange={(value) => set(module.key, operation, value === "allow")}
                        >
                          <Radio value="allow">{t("matrix.allow")}</Radio>
                          <Radio value="deny">{t("matrix.deny")}</Radio>
                        </RadioGroup>
                      ) : (
                        <span className="text-tiny text-default-400">{t("matrix.unsupported")}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {canChange ? (
        <Button
          size="sm"
          color="primary"
          className="self-start"
          isDisabled={!dirty}
          isLoading={busy}
          onPress={async () => {
            setBusy(true);
            const result = await setAiPermissionsAction({ matrix: state });
            setBusy(false);
            if (!result.ok) return void addToast({ title: result.error, color: "danger" });
            addToast({ title: t("areasSaved"), color: "success" });
            router.refresh();
          }}
        >
          {t("areasSave")}
        </Button>
      ) : null}
    </div>
  );
}
