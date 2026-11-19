"use client";

import { notify } from "@/shared/components/ui/notify";
import { Input, Label, Spinner, StatusChip, TextField, Button } from "@/shared/components/kit";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useTranslations, useLocale } from "next-intl";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ChevronDown, Plus, Trash2, Mail, Phone, User } from "lucide-react";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import type { EventAttendeeItem, AttendeeStatus } from "../types";
import { ATTENDEE_STATUSES } from "../constants";
import {
  addAttendeeAction,
  updateAttendeeStatusAction,
  deleteAttendeeAction,
} from "../actions/event-actions";
import { formatDateTimeTr } from "../helpers/event-helpers";

interface AttendeeListProps {
  eventId: string;
  capacity: number | null;
  attendees: EventAttendeeItem[];
}

export function AttendeeList({
  eventId,
  capacity,
  attendees,
}: AttendeeListProps) {
  const tAttendeeStatus = useTranslations("events.attendeeStatus");
  const tA = useTranslations("events.attendees");
  const locale = useLocale();
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [deletingAttendee, setDeletingAttendee] =
    useState<EventAttendeeItem | null>(null);

  const activeCount = attendees.filter((a) => a.status !== "CANCELLED").length;
  const isFull = capacity !== null && activeCount >= capacity;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await addAttendeeAction({
        eventId,
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
        status: "REGISTERED",
        notes: notes || null,
      });

      if (!res.success) {
        setErrorMsg(res.error ?? tA("addFailed"));
        return;
      }

      notify.success(tA("addedToast", { name: `${firstName} ${lastName}` }));

      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setNotes("");
      setIsAdding(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (
    attendeeId: string,
    newStatus: AttendeeStatus,
  ) => {
    setStatusLoadingId(attendeeId);
    try {
      const res = await updateAttendeeStatusAction({
        attendeeId,
        status: newStatus,
      });
      if (res.success) {
        notify.success(tA("statusUpdatedToast"));
        router.refresh();
      } else {
        notify.error(res.error ?? tA("statusFailed"));
      }
    } finally {
      setStatusLoadingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAttendee) return;
    const res = await deleteAttendeeAction(deletingAttendee.id);
    if (res.success) {
      notify.success(
        tA("removedToast", {
          name: `${deletingAttendee.firstName} ${deletingAttendee.lastName}`,
        }));
      setDeletingAttendee(null);
      router.refresh();
    } else {
      notify.error(res.error ?? tA("removeFailed"));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {tA("countTitle", { count: attendees.length })}
          </h3>
          <p className="text-xs text-ink-500">{tA("subtitle")}</p>
        </div>

        {!isAdding && (
          <Button
            size="sm"
            onPress={() => setIsAdding(true)}
            isDisabled={isFull}
            variant={actionVariant("primary", "flat")}
          >
            {<Plus className="h-4 w-4" />}
            {isFull ? tA("full") : tA("addShort")}
          </Button>
        )}
      </div>

      {isAdding && (
        <form
          onSubmit={handleAddSubmit}
          className="p-4 rounded-lg border border-ink-200 bg-surface-secondary/40 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">
              {tA("newRegistration")}
            </span>
            <Button
              size="sm"
              onPress={() => setIsAdding(false)}
              variant={actionVariant("default", "light")}
            >
              {tA("close")}
            </Button>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-danger-50 text-danger-600 text-xs">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            <TextField
              value={firstName}
              isRequired
              className={["w-full"].filter(Boolean).join(" ")}
            >
              <Label>{tA("firstName")}</Label>
              <Input
                onChange={(e) => setFirstName(e.target.value)}
                className={["h-9 text-sm"].filter(Boolean).join(" ")}
              />
            </TextField>
            <TextField
              value={lastName}
              isRequired
              className={["w-full"].filter(Boolean).join(" ")}
            >
              <Label>{tA("lastName")}</Label>
              <Input
                onChange={(e) => setLastName(e.target.value)}
                className={["h-9 text-sm"].filter(Boolean).join(" ")}
              />
            </TextField>
            <TextField
              value={email}
              className={["w-full"].filter(Boolean).join(" ")}
            >
              <Label>{tA("email")}</Label>
              <Input
                type="email"
                onChange={(e) => setEmail(e.target.value)}
                className={["h-9 text-sm"].filter(Boolean).join(" ")}
              />
            </TextField>
            <TextField
              value={phone}
              className={["w-full"].filter(Boolean).join(" ")}
            >
              <Label>{tA("phone")}</Label>
              <Input
                onChange={(e) => setPhone(e.target.value)}
                className={["h-9 text-sm"].filter(Boolean).join(" ")}
              />
            </TextField>
          </div>

          <TextField
            value={notes}
            className={["w-full"].filter(Boolean).join(" ")}
          >
            <Label>{tA("specialNote")}</Label>
            <Input
              onChange={(e) => setNotes(e.target.value)}
              className={["h-9 text-sm"].filter(Boolean).join(" ")}
            />
          </TextField>

          <div className="flex justify-end gap-2 mt-1">
            <Button
              size="sm"
              onPress={() => setIsAdding(false)}
              isDisabled={loading}
              variant={actionVariant("default", "flat")}
            >
              {tA("cancel")}
            </Button>
            <Button
              size="sm"
              type="submit"
              variant={actionVariant("primary", "solid")}
              isPending={loading}
            >
              {loading ? <Spinner size="sm" tone="current" /> : null}
              {tA("complete")}
            </Button>
          </div>
        </form>
      )}

      {attendees.length === 0 ? (
        <div className="p-8 text-center rounded-lg border border-dashed border-ink-200 text-ink-400 text-xs">
          {tA("emptyShort")}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-ink-200 bg-surface shadow-xs">
          <table className="w-full text-left text-xs text-foreground">
            <thead className="bg-ink-50 text-ink-600 font-semibold uppercase tracking-wider text-[11px] border-b border-ink-200">
              <tr>
                <th className="py-3 px-4">{tA("colName")}</th>
                <th className="py-3 px-4">{tA("colType")}</th>
                <th className="py-3 px-4">{tA("colContact")}</th>
                <th className="py-3 px-4">{tA("colRegistered")}</th>
                <th className="py-3 px-4 w-44">{tA("colStatus")}</th>
                <th className="py-3 px-4 text-right">{tA("colAction")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 font-medium">
              {attendees.map((attendee) => {
                const fullName = `${attendee.firstName} ${attendee.lastName}`;
                const isMember = Boolean(attendee.memberId);

                return (
                  <tr
                    key={attendee.id}
                    className="hover:bg-ink-50/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-ink-100 flex items-center justify-center text-ink-600">
                          <User className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-semibold text-foreground">
                          {fullName}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <StatusChip tone={isMember ? "primary" : "default"}
                      >
                        {isMember ? tA("member") : tA("guest")}
                      </StatusChip>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-0.5 text-ink-500">
                        {attendee.email && (
                          <span className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3 text-ink-400" />
                            {attendee.email}
                          </span>
                        )}
                        {attendee.phone && (
                          <span className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-ink-400" />
                            {attendee.phone}
                          </span>
                        )}
                        {!attendee.email && !attendee.phone && (
                          <span className="italic text-ink-400">-</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-ink-600">
                          {formatDateTimeTr(attendee.registeredAt, locale)}
                        </span>
                        {attendee.notes && (
                          <span className="text-[11px] text-ink-400 italic">
                            {attendee.notes}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* SSR HYDRATION KURALI: Tablo içi styled native select */}
                    <td className="py-3 px-4">
                      <div className="relative inline-block w-full">
                        <select
                          value={attendee.status}
                          disabled={statusLoadingId === attendee.id}
                          onChange={(e) =>
                            handleStatusChange(
                              attendee.id,
                              e.target.value as AttendeeStatus,
                            )
                          }
                          className="h-8 w-full appearance-none rounded-lg bg-ink-100 px-2.5 pr-8 text-xs font-medium text-foreground transition-colors hover:bg-ink-200 focus:bg-background focus:outline-none focus:ring-2 focus:ring-accent/40 cursor-pointer border border-transparent focus:border-accent/50 disabled:opacity-50"
                        >
                          {ATTENDEE_STATUSES.map((status) => (
                            <option key={status.value} value={status.value}>
                              {tAttendeeStatus(status.value)}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400" />
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        isIconOnly
                        aria-label={tA("removeTitle")}
                        onPress={() => setDeletingAttendee(attendee)}
                        variant={actionVariant("danger", "light")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deletingAttendee)}
        onOpenChange={(open) => !open && setDeletingAttendee(null)}
        title={tA("removeTitle")}
        message={tA("removeMessage", {
          name: `${deletingAttendee?.firstName ?? ""} ${deletingAttendee?.lastName ?? ""}`,
        })}
        confirmLabel={tA("removeConfirm")}
        confirmColor="danger"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
