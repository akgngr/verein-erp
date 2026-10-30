"use client";

import { addToast, Button, Checkbox } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { setAiAreasAction } from "../actions/consent-actions";

/**
 * Asistanın izinleri: her satır ayrı açılıp kapatılır. Varsayılan hepsi kapalıdır.
 * Kapalı izinlerin araçları modele hiç sunulmaz.
 */
export function AreasChecklist({ areas, enabled, canChange }: { areas: string[]; enabled: string[]; canChange: boolean }) {
  const t = useTranslations("ai.settings");
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set(enabled));
  const [busy, setBusy] = useState(false);
  const dirty = selected.size !== enabled.length || enabled.some((area) => !selected.has(area));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col divide-y divide-default-100 rounded-medium border border-default-200 bg-content1">
        {areas.map((area) => (
          <div key={area} className="flex items-start gap-3 p-3">
            <Checkbox
              aria-label={t(`areaItems.${area}.label`)}
              isSelected={selected.has(area)}
              isDisabled={!canChange}
              onValueChange={(checked) => {
                const next = new Set(selected);
                if (checked) next.add(area);
                else next.delete(area);
                setSelected(next);
              }}
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-small font-medium">{t(`areaItems.${area}.label`)}</span>
              <span className="text-tiny text-default-500">{t(`areaItems.${area}.help`)}</span>
            </div>
          </div>
        ))}
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
            const result = await setAiAreasAction({ areas: [...selected] });
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
