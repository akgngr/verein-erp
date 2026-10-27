"use client";

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

import { addDecisionAction, updateDecisionAction } from "../actions/decision-actions";
import { DECISION_RESULT_LABELS } from "../constants";
import type { DecisionItem } from "../types";

const RESULT_OPTIONS = (
  Object.keys(DECISION_RESULT_LABELS) as Array<keyof typeof DECISION_RESULT_LABELS>
).map((result) => ({ value: result, label: DECISION_RESULT_LABELS[result] }));

/**
 * Karar ekleme/düzenleme penceresi (7.3): metin, sonuç, opsiyonel gündem
 * maddesi, opsiyonel oylar. KARAR: oylar ya üçü boş ya üçü sayıdır (5. bölüm md. 9).
 */
export function DecisionModal({
  meetingId,
  agendaItems,
  decision,
  defaultAgendaItemId,
  isOpen,
  onOpenChange,
}: {
  meetingId: string;
  agendaItems: { id: string; position: number; title: string }[];
  decision: DecisionItem | null;
  defaultAgendaItemId?: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [agendaItemId, setAgendaItemId] = useState<Set<string>>(
    new Set([decision?.agendaItemId ?? defaultAgendaItemId ?? ""].filter(Boolean)),
  );
  const [text, setText] = useState(decision?.text ?? "");
  const [result, setResult] = useState<Set<string>>(new Set([decision?.result ?? "ACCEPTED"]));
  const [votesFor, setVotesFor] = useState(
    decision?.votesFor !== null && decision?.votesFor !== undefined ? String(decision.votesFor) : "",
  );
  const [votesAgainst, setVotesAgainst] = useState(
    decision?.votesAgainst !== null && decision?.votesAgainst !== undefined
      ? String(decision.votesAgainst)
      : "",
  );
  const [votesAbstain, setVotesAbstain] = useState(
    decision?.votesAbstain !== null && decision?.votesAbstain !== undefined
      ? String(decision.votesAbstain)
      : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const key = decision?.id ?? `new-${defaultAgendaItemId ?? "none"}`;

  const submit = async () => {
    setBusy(true);
    setError(null);
    const common = {
      agendaItemId: Array.from(agendaItemId)[0] ?? null,
      text,
      result: Array.from(result)[0] as "ACCEPTED" | "REJECTED" | "POSTPONED",
      votesFor: votesFor.trim() === "" ? null : Number(votesFor),
      votesAgainst: votesAgainst.trim() === "" ? null : Number(votesAgainst),
      votesAbstain: votesAbstain.trim() === "" ? null : Number(votesAbstain),
    };
    const res = decision
      ? await updateDecisionAction({ id: decision.id, ...common })
      : await addDecisionAction({ meetingId, ...common });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    addToast({
      title: decision
        ? `Karar güncellendi`
        : `Karar eklendi: ${(res.data as { decisionNumber?: string }).decisionNumber ?? ""}`,
      color: "success",
    });
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} key={key} size="lg">
      <ModalContent>
        <ModalHeader>{decision ? `Kararı düzenle: ${decision.decisionNumber}` : "Karar ekle"}</ModalHeader>
        <ModalBody>
          <Textarea
            label="Karar metni"
            labelPlacement="outside"
            value={text}
            onValueChange={setText}
            minRows={3}
            isRequired
            maxLength={3000}
            description="En fazla 3000 karakter."
          />
          <Select
            label="Sonuç"
            labelPlacement="outside"
            selectedKeys={result}
            onSelectionChange={(keys) => setResult(new Set(keys as Set<string>))}
          >
            {RESULT_OPTIONS.map((option) => (
              <SelectItem key={option.value} textValue={option.label}>
                {option.label}
              </SelectItem>
            ))}
          </Select>
          {agendaItems.length > 0 ? (
            <Select
              label="Bağlı gündem maddesi"
              labelPlacement="outside"
              selectedKeys={agendaItemId}
              onSelectionChange={(keys) => setAgendaItemId(new Set(keys as Set<string>))}
              description="Boş bırakılırsa karar gündeme bağlanmaz."
            >
              {[
                { value: "", label: "Bağlantı yok" },
                ...agendaItems.map((item) => ({
                  value: item.id,
                  label: `${item.position}. ${item.title}`,
                })),
              ].map((option) => (
                <SelectItem key={option.value} textValue={option.label}>
                  {option.label}
                </SelectItem>
              ))}
            </Select>
          ) : null}
          <div className="grid grid-cols-3 gap-3">
            <Input
              type="number"
              label="Kabul"
              labelPlacement="outside"
              value={votesFor}
              onValueChange={setVotesFor}
              min={0}
              max={1000}
            />
            <Input
              type="number"
              label="Ret"
              labelPlacement="outside"
              value={votesAgainst}
              onValueChange={setVotesAgainst}
              min={0}
              max={1000}
            />
            <Input
              type="number"
              label="Çekimser"
              labelPlacement="outside"
              value={votesAbstain}
              onValueChange={setVotesAbstain}
              min={0}
              max={1000}
            />
          </div>
          {error ? <p className="text-small text-danger">{error}</p> : null}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button color="primary" isLoading={busy} onPress={submit} isDisabled={text.trim().length < 3}>
            Kaydet
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
