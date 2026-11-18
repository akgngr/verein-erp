"use client";

import { notify } from "@/shared/components/ui/notify";import { Button } from "@heroui/react";
import { Checkbox, Dialog, Input, Label, Spinner, StatusChip, TextArea, TextField } from "@/shared/components/kit";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { CalendarPlus, Pencil, Repeat, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { useTranslateMessage } from "@/shared/i18n/use-translate-message";
import { formatDate } from "@/shared/utils";

import {
  createSessionAction,
  createSessionSeriesAction,
  deleteSessionAction,
  updateSessionAction,
} from "../actions/session-actions";
import type { SessionRow } from "../types";
import { formatDateOnly } from "../utils";

const SELECT_CLASS =
  "h-10 w-full rounded-lg border border-ink-200 bg-ink-50/50 px-3 text-sm outline-none focus:border-accent";

type Draft = {
  id?: string;
  date: string;
  startTime: string;
  endTime: string;
  topic: string;
  teacherId: string;
  isCancelled: boolean;
  note: string;
};

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
  const [series, setSeries] = useState<{
    weekday: string;
    startTime: string;
    endTime: string;
  } | null>(null);
  const [deleting, setDeleting] = useState<SessionRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const openNew = () =>
    setDraft({
      date: "",
      startTime: "",
      endTime: "",
      topic: "",
      teacherId: "",
      isCancelled: false,
      note: "",
    });

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    const payload = { courseId, ...draft };
    const result = draft.id
      ? await updateSessionAction(payload)
      : await createSessionAction(payload);
    setBusy(false);
    if (!result.ok) {
      const fieldError = result.fieldErrors
        ? Object.values(result.fieldErrors)[0]?.[0]
        : undefined;
      setError(translateMessage(fieldError) ?? result.error);
      return;
    }
    notify.success(t("saved"));
    setDraft(null);
    router.refresh();
  };

  const saveSeries = async () => {
    if (!series) return;
    setBusy(true);
    setError(null);
    const result = await createSessionSeriesAction({
      courseId,
      weekday: series.weekday,
      startTime: series.startTime,
      endTime: series.endTime,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    notify.success(t("seriesCreated", { count: result.data.created }));
    setSeries(null);
    router.refresh();
  };

  return (
    <section className="flex flex-col gap-4">
      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          <Button onPress={openNew} variant={actionVariant("primary", "solid")}>
            {<CalendarPlus className="h-4 w-4" aria-hidden />}
            {t("add")}
          </Button>
          <Button
            onPress={() =>
              setSeries({ weekday: "2", startTime: "", endTime: "" })
            }
            variant={actionVariant("default", "flat")}
          >
            {<Repeat className="h-4 w-4" aria-hidden />}
            {t("series")}
          </Button>
        </div>
      ) : null}
      {sessions.length === 0 ? (
        <p className="text-sm text-ink-500">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-200 bg-surface p-3"
            >
              <div className="flex min-w-0 flex-col">
                <span
                  className={`text-sm font-medium ${session.isCancelled ? "text-ink-400 line-through" : ""}`}
                >
                  {formatDate(session.date)}
                  {session.startTime
                    ? ` · ${session.startTime}${session.endTime ? `–${session.endTime}` : ""}`
                    : ""}
                  {session.topic ? ` · ${session.topic}` : ""}
                </span>
                <span className="text-xs text-ink-500">
                  {[session.teacherName, session.note]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {session.isCancelled ? (
                  <StatusChip tone="danger">
                    {t("cancelled")}
                  </StatusChip>
                ) : null}
                {canEdit ? (
                  <>
                    <Button
                      isIconOnly
                      size="sm"
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
                      variant={actionVariant("default", "light")}
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      aria-label={tCommon("delete")}
                      onPress={() => setDeleting(session)}
                      variant={actionVariant("danger", "light")}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        isOpen={draft !== null}
        onOpenChange={(open) => !open && setDraft(null)} size="md" className={"w-full max-w-md "}>
              <DialogDismissButton />

              <Dialog.Header>
                <Dialog.Heading className="flex items-center gap-2">
                  {draft?.id ? t("editTitle") : t("addTitle")}
                </Dialog.Heading>
              </Dialog.Header>
              <Dialog.Body>
                {draft ? (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-3 gap-3">
                      <TextField
                        value={draft.date}
                        isRequired
                        onChange={(date) => setDraft({ ...draft, date })}
                        className={["w-full"].filter(Boolean).join(" ")}
                      >
                        <Label>{t("date")}</Label>
                        <Input type="date" placeholder=" " />
                      </TextField>
                      <TextField
                        value={draft.startTime}
                        onChange={(startTime) =>
                          setDraft({ ...draft, startTime })
                        }
                        className={["w-full"].filter(Boolean).join(" ")}
                      >
                        <Label>{t("startTime")}</Label>
                        <Input type="time" placeholder=" " />
                      </TextField>
                      <TextField
                        value={draft.endTime}
                        onChange={(endTime) => setDraft({ ...draft, endTime })}
                        className={["w-full"].filter(Boolean).join(" ")}
                      >
                        <Label>{t("endTime")}</Label>
                        <Input type="time" placeholder=" " />
                      </TextField>
                    </div>
                    <TextField
                      value={draft.topic}
                      onChange={(topic) => setDraft({ ...draft, topic })}
                      className={["w-full"].filter(Boolean).join(" ")}
                    >
                      <Label>{t("topic")}</Label>
                      <Input placeholder=" " maxLength={200} />
                    </TextField>
                    <label className="flex flex-col gap-1 text-sm">
                      <span>{t("teacher")}</span>
                      <select
                        className={SELECT_CLASS}
                        value={draft.teacherId}
                        onChange={(event) =>
                          setDraft({ ...draft, teacherId: event.target.value })
                        }
                      >
                        <option value="">{t("noTeacher")}</option>
                        {teacherOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <TextField
                      value={draft.note}
                      onChange={(note) => setDraft({ ...draft, note })}
                      className={["w-full"].filter(Boolean).join(" ")}
                    >
                      <Label>{t("note")}</Label>
                      <TextArea
                        maxLength={500}
                        rows={2}
                        className={["[field-sizing:content]"]
                          .filter(Boolean)
                          .join(" ")}
                      />
                    </TextField>
                    <Checkbox
                      isSelected={draft.isCancelled}
                      onChange={(isCancelled) =>
                        setDraft({ ...draft, isCancelled })
                      }
                    >
                        <Label>{t("markCancelled")}</Label>
                    </Checkbox>
                    {error ? (
                      <p className="text-sm text-danger">{error}</p>
                    ) : null}
                  </div>
                ) : null}
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  onPress={() => setDraft(null)}
                  variant={actionVariant("default", "light")}
                >
                  {tCommon("cancel")}
                </Button>
                <Button
                  isDisabled={!draft?.date}
                  onPress={save}
                  variant={actionVariant("primary", "solid")}
                  isPending={busy}
                >
                  {busy ? <Spinner size="sm" tone="current" /> : null}
                  {tCommon("save")}
                </Button>
              </Dialog.Footer>
      </Dialog>

      <Dialog
        isOpen={series !== null}
        onOpenChange={(open) => !open && setSeries(null)} size="md" className={"w-full max-w-md "}>
              <DialogDismissButton />

              <Dialog.Header>
                <Dialog.Heading className="flex items-center gap-2">
                  {t("seriesTitle")}
                </Dialog.Heading>
              </Dialog.Header>
              <Dialog.Body>
                {series ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-ink-500">{t("seriesHelp")}</p>
                    <label className="flex flex-col gap-1 text-sm">
                      <span>{t("weekdayLabel")}</span>
                      <select
                        className={SELECT_CLASS}
                        value={series.weekday}
                        onChange={(event) =>
                          setSeries({ ...series, weekday: event.target.value })
                        }
                      >
                        {["1", "2", "3", "4", "5", "6", "7"].map((day) => (
                          <option key={day} value={day}>
                            {tWeekday(day)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <TextField
                        value={series.startTime}
                        onChange={(startTime) =>
                          setSeries({ ...series, startTime })
                        }
                        className={["w-full"].filter(Boolean).join(" ")}
                      >
                        <Label>{t("startTime")}</Label>
                        <Input type="time" placeholder=" " />
                      </TextField>
                      <TextField
                        value={series.endTime}
                        onChange={(endTime) =>
                          setSeries({ ...series, endTime })
                        }
                        className={["w-full"].filter(Boolean).join(" ")}
                      >
                        <Label>{t("endTime")}</Label>
                        <Input type="time" placeholder=" " />
                      </TextField>
                    </div>
                    {error ? (
                      <p className="text-sm text-danger">{error}</p>
                    ) : null}
                  </div>
                ) : null}
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  onPress={() => setSeries(null)}
                  variant={actionVariant("default", "light")}
                >
                  {tCommon("cancel")}
                </Button>
                <Button
                  onPress={saveSeries}
                  variant={actionVariant("primary", "solid")}
                  isPending={busy}
                >
                  {busy ? <Spinner size="sm" tone="current" /> : null}
                  {t("seriesCreate")}
                </Button>
              </Dialog.Footer>
      </Dialog>

      <ConfirmDialog
        isOpen={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteTitle")}
        message={
          deleting
            ? t("deleteMessage", { date: formatDate(deleting.date) })
            : ""
        }
        confirmLabel={tCommon("delete")}
        confirmColor="danger"
        onConfirm={async () => {
          if (!deleting) return;
          const result = await deleteSessionAction({ id: deleting.id });
          if (!result.ok) {
            notify.error(result.error);
            return;
          }
          setDeleting(null);
          router.refresh();
        }}
      />
    </section>
  );
}
