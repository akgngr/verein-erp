"use client";

import { notify } from "@/shared/components/ui/notify";
import { DateInput, Description, Dialog, Input, Label, Select, Spinner, TextArea, TextField, Button } from "@/shared/components/kit";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useTranslations } from "next-intl";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  addActionItemAction,
  updateActionItemAction,
} from "../actions/action-item-actions";
import type { DecisionItem } from "../types";

/**
 * Görev ekleme/düzenleme penceresi (7.3 Görevler): açıklama, sorumlu, son tarih, bağlı karar.
 * KARAR: Sorumlu yalnızca toplantının katılımcılarından seçilir; listede olmayan biri için
 * "Dışarıdan sorumlu" seçilip ad (zorunlu), e-posta ve telefon elle girilir.
 */
const EXTERNAL = "__external";
export function ActionItemModal({
  meetingId,
  decisions,
  attendeeOptions,
  item,
  isOpen,
  onOpenChange,
}: {
  meetingId: string;
  decisions: Pick<DecisionItem, "id" | "decisionNumber">[];
  attendeeOptions: { id: string; userId: string | null; label: string }[];
  item: {
    id: string;
    description: string;
    assigneeId: string | null;
    assigneeLabel: string | null;
    assigneeAttendeeId: string | null;
    assigneeEmail: string | null;
    assigneePhone: string | null;
    dueDate: Date | null;
    decisionNumber: string | null;
    decisionId?: string | null;
  } | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const tCommon = useTranslations("common");
  const t = useTranslations("meetings.tasks");
  const router = useRouter();
  const [description, setDescription] = useState(item?.description ?? "");
  // Eski kayıtlar: katılımcı kimliği yoksa aynı kullanıcıya ait katılımcı aranır; o da yoksa
  // kayıttaki ad "dışarıdan sorumlu" olarak gelir.
  const initialAttendee =
    item?.assigneeAttendeeId ??
    (item?.assigneeId
      ? attendeeOptions.find((option) => option.userId === item.assigneeId)?.id
      : undefined);
  const [assignee, setAssignee] = useState<string>(
    initialAttendee ?? (item?.assigneeLabel ? EXTERNAL : ""),
  );
  const [assigneeName, setAssigneeName] = useState(
    !initialAttendee ? (item?.assigneeLabel ?? "") : "",
  );
  const [assigneeEmail, setAssigneeEmail] = useState(item?.assigneeEmail ?? "");
  const [assigneePhone, setAssigneePhone] = useState(item?.assigneePhone ?? "");
  const isExternal = assignee === EXTERNAL;
  const [dueDate, setDueDate] = useState(
    item?.dueDate ? item.dueDate.toISOString().slice(0, 10) : "",
  );
  const [decisionId, setDecisionId] = useState<Set<string>>(
    new Set(item?.decisionId ? [item.decisionId] : []),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const key = item?.id ?? "new";

  const submit = async () => {
    setBusy(true);
    setError(null);
    const common = {
      description,
      assigneeAttendeeId: assignee && !isExternal ? assignee : null,
      assigneeName: isExternal ? assigneeName : null,
      assigneeEmail: isExternal ? assigneeEmail : null,
      assigneePhone: isExternal ? assigneePhone : null,
      dueDate: dueDate || null,
      decisionId: Array.from(decisionId)[0] ?? null,
    };
    const result = item
      ? await updateActionItemAction({ id: item.id, ...common })
      : await addActionItemAction({ meetingId, ...common });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    notify.success(item ? t("updatedToast") : t("addedToast"));
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} key={key} size="lg" className={"w-full max-w-lg "}>
            <DialogDismissButton />

            <Dialog.Header>
              <Dialog.Heading className="flex items-center gap-2">
                {item ? t("modalEditTitle") : t("modalAddTitle")}
              </Dialog.Heading>
            </Dialog.Header>
            <Dialog.Body>
              <TextField
                value={description}
                isRequired
                onChange={setDescription}
                className={["w-full"].filter(Boolean).join(" ")}
              >
                <Label>{t("descriptionLabel")}</Label>
                <TextArea
                  maxLength={1000}
                  rows={2}
                  className={["[field-sizing:content]"]
                    .filter(Boolean)
                    .join(" ")}
                />
                <Description>{t("descriptionHelp")}</Description>
              </TextField>
              <Select
                placeholder={t("noAssigneeOption")}
                value={
                  assignee
                    ? (Array.from(new Set([assignee]))[0] ?? null)
                    : (Array.from(new Set<string>())[0] ?? null)
                }
                onChange={(selectedValue) => {
                  const keys =
                    selectedValue === null ? undefined : String(selectedValue);
                  return setAssignee(keys ?? "");
                }}
              >
                <Label>{t("assigneeLabel")}</Label>
                    {[
                      { value: "", label: t("noAssigneeOption") },
                      ...attendeeOptions.map((option) => ({
                        value: option.id,
                        label: option.label,
                      })),
                      { value: EXTERNAL, label: t("assigneeExternalOption") },
                    ].map((option) => (
                      <Select.Item
                        key={option.value}
                        id={option.value}
                        textValue={option.label}
                      >
                        <Label>{option.label}</Label>
                      </Select.Item>
                    ))}
                <Description>
                  {attendeeOptions.length === 0
                    ? t("assigneeNoAttendees")
                    : t("assigneeHelp")}
                </Description>
              </Select>
              {isExternal ? (
                <div className="grid grid-cols-1 gap-3 rounded-lg border border-ink-200 p-3 sm:grid-cols-3">
                  <TextField
                    value={assigneeName}
                    isRequired
                    onChange={setAssigneeName}
                    className={["w-full"].filter(Boolean).join(" ")}
                  >
                    <Label>{t("externalName")}</Label>
                    <Input placeholder=" " maxLength={120} />
                  </TextField>
                  <TextField
                    value={assigneeEmail}
                    onChange={setAssigneeEmail}
                    className={["w-full"].filter(Boolean).join(" ")}
                  >
                    <Label>{t("externalEmail")}</Label>
                    <Input type="email" placeholder=" " maxLength={200} />
                  </TextField>
                  <TextField
                    value={assigneePhone}
                    onChange={setAssigneePhone}
                    className={["w-full"].filter(Boolean).join(" ")}
                  >
                    <Label>{t("externalPhone")}</Label>
                    <Input type="tel" placeholder=" " maxLength={40} />
                  </TextField>
                </div>
              ) : null}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DateInput
                  label={t("dueDateLabel")}
                  ariaLabel={t("dueDateLabel")}
                  value={dueDate}
                  onChange={setDueDate}
                  className="w-full"
                />
                <Select
                  value={Array.from(decisionId)[0] ?? null}
                  onChange={(selectedValue) => {
                    const keys =
                      selectedValue === null
                        ? undefined
                        : String(selectedValue);
                    return setDecisionId(
                      new Set(keys === undefined ? [] : [keys]),
                    );
                  }}
                >
                  <Label>{t("decisionLabel")}</Label>
                      {[
                        { value: "", label: t("noDecision") },
                        ...decisions.map((decision) => ({
                          value: decision.id,
                          label: decision.decisionNumber,
                        })),
                      ].map((option) => (
                        <Select.Item
                          key={option.value}
                          id={option.value}
                          textValue={option.label}
                        >
                          <Label>{option.label}</Label>
                        </Select.Item>
                      ))}
                </Select>
              </div>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                onPress={() => onOpenChange(false)}
                variant={actionVariant("default", "light")}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                onPress={submit}
                isDisabled={
                  description.trim().length < 3 ||
                  (isExternal && assigneeName.trim().length < 2)
                }
                variant={actionVariant("primary", "solid")}
                isPending={busy}
              >
                {busy ? <Spinner size="sm" tone="current" /> : null}
                {tCommon("save")}
              </Button>
            </Dialog.Footer>
    </Dialog>
  );
}
