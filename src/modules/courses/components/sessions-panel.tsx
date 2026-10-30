"use client";

import { addToast, Button, Checkbox, Chip, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Textarea } from "@heroui/react";
import { CalendarPlus, Pencil, Repeat, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { useTranslateMessage } from "@/shared/i18n/use-translate-message";
import { formatDate } from "@/shared/utils";

import { createSessionAction, createSessionSeriesAction, deleteSessionAction, updateSessionAction } from "../actions/session-actions";
import type { SessionRow } from "../types";
import { formatDateOnly } from "../utils";

const SELECT_CLASS = "h-10 w-full rounded-medium border border-default-200 bg-default-50/50 px-3 text-small outline-none focus:border-primary";

type Draft = { id?: string; date: string; startTime: string; endTime: string; topic: string; teacherId: string; isCancelled: boolean; note: string };

/** Ders oturumları: tek tek ekleme/düzenleme ya da haftalık seri oluşturma. */
export function SessionsPanel({
  courseId,
  sessions,
  teacherOptions,
  canEdit,
}: {
  courseId: string;
  sessions: SessionRow[];
  teacherOptions: { id: string; label: string }[];
  canEdit: boolean;
}) {
  const t = useTranslations("courses.sessions");
  const tCommon = useTranslations("common");
  const tWeekday = useTranslations("courses.weekday");
  const translateMessage = useTranslateMessage();
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [series, setSeries] = useState<{ weekday: string; startTime: string; endTime: string } | null>(null);
  const [deleting, setDeleting] = useState<SessionRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const openNew = () => setDraft({ date: "", startTime: "", endTime: "", topic: "", teacherId: "", isCancelled: false, note: "" });

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    const payload = { courseId, ...draft };
    const result = draft.id ? await updateSessionAction(payload) : await createSessionAction(payload);
    setBusy(false);
    if (!result.ok) {
      const fieldError = result.fieldErrors ? Object.values(result.fieldErrors)[0]?.[0] : undefined;
      setError(translateMessage(fieldError) ?? result.error);
      return;
    }
    addToast({ title: t("saved"), color: "success" });
    setDraft(null);
    router.refresh();
  };

  const saveSeries = async () => {
    if (!series) return;
    setBusy(true);
    setError(null);
    const result = await createSessionSeriesAction({ courseId, weekday: series.weekday, startTime: series.startTime, endTime: series.endTime });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    addToast({ title: t("seriesCreated", { count: result.data.created }), color: "success" });
    setSeries(null);
    router.refresh();
  };

  return (
    <section className="flex flex-col gap-4">
      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          <Button color="primary" startContent={<CalendarPlus className="h-4 w-4" aria-hidden />} onPress={openNew}>
            {t("add")}
          </Button>
          <Button variant="flat" startContent={<Repeat className="h-4 w-4" aria-hidden />} onPress={() => setSeries({ weekday: "2", startTime: "", endTime: "" })}>
            {t("series")}
          </Button>
        </div>
      ) : null}
      {sessions.length === 0 ? (
        <p className="text-small text-default-500">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((session) => (
            <li key={session.id} className="flex flex-wrap items-center justify-between gap-2 rounded-medium border border-default-200 bg-content1 p-3">
              <div className="flex min-w-0 flex-col">
                <span className={`text-small font-medium ${session.isCancelled ? "text-default-400 line-through" : ""}`}>
                  {formatDate(session.date)}
                  {session.startTime ? ` · ${session.startTime}${session.endTime ? `–${session.endTime}` : ""}` : ""}
                  {session.topic ? ` · ${session.topic}` : ""}
                </span>
                <span className="text-tiny text-default-500">{[session.teacherName, session.note].filter(Boolean).join(" · ")}</span>
              </div>
              <div className="flex items-center gap-1">
                {session.isCancelled ? (
                  <Chip size="sm" color="danger" variant="flat">
                    {t("cancelled")}
                  </Chip>
                ) : null}
                {canEdit ? (
                  <>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      aria-label={tCommon("edit")}
                      onPress={() =>
                        setDraft({
                          id: session.id,
                          date: formatDateOnly(session.date),
                          startTime: session.startTime ?? "",
                          endTime: session.endTime ?? "",
                          topic: session.topic ?? "",
                          teacherId: session.teacherId ?? "",
                          isCancelled: session.isCancelled,
                          note: session.note ?? "",
                        })
                      }
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button isIconOnly size="sm" variant="light" color="danger" aria-label={tCommon("delete")} onPress={() => setDeleting(session)}>
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal isOpen={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <ModalContent>
          <ModalHeader>{draft?.id ? t("editTitle") : t("addTitle")}</ModalHeader>
          <ModalBody>
            {draft ? (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-3 gap-3">
                  <Input type="date" label={t("date")} labelPlacement="outside" placeholder=" " value={draft.date} onValueChange={(date) => setDraft({ ...draft, date })} isRequired />
                  <Input type="time" label={t("startTime")} labelPlacement="outside" placeholder=" " value={draft.startTime} onValueChange={(startTime) => setDraft({ ...draft, startTime })} />
                  <Input type="time" label={t("endTime")} labelPlacement="outside" placeholder=" " value={draft.endTime} onValueChange={(endTime) => setDraft({ ...draft, endTime })} />
                </div>
                <Input label={t("topic")} labelPlacement="outside" placeholder=" " value={draft.topic} onValueChange={(topic) => setDraft({ ...draft, topic })} maxLength={200} />
                <label className="flex flex-col gap-1 text-small">
                  <span>{t("teacher")}</span>
                  <select className={SELECT_CLASS} value={draft.teacherId} onChange={(event) => setDraft({ ...draft, teacherId: event.target.value })}>
                    <option value="">{t("noTeacher")}</option>
                    {teacherOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <Textarea label={t("note")} labelPlacement="outside" value={draft.note} onValueChange={(note) => setDraft({ ...draft, note })} maxLength={500} minRows={2} />
                <Checkbox isSelected={draft.isCancelled} onValueChange={(isCancelled) => setDraft({ ...draft, isCancelled })}>
                  {t("markCancelled")}
                </Checkbox>
                {error ? <p className="text-small text-danger">{error}</p> : null}
              </div>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setDraft(null)}>
              {tCommon("cancel")}
            </Button>
            <Button color="primary" isLoading={busy} isDisabled={!draft?.date} onPress={save}>
              {tCommon("save")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={series !== null} onOpenChange={(open) => !open && setSeries(null)}>
        <ModalContent>
          <ModalHeader>{t("seriesTitle")}</ModalHeader>
          <ModalBody>
            {series ? (
              <div className="flex flex-col gap-3">
                <p className="text-small text-default-500">{t("seriesHelp")}</p>
                <label className="flex flex-col gap-1 text-small">
                  <span>{t("weekdayLabel")}</span>
                  <select className={SELECT_CLASS} value={series.weekday} onChange={(event) => setSeries({ ...series, weekday: event.target.value })}>
                    {["1", "2", "3", "4", "5", "6", "7"].map((day) => (
                      <option key={day} value={day}>
                        {tWeekday(day)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <Input type="time" label={t("startTime")} labelPlacement="outside" placeholder=" " value={series.startTime} onValueChange={(startTime) => setSeries({ ...series, startTime })} />
                  <Input type="time" label={t("endTime")} labelPlacement="outside" placeholder=" " value={series.endTime} onValueChange={(endTime) => setSeries({ ...series, endTime })} />
                </div>
                {error ? <p className="text-small text-danger">{error}</p> : null}
              </div>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setSeries(null)}>
              {tCommon("cancel")}
            </Button>
            <Button color="primary" isLoading={busy} onPress={saveSeries}>
              {t("seriesCreate")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ConfirmDialog
        isOpen={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteTitle")}
        message={deleting ? t("deleteMessage", { date: formatDate(deleting.date) }) : ""}
        confirmLabel={tCommon("delete")}
        confirmColor="danger"
        onConfirm={async () => {
          if (!deleting) return;
          const result = await deleteSessionAction({ id: deleting.id });
          if (!result.ok) {
            addToast({ title: result.error, color: "danger" });
            return;
          }
          setDeleting(null);
          router.refresh();
        }}
      />
    </section>
  );
}
