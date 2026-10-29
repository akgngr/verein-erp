"use client";

import { useTranslations } from "next-intl";

import {
  Button,
  Input,
  addToast,
} from "@heroui/react";
import { ChevronDown, Trash2, UserPlus, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  addAttendeeGuestAction,
  markAllAttendeesPresentAction,
  removeAttendeeAction,
  updateAttendeeAction,
} from "../actions/attendee-actions";

import { AttendeeAddModal } from "./attendee-add-modal";
import { QuorumBanner } from "./quorum-banner";
import type { AttendeeItem, QuorumInfo } from "../types";
import {
  ATTENDEE_ROLE_VALUES,
  ATTENDANCE_VALUES,
} from "../constants";

/**
 * Katılımcılar sekmesi (7.3): tablo (ad, kayıtlı/konuk, rol seçimi, katılım
 * seçimi, not); kullanıcı ekle, konuk ekle (hızlı giriş), tümünü katıldı
 * işaretle, çıkar. Yeter sayısı bandı üsttedir.
 */
export function AttendeesTab({
  meetingId,
  attendees,
  quorum,
  userOptions,
  editable,
}: {
  meetingId: string;
  attendees: AttendeeItem[];
  quorum: QuorumInfo;
  userOptions: { id: string; label: string }[];
  editable: boolean;
}) {
  const t = useTranslations("meetings.attendees");
  const tAttendance = useTranslations("meetings.attendance");
  const tRole = useTranslations("meetings.attendeeRole");
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [busy, setBusy] = useState(false);

  const update = async (id: string, data: { role?: string; attendance?: string; note?: string }) => {
    const current = attendees.find((attendee) => attendee.id === id);
    if (!current) return;
    const result = await updateAttendeeAction({
      id,
      role: data.role ?? current.role,
      attendance: data.attendance ?? current.attendance,
      note: data.note ?? current.note ?? "",
    });
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    router.refresh();
  };

  const remove = async (id: string, name: string) => {
    const result = await removeAttendeeAction({ id });
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    addToast({ title: t("removedNamedToast", { name }), color: "success" });
    router.refresh();
  };

  const markAll = async () => {
    setBusy(true);
    const result = await markAllAttendeesPresentAction({ meetingId });
    setBusy(false);
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    addToast({ title: t("markedToast", { count: result.data.updated }), color: "success" });
    router.refresh();
  };

  const quickAddGuest = async () => {
    const result = await addAttendeeGuestAction({ meetingId, name: guestName, role: "GUEST" });
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    setGuestName("");
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      <QuorumBanner quorum={quorum} />

      {editable ? (
        <div className="flex flex-wrap items-end gap-2">
          <Button
            size="sm"
            color="primary"
            startContent={<UserPlus className="h-4 w-4" />}
            onPress={() => setModalOpen(true)}
          >
            {t("addUser")}
          </Button>
          <Button
            size="sm"
            variant="flat"
            startContent={<UserCheck className="h-4 w-4" />}
            isLoading={busy}
            onPress={markAll}
          >
            {t("markAll")}
          </Button>
          <div className="flex items-end gap-1">
            <Input
              size="sm"
              label={t("guestName")}
              labelPlacement="outside"
              value={guestName}
              onValueChange={setGuestName}
              placeholder={t("name")}
              classNames={{ base: "w-56" }}
            />
            <Button size="sm" variant="flat" isDisabled={guestName.trim().length < 2} onPress={quickAddGuest}>
              {t("addGuest")}
            </Button>
          </div>
        </div>
      ) : null}

      {attendees.length === 0 ? (
        <p className="text-small text-default-500">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-small">
            <thead>
              <tr className="border-b border-default-200 text-left text-default-500">
                <th className="p-2">{t("name")}</th>
                <th className="p-2">{t("source")}</th>
                <th className="p-2">{t("role")}</th>
                <th className="p-2">{t("attendance")}</th>
                <th className="p-2">{t("note")}</th>
                <th className="p-2 w-12" />
              </tr>
            </thead>
            <tbody>
              {attendees.map((attendee) => (
                <tr key={attendee.id} className="border-b border-default-100">
                  <td className="p-2 font-medium">{attendee.name}</td>
                  <td className="p-2 text-default-500">
                    {attendee.userId ? t("registered") : t("guest")}
                  </td>
                  <td className="p-2">
                    {editable ? (
                      <div className="relative inline-block w-full min-w-[130px]">
                        <select
                          id={`attendee-role-${attendee.id}`}
                          aria-label={t("role")}
                          value={attendee.role}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) void update(attendee.id, { role: val });
                          }}
                          className="h-8 w-full appearance-none rounded-medium bg-default-100 px-2.5 pr-8 text-xs font-medium text-foreground transition-colors hover:bg-default-200 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer border border-transparent focus:border-primary/50"
                        >
                          {ATTENDEE_ROLE_VALUES.map((roleKey) => (
                            <option key={roleKey} value={roleKey} className="bg-background text-foreground">
                              {tRole(roleKey)}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-default-400" aria-hidden="true" />
                      </div>
                    ) : (
                      tRole(attendee.role)
                    )}
                  </td>
                  <td className="p-2">
                    {editable ? (
                      <div className="relative inline-block w-full min-w-[130px]">
                        <select
                          id={`attendee-attendance-${attendee.id}`}
                          aria-label={t("attendance")}
                          value={attendee.attendance}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) void update(attendee.id, { attendance: val });
                          }}
                          className="h-8 w-full appearance-none rounded-medium bg-default-100 px-2.5 pr-8 text-xs font-medium text-foreground transition-colors hover:bg-default-200 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer border border-transparent focus:border-primary/50"
                        >
                          {ATTENDANCE_VALUES.map((statusKey) => (
                            <option key={statusKey} value={statusKey} className="bg-background text-foreground">
                              {tAttendance(statusKey)}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-default-400" aria-hidden="true" />
                      </div>
                    ) : (
                      tAttendance(attendee.attendance)
                    )}
                  </td>
                  <td className="p-2">
                    {editable ? (
                      <Input
                        id={`attendee-note-${attendee.id}`}
                        size="sm"
                        aria-label={t("note")}
                        defaultValue={attendee.note ?? ""}
                        onBlur={(event) => {
                          const note = event.target.value;
                          if (note !== (attendee.note ?? "")) void update(attendee.id, { note });
                        }}
                        classNames={{ input: "text-small" }}
                      />
                    ) : (
                      attendee.note ?? "-"
                    )}
                  </td>
                  <td className="p-2">
                    {editable ? (
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                        aria-label={t("removeConfirm")}
                        onPress={() => remove(attendee.id, attendee.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AttendeeAddModal
        meetingId={meetingId}
        userOptions={userOptions}
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
