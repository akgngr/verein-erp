"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/components/kit";
import { applyPrivacyPresetAction, previewPrivacyPresetAction } from "../actions/egress-actions";
import { PRIVACY_PRESET_IDS, type PrivacyPresetId, type PrivacyPresetPreview } from "../services/privacy-presets-core";

type Props = { idPrefix?: string; canManage: boolean };

export function PrivacyPresetsPanel({ idPrefix = "system-privacy-presets", canManage }: Props) {
  const t = useTranslations("system.privacyUi");
  const [selected, setSelected] = useState<PrivacyPresetId>("Standard");
  const [preview, setPreview] = useState<PrivacyPresetPreview | null>(null);
  const [approved, setApproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const seq = ++requestId.current;
    let mounted = true;
    // Load the server preview; selection changes reset state in their event handler.
    void previewPrivacyPresetAction({ presetId: selected })
      .then((result) => {
        if (!mounted || requestId.current !== seq) return;
        if (result.ok) setPreview(result.data);
        else setError(true);
      })
      .catch(() => {
        if (mounted && requestId.current === seq) setError(true);
      })
      .finally(() => {
        if (mounted && requestId.current === seq) setLoading(false);
      });
    return () => { mounted = false; };
  }, [selected]);

  async function apply() {
    if (!canManage || !approved || !preview || loading || saving || error) return;
    setSaving(true);
    setError(false);
    try {
      // The server owns authorization, validation and audit; UI approval is explicit.
      const result = await applyPrivacyPresetAction({ presetId: preview.presetId, approved: true });
      if (!result.ok) { setError(true); return; }
      setApproved(false);
      setSaved(true);
      // Force a fresh preview of effective module states after the mutation.
      setPreview(null);
      const refreshed = await previewPrivacyPresetAction({ presetId: selected });
      if (refreshed.ok) setPreview(refreshed.data);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-5" aria-label={t("title")}>
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-6 space-y-3">
        <label htmlFor={`${idPrefix}-preset`} className="block text-sm font-semibold text-foreground">
          {t("choose")}
        </label>
        <select
          id={`${idPrefix}-preset`}
          value={selected}
          onChange={(event) => {
            setApproved(false);
            setPreview(null);
            setError(false);
            setSaved(false);
            setLoading(true);
            setSelected(event.target.value as PrivacyPresetId);
          }}
          disabled={saving}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground sm:max-w-sm"
        >
          {PRIVACY_PRESET_IDS.map((presetId) => (
            <option key={presetId} value={presetId}>{t(`presets.${presetId}.label`)}</option>
          ))}
        </select>
        <p className="text-sm text-secondary">{t(`presets.${selected}.description`)}</p>
        {loading && <p role="status" className="text-sm text-secondary">{t("loading")}</p>}
        {error && <p role="alert" className="text-sm text-danger">{t("error")}</p>}
        {saved && !loading && !error && <p role="status" className="text-sm text-success">{t("saved")}</p>}
      </div>

      {preview && !loading && (
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-6 space-y-3">
            <h2 className="text-lg font-semibold">{t("diffTitle")}</h2>
            <p className="text-sm text-secondary">
              {t("current")}: {preview.currentPresetId ?? t("none")} · {t("target")}: {t(`presets.${preview.presetId}.label`)}
            </p>
            <p className="text-sm text-secondary">{t("changeCount", { count: preview.changedModuleCount })}</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[440px] text-sm text-left">
                <thead><tr className="border-b border-border">
                  <th scope="col" className="p-2">{t("module")}</th>
                  <th scope="col" className="p-2">{t("before")}</th>
                  <th scope="col" className="p-2">{t("after")}</th>
                </tr></thead>
                <tbody>{preview.moduleChanges.map((item) => (
                  <tr key={item.moduleKey} className={item.changed ? "border-b border-border bg-warning/5" : "border-b border-border"}>
                    <th scope="row" className="p-2 font-medium">{item.moduleKey}</th>
                    <td className="p-2">{t(item.currentEnabled ? "enabled" : "disabled")}</td>
                    <td className="p-2">{t(item.targetEnabled ? "enabled" : "disabled")}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-6 space-y-2">
            <h2 className="text-lg font-semibold">{t("aiTitle")}</h2>
            <p className="text-sm">{t("recommended")}: {preview.aiChanges.recommendedProvider}</p>
            <p className="text-sm">{t("allowed")}: {preview.aiChanges.allowedProviders.join(", ") || t("none")}</p>
            <p className="text-sm">{t("disallowed")}: {preview.aiChanges.disallowedConfiguredProviders.join(", ") || t("none")}</p>
            {preview.aiChanges.requiresSelfHostedSetup && (
              <p className="text-sm text-warning" role="status">{t("selfHostedWarning")}</p>
            )}
          </div>
          {canManage ? (
            <div className="rounded-xl border border-border bg-surface p-4 sm:p-6 space-y-3">
              <label htmlFor={`${idPrefix}-confirm`} className="flex items-start gap-3 text-sm text-foreground">
                <input
                  id={`${idPrefix}-confirm`}
                  type="checkbox"
                  checked={approved}
                  disabled={saving || !preview.hasChanges}
                  onChange={(event) => setApproved(event.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span>{t("approval")}</span>
              </label>
              <Button onPress={() => void apply()} isDisabled={!approved || saving || !preview.hasChanges}>
                {saving ? t("applying") : t("apply")}
              </Button>
              {!preview.hasChanges && <p className="text-sm text-secondary">{t("noChanges")}</p>}
            </div>
          ) : <p className="text-sm text-secondary">{t("readOnly")}</p>}
        </div>
      )}
    </section>
  );
}
