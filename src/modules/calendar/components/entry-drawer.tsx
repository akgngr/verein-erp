"use client";
import {
  toast,
  Link as ActionLink,
  buttonVariants,
  Button,
  Spinner,
  Drawer,
  Checkbox,
  Label,
  TextField,
  Input,
  Description,
  TextArea,
  Select,
  ListBox,
} from "@heroui/react";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import {
  CalendarPlus,
  ExternalLink,
  MapPin,
  Pencil,
  Trash2,
} from "lucide-react";

import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";

import {
  convertToEventAction,
  deleteEntryAction,
  saveEntryAction,
} from "../actions/calendar-actions";
import type { CalendarItemView, CalendarSourceView } from "../types";

export type DrawerState =
  | {
      mode: "create";
      calendarId: string;
      start: Date;
      end: Date;
      allDay: boolean;
    }
  | { mode: "view"; item: CalendarItemView }
  | { mode: "edit"; item: CalendarItemView };

const RECURRENCES = ["NONE", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const;

/** "YYYY-MM-DDTHH:mm" / "YYYY-MM-DD" for native inputs, in local time. */
const pad = (value: number) => String(value).padStart(2, "0");
const toLocalInput = (date: Date, allDay: boolean) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}${allDay ? "" : `T${pad(date.getHours())}:${pad(date.getMinutes())}`}`;
const fromLocalInput = (value: string) =>
  new Date(value.length === 10 ? `${value}T00:00` : value);

type Props = {
  state: DrawerState | null;
  sources: CalendarSourceView[];
  sourceById: Map<string, CalendarSourceView>;
  onClose: () => void;
  onEdit: (item: CalendarItemView) => void;
  onSaved: () => void;
};

export function EntryDrawer({
  state,
  sources,
  sourceById,
  onClose,
  onEdit,
  onSaved,
}: Props) {
  const t = useTranslations("calendar");
  return (
    <Drawer
      isOpen={state !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Drawer.Backdrop>
        <Drawer.Content placement="right">
          <Drawer.Dialog
            className={
              "h-full max-h-dvh w-screen max-w-full rounded-none sm:rounded-l-xl sm:max-w-md"
            }
          >
            <DialogDismissButton drawer />

            {state?.mode === "view" ? (
              <EntryDetail
                item={state.item}
                source={sourceById.get(state.item.sourceId)}
                onEdit={onEdit}
                onChanged={onSaved}
              />
            ) : state ? (
              <EntryForm
                key={state.mode === "edit" ? state.item.id : "new"}
                state={state}
                sources={sources}
                onSaved={onSaved}
                onCancel={onClose}
              />
            ) : (
              <Drawer.Header>
                <Drawer.Heading className="flex items-center gap-2">
                  {t("newEntry")}
                </Drawer.Heading>
              </Drawer.Header>
            )}
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}

function EntryDetail({
  item,
  source,
  onEdit,
  onChanged,
}: {
  item: CalendarItemView;
  source?: CalendarSourceView;
  onEdit: (item: CalendarItemView) => void;
  onChanged: () => void;
}) {
  const t = useTranslations("calendar");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const format = (value: string) =>
    new Intl.DateTimeFormat(
      locale,
      item.allDay
        ? { dateStyle: "full" }
        : { dateStyle: "full", timeStyle: "short" },
    ).format(new Date(value));
  const sameDayEnd =
    item.allDay &&
    new Date(item.end).getTime() - new Date(item.start).getTime() <= 86_400_000;

  const convert = () =>
    startTransition(async () => {
      const response = await convertToEventAction({ id: item.entryId });
      if (!response.ok)
        return void toast(response.error, { variant: "danger" });
      toast(t("converted"), { variant: "success" });
      onChanged();
    });

  return (
    <>
      <Drawer.Header className="flex items-start gap-3">
        <span
          className="mt-1.5 h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: item.color }}
          aria-hidden
        />
        <div className="min-w-0">
          <Drawer.Heading className="text-lg font-semibold">
            {item.title}
          </Drawer.Heading>
          <p className="text-sm font-normal text-ink-500">{source?.label}</p>
        </div>
      </Drawer.Header>
      <Drawer.Body className="gap-3 text-sm">
        <p>
          {format(item.start)}
          {sameDayEnd ? "" : ` – ${format(item.end)}`}
        </p>
        {item.recurrence !== "NONE" ? (
          <p className="text-ink-600">{t(`recurrence.${item.recurrence}`)}</p>
        ) : null}
        {item.location ? (
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-ink-400" />
            {item.location}
          </p>
        ) : null}
        {item.description ? (
          <p className="whitespace-pre-wrap text-ink-700">{item.description}</p>
        ) : null}
        {item.eventId ? (
          <p className="text-success">{t("linkedToEvent")}</p>
        ) : null}
        {!item.entryId ? (
          <p className="text-xs text-ink-500">{t("readOnlySource")}</p>
        ) : null}
      </Drawer.Body>
      <Drawer.Footer className="flex-wrap justify-start">
        {item.href ? (
          <ActionLink
            href={item.href}
            className={buttonVariants({
              variant: actionVariant("default", "flat"),
            })}
          >
            {<ExternalLink className="h-4 w-4" />}
            {t("openRecord")}
          </ActionLink>
        ) : null}
        {item.entryId && item.editable ? (
          <>
            <Button
              onPress={() => onEdit(item)}
              variant={actionVariant("default", "flat")}
            >
              {<Pencil className="h-4 w-4" />}
              {t("edit")}
            </Button>
            {!item.eventId ? (
              <Button
                onPress={convert}
                variant={actionVariant("secondary", "flat")}
                isPending={pending}
              >
                {pending ? <Spinner size="sm" color="current" /> : null}
                {<CalendarPlus className="h-4 w-4" />}
                {t("convertToEvent")}
              </Button>
            ) : null}
            <Button
              onPress={() => setConfirm(true)}
              variant={actionVariant("danger", "light")}
            >
              {<Trash2 className="h-4 w-4" />}
              {t("delete")}
            </Button>
          </>
        ) : null}
      </Drawer.Footer>
      <ConfirmDialog
        isOpen={confirm}
        onOpenChange={setConfirm}
        title={t("deleteTitle")}
        message={
          item.recurrence !== "NONE"
            ? t("deleteSeries")
            : t("deleteMessage", { title: item.title })
        }
        confirmLabel={t("delete")}
        confirmColor="danger"
        onConfirm={async () => {
          const response = await deleteEntryAction({ id: item.entryId });
          if (!response.ok)
            return void toast(response.error, { variant: "danger" });
          onChanged();
        }}
      />
    </>
  );
}

function EntryForm({
  state,
  sources,
  onSaved,
  onCancel,
}: {
  state: Exclude<DrawerState, { mode: "view" }>;
  sources: CalendarSourceView[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("calendar");
  const item = state.mode === "edit" ? state.item : null;
  const initialStart = item
    ? new Date(item.start)
    : (state as { start: Date }).start;
  const initialEnd = item ? new Date(item.end) : (state as { end: Date }).end;
  const initialAllDay = item
    ? item.allDay
    : (state as { allDay: boolean }).allDay;
  const [calendarId, setCalendarId] = useState(
    item?.calendarId ?? (state as { calendarId: string }).calendarId,
  );
  const [title, setTitle] = useState(item?.title ?? "");
  const [location, setLocation] = useState(item?.location ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [allDay, setAllDay] = useState(initialAllDay);
  const [start, setStart] = useState(toLocalInput(initialStart, initialAllDay));
  const [end, setEnd] = useState(toLocalInput(initialEnd, initialAllDay));
  const [recurrence, setRecurrence] = useState<(typeof RECURRENCES)[number]>(
    item?.recurrence ?? "NONE",
  );
  const [interval, setInterval] = useState(
    String(item?.recurrenceInterval ?? 1),
  );
  const [until, setUntil] = useState(
    item?.recurrenceUntil
      ? toLocalInput(new Date(item.recurrenceUntil), true)
      : "",
  );
  const [pending, startTransition] = useTransition();

  // Keep input formats consistent when toggling all-day.
  const toggleAllDay = (value: boolean) => {
    setAllDay(value);
    setStart((current) =>
      current ? toLocalInput(fromLocalInput(current), value) : current,
    );
    setEnd((current) =>
      current ? toLocalInput(fromLocalInput(current), value) : current,
    );
  };

  const save = () =>
    startTransition(async () => {
      const startsAt = fromLocalInput(start);
      let endsAt = fromLocalInput(end || start);
      if (allDay)
        endsAt = new Date(
          endsAt.getFullYear(),
          endsAt.getMonth(),
          endsAt.getDate(),
          23,
          59,
        );
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
        recurrenceUntil:
          recurrence !== "NONE" && until
            ? new Date(`${until}T23:59`).toISOString()
            : null,
      });
      if (!response.ok)
        return void toast(response.error, { variant: "danger" });
      toast(t("saved"), { variant: "success" });
      onSaved();
    });

  return (
    <>
      <Drawer.Header>
        <Drawer.Heading className="flex items-center gap-2">
          {item ? t("editEntry") : t("newEntry")}
        </Drawer.Heading>
      </Drawer.Header>
      <Drawer.Body className="gap-4">
        <TextField
          isRequired
          value={title}
          onChange={setTitle}
          className={["w-full"].filter(Boolean).join(" ")}
        >
          <Label>{t("fields.title")}</Label>
          <Input autoFocus />
        </TextField>
        <Select
          value={calendarId}
          onChange={(selectedValue) => {
            const keys =
              selectedValue === null ? undefined : String(selectedValue);
            return setCalendarId(String(keys ?? calendarId));
          }}
        >
          <Label>{t("fields.calendar")}</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {sources.map((source) => (
                <ListBox.Item
                  key={source.id.slice("calendar:".length)}
                  id={source.id.slice("calendar:".length)}
                  textValue={String(source.label)}
                >
                  <Label>{source.label}</Label>
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        <Checkbox isSelected={allDay} onChange={toggleAllDay}>
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Label>{t("allDay")}</Label>
          </Checkbox.Content>
        </Checkbox>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            value={start}
            onChange={setStart}
            className={["w-full"].filter(Boolean).join(" ")}
          >
            <Label>{t("fields.start")}</Label>
            <Input type={allDay ? "date" : "datetime-local"} />
          </TextField>
          <TextField
            value={end}
            onChange={setEnd}
            className={["w-full"].filter(Boolean).join(" ")}
          >
            <Label>{t("fields.end")}</Label>
            <Input type={allDay ? "date" : "datetime-local"} />
          </TextField>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select
            value={recurrence}
            onChange={(selectedValue) => {
              const keys =
                selectedValue === null ? undefined : String(selectedValue);
              return setRecurrence((keys as typeof recurrence) ?? "NONE");
            }}
          >
            <Label>{t("fields.recurrence")}</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {RECURRENCES.map((value) => (
                  <ListBox.Item
                    key={value}
                    id={value}
                    textValue={String(t(`recurrence.${value}`))}
                  >
                    <Label>{t(`recurrence.${value}`)}</Label>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          {recurrence !== "NONE" ? (
            <>
              <TextField
                value={interval}
                onChange={setInterval}
                className={["w-full"].filter(Boolean).join(" ")}
              >
                <Label>{t("fields.interval")}</Label>
                <Input type="number" min={1} max={99} />
                <Description>{t("fields.intervalHelp")}</Description>
              </TextField>
              <TextField
                value={until}
                onChange={setUntil}
                className={["w-full"].filter(Boolean).join(" ")}
              >
                <Label>{t("fields.until")}</Label>
                <Input type="date" />
                <Description>{t("fields.untilHelp")}</Description>
              </TextField>
            </>
          ) : null}
        </div>
        <TextField
          value={location}
          onChange={setLocation}
          className={["w-full"].filter(Boolean).join(" ")}
        >
          <Label>{t("fields.location")}</Label>
          <Input />
        </TextField>
        <TextField
          value={description}
          onChange={setDescription}
          className={["w-full"].filter(Boolean).join(" ")}
        >
          <Label>{t("fields.description")}</Label>
          <TextArea
            rows={3}
            className={["[field-sizing:content]"].filter(Boolean).join(" ")}
          />
        </TextField>
      </Drawer.Body>
      <Drawer.Footer>
        <Button onPress={onCancel} variant={actionVariant("default", "light")}>
          {t("cancel")}
        </Button>
        <Button
          isDisabled={!title.trim() || !start}
          onPress={save}
          variant={actionVariant("primary", "solid")}
          isPending={pending}
        >
          {pending ? <Spinner size="sm" color="current" /> : null}
          {t("save")}
        </Button>
      </Drawer.Footer>
    </>
  );
}
