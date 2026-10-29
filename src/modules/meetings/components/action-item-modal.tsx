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
 * Görev ekleme/düzenleme penceresi (7.3 Görevler): açıklama, sorumlu (kullanıcı
 * YA serbest metin YA yok), son tarih, bağlı karar. KARAR: kullanıcı seçilirse
 * serbest metin devre dışı kalır ve tersi (5. bölüm md. 10).
 */
export function ActionItemModal({
  meetingId,
  decisions,
  userOptions,
  item,
  isOpen,
  onOpenChange,
}: {
  meetingId: string;
  decisions: Pick<DecisionItem, "id" | "decisionNumber">[];
  userOptions: { id: string; label: string }[];
  item: {
    id: string;
    description: string;
    assigneeId: string | null;
    assigneeLabel: string | null;
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
  const [assigneeId, setAssigneeId] = useState<Set<string>>(
    new Set(item?.assigneeId ? [item.assigneeId] : []),
  );
  const [assigneeName, setAssigneeName] = useState(
    !item?.assigneeId && item?.assigneeLabel ? item.assigneeLabel : "",
  );
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
      assigneeId: Array.from(assigneeId)[0] ?? null,
      assigneeName:
        Array.from(assigneeId)[0] == null && assigneeName.trim() !== "" ? assigneeName.trim() : null,
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

  const selectedUserId = Array.from(assigneeId)[0];

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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label={t("assigneeUserLabel")}
              labelPlacement="outside"
              selectedKeys={assigneeId}
              onSelectionChange={(keys) => setAssigneeId(new Set(keys as Set<string>))}
              description={t("assigneeUserHelp")}
            >
              {[
                { value: "", label: t("noAssigneeOption") },
                ...userOptions.map((option) => ({ value: option.id, label: option.label })),
              ].map((option) => (
                <SelectItem key={option.value} textValue={option.label}>
                  {option.label}
                </SelectItem>
              ))}
            </Select>
            <Input
              label={t("assigneeFreeLabel")}
              labelPlacement="outside"
              value={selectedUserId ? "" : assigneeName}
              onValueChange={setAssigneeName}
              isDisabled={Boolean(selectedUserId)}
              maxLength={120}
              description={t("assigneeFreeHelp")}
            />
          </div>
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
            isDisabled={description.trim().length < 3}
          >
            {tCommon("save")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
