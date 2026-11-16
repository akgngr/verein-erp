"use client";
import {
  toast,
  Button,
  Spinner,
  Drawer,
  Checkbox,
  Label,
  TextField,
  Input,
  TextArea,
} from "@heroui/react";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useTranslations } from "next-intl";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ChevronDown } from "lucide-react";
import { EVENT_TYPES, EVENT_STATUSES } from "../constants";
import { createEventAction, updateEventAction } from "../actions/event-actions";
import type { EventRow, EventType, EventStatus } from "../types";

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit?: EventRow | null;
}

export function EventFormModal({
  isOpen,
  onClose,
  eventToEdit,
}: EventFormModalProps) {
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("events.status");
  const tTypes = useTranslations("events.types");
  const tFields = useTranslations("events.fields");
  const tForm = useTranslations("events.form");
  const router = useRouter();
  const isEditing = Boolean(eventToEdit);

  const [title, setTitle] = useState(eventToEdit?.title ?? "");
  const [description, setDescription] = useState(
    eventToEdit?.description ?? "",
  );
  const [type, setType] = useState<EventType>(eventToEdit?.type ?? "OTHER");
  const [status, setStatus] = useState<EventStatus>(
    eventToEdit?.status ?? "PUBLISHED",
  );
  const [startDate, setStartDate] = useState(
    eventToEdit?.startDate
      ? new Date(eventToEdit.startDate).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
  );
  const [endDate, setEndDate] = useState(
    eventToEdit?.endDate
      ? new Date(eventToEdit.endDate).toISOString().slice(0, 16)
      : "",
  );
  const [location, setLocation] = useState(eventToEdit?.location ?? "");
  const [isOnline, setIsOnline] = useState(eventToEdit?.isOnline ?? false);
  const [onlineUrl, setOnlineUrl] = useState(eventToEdit?.onlineUrl ?? "");
  const [capacity, setCapacity] = useState<string>(
    eventToEdit?.capacity ? String(eventToEdit.capacity) : "",
  );

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      if (isEditing && eventToEdit) {
        const res = await updateEventAction({
          id: eventToEdit.id,
          title,
          description: description || null,
          type,
          status,
          startDate,
          endDate: endDate || null,
          location: location || null,
          isOnline,
          onlineUrl: isOnline && onlineUrl ? onlineUrl : null,
          capacity: capacity ? parseInt(capacity, 10) : null,
        });

        if (!res.success) {
          setErrorMessage(res.error ?? "Güncelleme başarısız oldu.");
          setLoading(false);
          return;
        }
      } else {
        const res = await createEventAction({
          title,
          description: description || null,
          type,
          status,
          startDate,
          endDate: endDate || null,
          location: location || null,
          isOnline,
          onlineUrl: isOnline && onlineUrl ? onlineUrl : null,
          capacity: capacity ? parseInt(capacity, 10) : null,
        });

        if (!res.success) {
          setErrorMessage(res.error ?? tForm("createFailed"));
          setLoading(false);
          return;
        }
      }

      if (isEditing) {
        toast(tForm("updatedToast"), { variant: "success" });
      } else {
        toast(tForm("createdToast"), { variant: "success" });
      }

      onClose();
      router.refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : tForm("genericError"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer isOpen={isOpen} onOpenChange={onClose}>
      <Drawer.Backdrop>
        <Drawer.Content placement="right">
          <Drawer.Dialog
            className={
              "h-full max-h-dvh w-screen max-w-full rounded-none sm:rounded-l-xl sm:max-w-2xl"
            }
          >
            {() => (
              <form
                onSubmit={handleSubmit}
                className="flex h-full min-h-0 flex-col"
              >
                <DialogDismissButton drawer />
                <Drawer.Header className="flex flex-col gap-1">
                  <Drawer.Heading className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-foreground">
                      {isEditing ? tForm("editTitle") : tForm("createTitle")}
                    </span>
                  </Drawer.Heading>
                  <span className="text-xs text-ink-500 font-normal">
                    {tForm("subtitle")}
                  </span>
                </Drawer.Header>

                <Drawer.Body className="gap-4">
                  {errorMessage && (
                    <div className="p-3 text-xs rounded-lg bg-danger-50 text-danger-600 border border-danger-200">
                      {errorMessage}
                    </div>
                  )}

                  <TextField
                    value={title}
                    isRequired
                    className={["w-full"].filter(Boolean).join(" ")}
                  >
                    <Label>{tFields("title")}</Label>
                    <Input
                      placeholder={tForm("titlePlaceholder")}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </TextField>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-foreground">
                        {tFields("type")}
                      </label>
                      <div className="relative inline-block w-full">
                        <select
                          value={type}
                          onChange={(e) => setType(e.target.value as EventType)}
                          className="h-10 w-full appearance-none rounded-lg bg-ink-100 px-3 pr-8 text-sm text-foreground transition-colors hover:bg-ink-200 focus:bg-background focus:outline-none focus:ring-2 focus:ring-accent/40 cursor-pointer border border-transparent focus:border-accent/50"
                        >
                          {EVENT_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {tTypes(t.value)}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-foreground">
                        {tForm("publishStatus")}
                      </label>
                      <div className="relative inline-block w-full">
                        <select
                          value={status}
                          onChange={(e) =>
                            setStatus(e.target.value as EventStatus)
                          }
                          className="h-10 w-full appearance-none rounded-lg bg-ink-100 px-3 pr-8 text-sm text-foreground transition-colors hover:bg-ink-200 focus:bg-background focus:outline-none focus:ring-2 focus:ring-accent/40 cursor-pointer border border-transparent focus:border-accent/50"
                        >
                          {EVENT_STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {tStatus(s.value)}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <TextField
                      value={startDate}
                      isRequired
                      className={["w-full"].filter(Boolean).join(" ")}
                    >
                      <Label>{tFields("startDate")}</Label>
                      <Input
                        type="datetime-local"
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </TextField>

                    <TextField
                      value={endDate}
                      className={["w-full"].filter(Boolean).join(" ")}
                    >
                      <Label>{tForm("endOptional")}</Label>
                      <Input
                        type="datetime-local"
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </TextField>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Checkbox isSelected={isOnline} onChange={setIsOnline}>
                      <Checkbox.Content>
                        <Checkbox.Control className="size-4">
                          <Checkbox.Indicator />
                        </Checkbox.Control>
                        <Label>{tForm("isOnlineLabel")}</Label>
                      </Checkbox.Content>
                    </Checkbox>

                    {isOnline ? (
                      <TextField
                        value={onlineUrl}
                        className={["w-full"].filter(Boolean).join(" ")}
                      >
                        <Label>{tForm("onlineUrl")}</Label>
                        <Input
                          placeholder={tForm("onlineUrlPlaceholder")}
                          onChange={(e) => setOnlineUrl(e.target.value)}
                        />
                      </TextField>
                    ) : (
                      <TextField
                        value={location}
                        className={["w-full"].filter(Boolean).join(" ")}
                      >
                        <Label>{tForm("physicalLocation")}</Label>
                        <Input
                          placeholder={tForm("locationPlaceholder")}
                          onChange={(e) => setLocation(e.target.value)}
                        />
                      </TextField>
                    )}
                  </div>

                  <TextField
                    value={capacity}
                    className={["w-full"].filter(Boolean).join(" ")}
                  >
                    <Label>{tForm("capacityOptional")}</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder={tForm("capacityPlaceholder")}
                      onChange={(e) => setCapacity(e.target.value)}
                    />
                  </TextField>

                  <TextField
                    value={description}
                    className={["w-full"].filter(Boolean).join(" ")}
                  >
                    <Label>{tForm("descriptionLabel")}</Label>
                    <TextArea
                      placeholder={tForm("descriptionPlaceholder")}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className={["[field-sizing:content]"]
                        .filter(Boolean)
                        .join(" ")}
                    />
                  </TextField>
                </Drawer.Body>

                <Drawer.Footer>
                  <Button
                    onPress={onClose}
                    isDisabled={loading}
                    variant={actionVariant("default", "flat")}
                  >
                    {tCommon("cancel")}
                  </Button>
                  <Button
                    type="submit"
                    variant={actionVariant("primary", "solid")}
                    isPending={loading}
                  >
                    {loading ? <Spinner size="sm" color="current" /> : null}
                    {isEditing ? tForm("saveChanges") : tForm("create")}
                  </Button>
                </Drawer.Footer>
              </form>
            )}
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
