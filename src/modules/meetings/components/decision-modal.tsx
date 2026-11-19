"use client";

import { notify } from "@/shared/components/ui/notify";
import { Description, Dialog, Input, Label, Select, Spinner, TextArea, TextField, Button } from "@/shared/components/kit";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useTranslations } from "next-intl";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  addDecisionAction,
  updateDecisionAction,
} from "../actions/decision-actions";
import { DECISION_RESULT_VALUES } from "../constants";
import type { DecisionItem } from "../types";

const RESULT_KEYS = DECISION_RESULT_VALUES;

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
  const tCommon = useTranslations("common");
  const t = useTranslations("meetings.decisions");
  const tResult = useTranslations("meetings.decisionResult");
  const resultOptions = RESULT_KEYS.map((key) => ({
    value: key,
    label: tResult(key),
  }));
  const router = useRouter();
  const [agendaItemId, setAgendaItemId] = useState<Set<string>>(
    new Set(
      [decision?.agendaItemId ?? defaultAgendaItemId ?? ""].filter(Boolean),
    ),
  );
  const [text, setText] = useState(decision?.text ?? "");
  const [result, setResult] = useState<Set<string>>(
    new Set([decision?.result ?? "ACCEPTED"]),
  );
  const [votesFor, setVotesFor] = useState(
    decision?.votesFor !== null && decision?.votesFor !== undefined
      ? String(decision.votesFor)
      : "",
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
    notify.success(
      decision
        ? t("updatedToast")
        : t("addedToast", {
            number:
              (res.data as { decisionNumber?: string }).decisionNumber ?? "",
          }));
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} key={key} size="lg" className={"w-full max-w-lg "}>
            <DialogDismissButton />

            <Dialog.Header>
              <Dialog.Heading className="flex items-center gap-2">
                {decision
                  ? t("editTitleNumbered", { number: decision.decisionNumber })
                  : t("modalAddTitle")}
              </Dialog.Heading>
            </Dialog.Header>
            <Dialog.Body>
              <TextField
                value={text}
                isRequired
                onChange={setText}
                className={["w-full"].filter(Boolean).join(" ")}
              >
                <Label>{t("text")}</Label>
                <TextArea
                  maxLength={3000}
                  rows={3}
                  className={["[field-sizing:content]"]
                    .filter(Boolean)
                    .join(" ")}
                />
                <Description>{t("textHelp")}</Description>
              </TextField>
              <Select
                value={Array.from(result)[0] ?? null}
                onChange={(selectedValue) => {
                  const keys =
                    selectedValue === null ? undefined : String(selectedValue);
                  return setResult(new Set(keys === undefined ? [] : [keys]));
                }}
              >
                <Label>{t("result")}</Label>
                    {resultOptions.map((option) => (
                      <Select.Item
                        key={option.value}
                        id={option.value}
                        textValue={option.label}
                      >
                        <Label>{option.label}</Label>
                      </Select.Item>
                    ))}
              </Select>
              {agendaItems.length > 0 ? (
                <Select
                  value={Array.from(agendaItemId)[0] ?? null}
                  onChange={(selectedValue) => {
                    const keys =
                      selectedValue === null
                        ? undefined
                        : String(selectedValue);
                    return setAgendaItemId(
                      new Set(keys === undefined ? [] : [keys]),
                    );
                  }}
                >
                  <Label>{t("agendaItem")}</Label>
                      {[
                        { value: "", label: t("noAgenda") },
                        ...agendaItems.map((item) => ({
                          value: item.id,
                          label: `${item.position}. ${item.title}`,
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
                  <Description>{t("agendaHelp")}</Description>
                </Select>
              ) : null}
              <div className="grid grid-cols-3 gap-3">
                <TextField
                  value={votesFor}
                  onChange={setVotesFor}
                  className={["w-full"].filter(Boolean).join(" ")}
                >
                  <Label>{t("votesForShort")}</Label>
                  <Input type="number" min={0} max={1000} />
                </TextField>
                <TextField
                  value={votesAgainst}
                  onChange={setVotesAgainst}
                  className={["w-full"].filter(Boolean).join(" ")}
                >
                  <Label>{t("votesAgainstShort")}</Label>
                  <Input type="number" min={0} max={1000} />
                </TextField>
                <TextField
                  value={votesAbstain}
                  onChange={setVotesAbstain}
                  className={["w-full"].filter(Boolean).join(" ")}
                >
                  <Label>{t("votesAbstainShort")}</Label>
                  <Input type="number" min={0} max={1000} />
                </TextField>
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
                isDisabled={text.trim().length < 3}
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
