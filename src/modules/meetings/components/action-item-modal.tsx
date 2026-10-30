"use client";

import { useTranslations } from "next-intl";

import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Textarea,
  addToast,
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { addActionItemAction, updateActionItemAction } from "../actions/action-item-actions";
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
    (item?.assigneeId ? attendeeOptions.find((option) => option.userId === item.assigneeId)?.id : undefined);
  const [assignee, setAssignee] = useState<string>(
    initialAttendee ?? (item?.assigneeLabel ? EXTERNAL : ""),
  );
  const [assigneeName, setAssigneeName] = useState(!initialAttendee ? (item?.assigneeLabel ?? "") : "");
  const [assigneeEmail, setAssigneeEmail] = useState(item?.assigneeEmail ?? "");
  const [assigneePhone, setAssigneePhone] = useState(item?.assigneePhone ?? "");
  const isExternal = assignee === EXTERNAL;
  const [dueDate, setDueDate] = useState(item?.dueDate ? item.dueDate.toISOString().slice(0, 10) : "");
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
    addToast({ title: item ? t("updatedToast") : t("addedToast"), color: "success" });
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} key={key} size="lg">
      <ModalContent>
        <ModalHeader>{item ? t("modalEditTitle") : t("modalAddTitle")}</ModalHeader>
        <ModalBody>
          <Textarea
            label={t("descriptionLabel")}
            labelPlacement="outside"
            value={description}
            onValueChange={setDescription}
            minRows={2}
            isRequired
            maxLength={1000}
            description={t("descriptionHelp")}
          />
          <Select
            label={t("assigneeLabel")}
            labelPlacement="outside"
            placeholder={t("noAssigneeOption")}
            selectedKeys={assignee ? new Set([assignee]) : new Set<string>()}
            onSelectionChange={(keys) => setAssignee(Array.from(keys as Set<string>)[0] ?? "")}
            description={attendeeOptions.length === 0 ? t("assigneeNoAttendees") : t("assigneeHelp")}
          >
            {[
              { value: "", label: t("noAssigneeOption") },
              ...attendeeOptions.map((option) => ({ value: option.id, label: option.label })),
              { value: EXTERNAL, label: t("assigneeExternalOption") },
            ].map((option) => (
              <SelectItem key={option.value} textValue={option.label}>
                {option.label}
              </SelectItem>
            ))}
          </Select>
          {isExternal ? (
            <div className="grid grid-cols-1 gap-3 rounded-medium border border-default-200 p-3 sm:grid-cols-3">
              <Input
                label={t("externalName")}
                labelPlacement="outside"
                placeholder=" "
                value={assigneeName}
                onValueChange={setAssigneeName}
                isRequired
                maxLength={120}
              />
              <Input
                type="email"
                label={t("externalEmail")}
                labelPlacement="outside"
                placeholder=" "
                value={assigneeEmail}
                onValueChange={setAssigneeEmail}
                maxLength={200}
              />
              <Input
                type="tel"
                label={t("externalPhone")}
                labelPlacement="outside"
                placeholder=" "
                value={assigneePhone}
                onValueChange={setAssigneePhone}
                maxLength={40}
              />
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              type="date"
              label={t("dueDateLabel")}
              labelPlacement="outside"
              value={dueDate}
              onValueChange={setDueDate}
            />
            <Select
              label={t("decisionLabel")}
              labelPlacement="outside"
              selectedKeys={decisionId}
              onSelectionChange={(keys) => setDecisionId(new Set(keys as Set<string>))}
            >
              {[
                { value: "", label: t("noDecision") },
                ...decisions.map((decision) => ({
                  value: decision.id,
                  label: decision.decisionNumber,
                })),
              ].map((option) => (
                <SelectItem key={option.value} textValue={option.label}>
                  {option.label}
                </SelectItem>
              ))}
            </Select>
          </div>
          {error ? <p className="text-small text-danger">{error}</p> : null}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={() => onOpenChange(false)}>
            {tCommon("cancel")}
          </Button>
          <Button
            color="primary"
            isLoading={busy}
            onPress={submit}
            isDisabled={description.trim().length < 3 || (isExternal && assigneeName.trim().length < 2)}
          >
            {tCommon("save")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
