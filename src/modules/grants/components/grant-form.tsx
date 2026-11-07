"use client";

import { addToast, Button, Checkbox, Input, Select, SelectItem, Textarea } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

import { saveGrantAction } from "../actions/grant-actions";

export const GRANT_STATUSES = ["PLANNED", "APPLIED", "APPROVED", "ACTIVE", "REPORTED", "CLOSED", "REJECTED"] as const;
export type GrantFormValue = {
  id: string | null; name: string; funder: string; fileNumber: string | null; purpose: string | null; status: (typeof GRANT_STATUSES)[number];
  approvedCents: number | null; ownShareCents: number; thirdPartyCents: number; periodStart: string; periodEnd: string; reportDueAt: string | null; projectId: string | null; useNetAmounts: boolean;
};

const euros = (cents: number | null) => (cents === null ? "" : String(cents / 100));
const toCents = (value: string) => (value.trim() === "" ? null : Math.round(Number(value.replace(",", ".")) * 100));

/** Hibe temel bilgileri (yeni ve düzenleme). */
export function GrantForm({ initial, projects, onSaved, canEdit }: { initial: GrantFormValue; projects: { id: string; name: string }[]; onSaved?: (id: string) => void; canEdit: boolean }) {
  const t = useTranslations("grants");
  const translate = useTranslateMessage();
  const router = useRouter();
  const [value, setValue] = useState({ ...initial, approved: euros(initial.approvedCents), own: euros(initial.ownShareCents), third: euros(initial.thirdPartyCents) });
  const [pending, start] = useTransition();
  const set = (patch: Partial<typeof value>) => setValue((current) => ({ ...current, ...patch }));
  const field = (key: "name" | "funder" | "fileNumber", type = "text") => (
    <Input label={t(`fields.${key}`)} labelPlacement="outside" placeholder=" " type={type} value={value[key] ?? ""} isDisabled={!canEdit} onValueChange={(next) => set({ [key]: next })} />
  );
  const money = (key: "approved" | "own" | "third", label: string) => (
    <Input label={label} labelPlacement="outside" placeholder="0,00" inputMode="decimal" endContent={<span className="text-small text-default-400">€</span>} value={value[key]} isDisabled={!canEdit} onValueChange={(next) => set({ [key]: next })} />
  );
  const dateField = (key: "periodStart" | "periodEnd" | "reportDueAt") => (
    <Input label={t(`fields.${key}`)} labelPlacement="outside" placeholder=" " type="date" value={value[key] ?? ""} isDisabled={!canEdit} onValueChange={(next) => set({ [key]: next })} />
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {field("name")}
        {field("funder")}
        {field("fileNumber")}
        <Select id="grant-status" label={t("fields.status")} labelPlacement="outside" selectedKeys={[value.status]} isDisabled={!canEdit} onSelectionChange={(keys) => set({ status: String(Array.from(keys)[0] ?? value.status) as GrantFormValue["status"] })}>
          {GRANT_STATUSES.map((status) => <SelectItem key={status}>{t(`status.${status}`)}</SelectItem>)}
        </Select>
        {dateField("periodStart")}
        {dateField("periodEnd")}
        {dateField("reportDueAt")}
        <Select id="grant-project" label={t("fields.project")} labelPlacement="outside" placeholder={t("noProject")} description={t("projectHelp")} selectedKeys={value.projectId ? [value.projectId] : []} isDisabled={!canEdit} onSelectionChange={(keys) => set({ projectId: String(Array.from(keys)[0] ?? "") || null })}>
          {projects.map((project) => <SelectItem key={project.id}>{project.name}</SelectItem>)}
        </Select>
        {money("approved", t("fields.approved"))}
        {money("own", t("fields.ownShare"))}
        {money("third", t("fields.thirdParty"))}
      </div>
      <Checkbox isSelected={value.useNetAmounts} isDisabled={!canEdit} onValueChange={(next) => set({ useNetAmounts: next })}><span className="text-small">{t("fields.useNetAmounts")}</span></Checkbox>
      <Textarea label={t("fields.purpose")} labelPlacement="outside" placeholder=" " minRows={3} value={value.purpose ?? ""} isDisabled={!canEdit} onValueChange={(next) => set({ purpose: next })} />
      {canEdit ? (
        <Button color="primary" className="self-start" isLoading={pending} onPress={() => start(async () => {
          const response = await saveGrantAction({
            id: value.id, name: value.name, funder: value.funder, fileNumber: value.fileNumber ?? "", purpose: value.purpose ?? "", status: value.status,
            approvedCents: toCents(value.approved), ownShareCents: toCents(value.own) ?? 0, thirdPartyCents: toCents(value.third) ?? 0,
            periodStart: value.periodStart, periodEnd: value.periodEnd, reportDueAt: value.reportDueAt || null, projectId: value.projectId, useNetAmounts: value.useNetAmounts,
          });
          if (!response.ok) return void addToast({ title: translate(response.error), color: "danger" });
          addToast({ title: t("saved"), color: "success" });
          if (onSaved) onSaved(response.data.id);
          else router.refresh();
        })}>{t("save")}</Button>
      ) : null}
    </div>
  );
}
