"use client";
import { Button, toast } from "@heroui/react";
import { Checkbox, Input, InputGroup, Label, Select, Spinner, TextArea, TextField } from "@/shared/components/kit";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

import { saveGrantAction } from "../actions/grant-actions";

export const GRANT_STATUSES = [
  "PLANNED",
  "APPLIED",
  "APPROVED",
  "ACTIVE",
  "REPORTED",
  "CLOSED",
  "REJECTED",
] as const;
export type GrantFormValue = {
  id: string | null;
  name: string;
  funder: string;
  fileNumber: string | null;
  purpose: string | null;
  status: (typeof GRANT_STATUSES)[number];
  approvedCents: number | null;
  ownShareCents: number;
  thirdPartyCents: number;
  periodStart: string;
  periodEnd: string;
  reportDueAt: string | null;
  projectId: string | null;
  useNetAmounts: boolean;
};

const euros = (cents: number | null) =>
  cents === null ? "" : String(cents / 100);
const toCents = (value: string) =>
  value.trim() === ""
    ? null
    : Math.round(Number(value.replace(",", ".")) * 100);

/** Hibe temel bilgileri (yeni ve düzenleme). */
export function GrantForm({
  initial,
  projects,
  openAfterSave = false,
  canEdit,
}: {
  initial: GrantFormValue;
  projects: { id: string; name: string }[];
  openAfterSave?: boolean;
  canEdit: boolean;
}) {
  const t = useTranslations("grants");
  const translate = useTranslateMessage();
  const router = useRouter();
  const [value, setValue] = useState({
    ...initial,
    approved: euros(initial.approvedCents),
    own: euros(initial.ownShareCents),
    third: euros(initial.thirdPartyCents),
  });
  const [pending, start] = useTransition();
  const set = (patch: Partial<typeof value>) =>
    setValue((current) => ({ ...current, ...patch }));
  const field = (key: "name" | "funder" | "fileNumber", type = "text") => (
    <TextField
      value={value[key] ?? ""}
      isDisabled={!canEdit}
      onChange={(next) => set({ [key]: next })}
      className={["w-full"].filter(Boolean).join(" ")}
    >
      <Label>{t(`fields.${key}`)}</Label>
      <Input placeholder=" " type={type} />
    </TextField>
  );
  const money = (key: "approved" | "own" | "third", label: string) => (
    <TextField
      value={value[key]}
      isDisabled={!canEdit}
      onChange={(next) => set({ [key]: next })}
      className={["w-full"].filter(Boolean).join(" ")}
    >
      <Label>{label}</Label>
      <InputGroup>
        <InputGroup.Input placeholder="0,00" inputMode="decimal" />
        <InputGroup.Suffix>
          {<span className="text-sm text-ink-400">€</span>}
        </InputGroup.Suffix>
      </InputGroup>
    </TextField>
  );
  const dateField = (key: "periodStart" | "periodEnd" | "reportDueAt") => (
    <TextField
      value={value[key] ?? ""}
      isDisabled={!canEdit}
      onChange={(next) => set({ [key]: next })}
      className={["w-full"].filter(Boolean).join(" ")}
    >
      <Label>{t(`fields.${key}`)}</Label>
      <Input placeholder=" " type="date" />
    </TextField>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {field("name")}
        {field("funder")}
        {field("fileNumber")}
        <Select
          id="grant-status"
          isDisabled={!canEdit}
          value={value.status}
          onChange={(selectedValue) => {
            const keys =
              selectedValue === null ? undefined : String(selectedValue);
            return set({
              status: String(keys ?? value.status) as GrantFormValue["status"],
            });
          }}
        >
          <Label>{t("fields.status")}</Label>
              {GRANT_STATUSES.map((status) => (
                <Select.Item
                  key={status}
                  id={status}
                  textValue={String(t(`status.${status}`))}
                >
                  <Label>{t(`status.${status}`)}</Label>
                </Select.Item>
              ))}
        </Select>
        {dateField("periodStart")}
        {dateField("periodEnd")}
        {dateField("reportDueAt")}
        <div className="flex flex-col gap-1">
          <Select
            id="grant-project"
            placeholder={t("noProject")}
            isDisabled={!canEdit}
            value={value.projectId ? value.projectId : null}
            onChange={(selectedValue) => {
              const keys =
                selectedValue === null ? undefined : String(selectedValue);
              return set({ projectId: String(keys ?? "") || null });
            }}
          >
            <Label>{t("fields.project")}</Label>
                {projects.map((project) => (
                  <Select.Item
                    key={project.id}
                    id={project.id}
                    textValue={String(project.name)}
                  >
                    <Label>{project.name}</Label>
                  </Select.Item>
                ))}
          </Select>
          {/* HeroUI: outside etiket + description birlikte etiketi kaydırıyor; açıklama dışarıda. */}
          <p className="px-1 text-xs text-ink-500">{t("projectHelp")}</p>
        </div>
        {money("approved", t("fields.approved"))}
        {money("own", t("fields.ownShare"))}
        {money("third", t("fields.thirdParty"))}
      </div>
      <Checkbox
        isSelected={value.useNetAmounts}
        isDisabled={!canEdit}
        onChange={(next) => set({ useNetAmounts: next })}
      >
          <Label>
            <span className="text-sm">{t("fields.useNetAmounts")}</span>
          </Label>
      </Checkbox>
      <TextField
        value={value.purpose ?? ""}
        isDisabled={!canEdit}
        onChange={(next) => set({ purpose: next })}
        className={["w-full"].filter(Boolean).join(" ")}
      >
        <Label>{t("fields.purpose")}</Label>
        <TextArea
          placeholder=" "
          rows={3}
          className={["[field-sizing:content]"].filter(Boolean).join(" ")}
        />
      </TextField>
      {canEdit ? (
        <Button
          className="self-start"
          onPress={() =>
            start(async () => {
              const response = await saveGrantAction({
                id: value.id,
                name: value.name,
                funder: value.funder,
                fileNumber: value.fileNumber ?? "",
                purpose: value.purpose ?? "",
                status: value.status,
                approvedCents: toCents(value.approved),
                ownShareCents: toCents(value.own) ?? 0,
                thirdPartyCents: toCents(value.third) ?? 0,
                periodStart: value.periodStart,
                periodEnd: value.periodEnd,
                reportDueAt: value.reportDueAt || null,
                projectId: value.projectId,
                useNetAmounts: value.useNetAmounts,
              });
              if (!response.ok)
                return void toast(translate(response.error), {
                  variant: "danger",
                });
              toast(t("saved"), { variant: "success" });
              if (openAfterSave)
                router.push(`/muhasebe/hibeler/${response.data.id}`);
              else router.refresh();
            })
          }
          variant={actionVariant("primary", "solid")}
          isPending={pending}
        >
          {pending ? <Spinner size="sm" tone="current" /> : null}
          {t("save")}
        </Button>
      ) : null}
    </div>
  );
}
