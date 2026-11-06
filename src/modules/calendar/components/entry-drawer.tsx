"use client";

import { addToast, Button, Checkbox, Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader, Input, Select, SelectItem, Textarea } from "@heroui/react";
import { CalendarPlus, ExternalLink, MapPin, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { FORM_DRAWER_PROPS } from "@/shared/components/forms/form-drawer";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";

import { convertToEventAction, deleteEntryAction, saveEntryAction } from "../actions/calendar-actions";
import type { CalendarItemView, CalendarSourceView } from "../types";

export type DrawerState =
  | { mode: "create"; calendarId: string; start: Date; end: Date; allDay: boolean }
  | { mode: "view"; item: CalendarItemView }
  | { mode: "edit"; item: CalendarItemView };

const RECURRENCES = ["NONE", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const;

/** "YYYY-MM-DDTHH:mm" / "YYYY-MM-DD" for native inputs, in local time. */
const pad = (value: number) => String(value).padStart(2, "0");
const toLocalInput = (date: Date, allDay: boolean) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}${allDay ? "" : `T${pad(date.getHours())}:${pad(date.getMinutes())}`}`;
const fromLocalInput = (value: string) => new Date(value.length === 10 ? `${value}T00:00` : value);

type Props = {
  state: DrawerState | null;
  sources: CalendarSourceView[];
  sourceById: Map<string, CalendarSourceView>;
  onClose: () => void;
  onEdit: (item: CalendarItemView) => void;
  onSaved: () => void;
};

export function EntryDrawer({ state, sources, sourceById, onClose, onEdit, onSaved }: Props) {
  const t = useTranslations("calendar");
  return (
    <Drawer isOpen={state !== null} onOpenChange={(open) => { if (!open) onClose(); }} size="md" {...FORM_DRAWER_PROPS}>
      <DrawerContent>
        {state?.mode === "view" ? (
          <EntryDetail item={state.item} source={sourceById.get(state.item.sourceId)} onEdit={onEdit} onChanged={onSaved} />
        ) : state ? (
          <EntryForm key={state.mode === "edit" ? state.item.id : "new"} state={state} sources={sources} onSaved={onSaved} onCancel={onClose} />
        ) : (
          <DrawerHeader>{t("newEntry")}</DrawerHeader>
        )}
      </DrawerContent>
    </Drawer>
  );
}

function EntryDetail({ item, source, onEdit, onChanged }: { item: CalendarItemView; source?: CalendarSourceView; onEdit: (item: CalendarItemView) => void; onChanged: () => void }) {
  const t = useTranslations("calendar");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const format = (value: string) => new Intl.DateTimeFormat(locale, item.allDay ? { dateStyle: "full" } : { dateStyle: "full", timeStyle: "short" }).format(new Date(value));
  const sameDayEnd = item.allDay && new Date(item.end).getTime() - new Date(item.start).getTime() <= 86_400_000;

  const convert = () => startTransition(async () => {
    const response = await convertToEventAction({ id: item.entryId });
    if (!response.ok) return void addToast({ title: response.error, color: "danger" });
    addToast({ title: t("converted"), color: "success" });
    onChanged();
  });

  return (
    <>
      <DrawerHeader className="flex items-start gap-3">
        <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
        <div className="min-w-0">
          <p className="text-large font-semibold">{item.title}</p>
          <p className="text-small font-normal text-default-500">{source?.label}</p>
        </div>
      </DrawerHeader>
      <DrawerBody className="gap-3 text-small">
        <p>{format(item.start)}{sameDayEnd ? "" : ` – ${format(item.end)}`}</p>
        {item.recurrence !== "NONE" ? <p className="text-default-600">{t(`recurrence.${item.recurrence}`)}</p> : null}
        {item.location ? <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-default-400" />{item.location}</p> : null}
        {item.description ? <p className="whitespace-pre-wrap text-default-700">{item.description}</p> : null}
        {item.eventId ? <p className="text-success">{t("linkedToEvent")}</p> : null}
        {!item.entryId ? <p className="text-tiny text-default-500">{t("readOnlySource")}</p> : null}
      </DrawerBody>
      <DrawerFooter className="flex-wrap justify-start">
        {item.href ? (
          <Button as={Link} href={item.href} variant="flat" startContent={<ExternalLink className="h-4 w-4" />}>{t("openRecord")}</Button>
        ) : null}
        {item.entryId && item.editable ? (
          <>
            <Button variant="flat" startContent={<Pencil className="h-4 w-4" />} onPress={() => onEdit(item)}>{t("edit")}</Button>
            {!item.eventId ? (
              <Button variant="flat" color="secondary" isLoading={pending} startContent={<CalendarPlus className="h-4 w-4" />} onPress={convert}>{t("convertToEvent")}</Button>
            ) : null}
            <Button variant="light" color="danger" startContent={<Trash2 className="h-4 w-4" />} onPress={() => setConfirm(true)}>{t("delete")}</Button>
          </>
        ) : null}
      </DrawerFooter>
      <ConfirmDialog
        isOpen={confirm}
        onOpenChange={setConfirm}
        title={t("deleteTitle")}
        message={item.recurrence !== "NONE" ? t("deleteSeries") : t("deleteMessage", { title: item.title })}
        confirmLabel={t("delete")}
        confirmColor="danger"
        onConfirm={async () => {
          const response = await deleteEntryAction({ id: item.entryId });
          if (!response.ok) return void addToast({ title: response.error, color: "danger" });
          onChanged();
        }}
      />
    </>
  );
}

function EntryForm({ state, sources, onSaved, onCancel }: { state: Exclude<DrawerState, { mode: "view" }>; sources: CalendarSourceView[]; onSaved: () => void; onCancel: () => void }) {
  const t = useTranslations("calendar");
  const item = state.mode === "edit" ? state.item : null;
  const initialStart = item ? new Date(item.start) : (state as { start: Date }).start;
  const initialEnd = item ? new Date(item.end) : (state as { end: Date }).end;
  const initialAllDay = item ? item.allDay : (state as { allDay: boolean }).allDay;
  const [calendarId, setCalendarId] = useState(item?.calendarId ?? (state as { calendarId: string }).calendarId);
  const [title, setTitle] = useState(item?.title ?? "");
  const [location, setLocation] = useState(item?.location ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [allDay, setAllDay] = useState(initialAllDay);
  const [start, setStart] = useState(toLocalInput(initialStart, initialAllDay));
  const [end, setEnd] = useState(toLocalInput(initialEnd, initialAllDay));
  const [recurrence, setRecurrence] = useState<(typeof RECURRENCES)[number]>(item?.recurrence ?? "NONE");
  const [interval, setInterval] = useState(String(item?.recurrenceInterval ?? 1));
  const [until, setUntil] = useState(item?.recurrenceUntil ? toLocalInput(new Date(item.recurrenceUntil), true) : "");
  const [pending, startTransition] = useTransition();

  // Keep input formats consistent when toggling all-day.
  const toggleAllDay = (value: boolean) => {
    setAllDay(value);
    setStart((current) => (current ? toLocalInput(fromLocalInput(current), value) : current));
    setEnd((current) => (current ? toLocalInput(fromLocalInput(current), value) : current));
  };

  const save = () => startTransition(async () => {
    const startsAt = fromLocalInput(start);
    let endsAt = fromLocalInput(end || start);
    if (allDay) endsAt = new Date(endsAt.getFullYear(), endsAt.getMonth(), endsAt.getDate(), 23, 59);
    const response = await saveEntryAction({
      id: item?.entryId ?? undefined,
      calendarId,
      title,
      location: location || null,
      description: description || null,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      allDay,
      recurrence,
      recurrenceInterval: Math.max(1, Number(interval) || 1),
      recurrenceUntil: recurrence !== "NONE" && until ? new Date(`${until}T23:59`).toISOString() : null,
    });
    if (!response.ok) return void addToast({ title: response.error, color: "danger" });
    addToast({ title: t("saved"), color: "success" });
    onSaved();
  });

  return (
    <>
      <DrawerHeader>{item ? t("editEntry") : t("newEntry")}</DrawerHeader>
      <DrawerBody className="gap-4">
        <Input autoFocus label={t("fields.title")} isRequired value={title} onValueChange={setTitle} />
        <Select label={t("fields.calendar")} selectedKeys={[calendarId]} onSelectionChange={(keys) => setCalendarId(String(Array.from(keys)[0] ?? calendarId))}>
          {sources.map((source) => <SelectItem key={source.id.slice("calendar:".length)}>{source.label}</SelectItem>)}
        </Select>
        <Checkbox isSelected={allDay} onValueChange={toggleAllDay}>{t("allDay")}</Checkbox>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input type={allDay ? "date" : "datetime-local"} label={t("fields.start")} value={start} onValueChange={setStart} />
          <Input type={allDay ? "date" : "datetime-local"} label={t("fields.end")} value={end} onValueChange={setEnd} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select label={t("fields.recurrence")} selectedKeys={[recurrence]} onSelectionChange={(keys) => setRecurrence((Array.from(keys)[0] as typeof recurrence) ?? "NONE")}>
            {RECURRENCES.map((value) => <SelectItem key={value}>{t(`recurrence.${value}`)}</SelectItem>)}
          </Select>
          {recurrence !== "NONE" ? (
            <>
              <Input type="number" min={1} max={99} label={t("fields.interval")} description={t("fields.intervalHelp")} value={interval} onValueChange={setInterval} />
              <Input type="date" label={t("fields.until")} description={t("fields.untilHelp")} value={until} onValueChange={setUntil} />
            </>
          ) : null}
        </div>
        <Input label={t("fields.location")} value={location} onValueChange={setLocation} />
        <Textarea label={t("fields.description")} minRows={3} value={description} onValueChange={setDescription} />
      </DrawerBody>
      <DrawerFooter>
        <Button variant="light" onPress={onCancel}>{t("cancel")}</Button>
        <Button color="primary" isLoading={pending} isDisabled={!title.trim() || !start} onPress={save}>{t("save")}</Button>
      </DrawerFooter>
    </>
  );
}
