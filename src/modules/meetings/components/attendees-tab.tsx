"use client";
import { FormTextField } from "@/shared/components/forms/form-text-field";
import { ActionButton } from "@/shared/components/ui/action-button";
import { notify } from "@/shared/components/ui/notify";

import { useTranslations } from "next-intl";

import { ChevronDown, Trash2, UserPlus, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  addAttendeeGuestAction,
  markAllAttendeesPresentAction,
  removeAttendeeAction,
  updateAttendeeAction,
} from "../actions/attendee-actions";

import Link from "next/link";

import {
  AttendeeAddModal,
  type AttendeeMemberOption,
} from "./attendee-add-modal";
import { QuorumBanner } from "./quorum-banner";
import type { AttendeeItem, QuorumInfo } from "../types";
import { ATTENDEE_ROLE_VALUES, ATTENDANCE_VALUES } from "../constants";

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
  memberOptions,
  canViewMembers,
  editable,
}: {
  meetingId: string;
  attendees: AttendeeItem[];
  quorum: QuorumInfo;
  userOptions: { id: string; label: string }[];
  memberOptions: AttendeeMemberOption[];
  /** Üye adı üye kaydına bağlantı olarak gösterilir. */
  canViewMembers: boolean;
  editable: boolean;
}) {
  const t = useTranslations("meetings.attendees");
  const tAttendance = useTranslations("meetings.attendance");
  const tRole = useTranslations("meetings.attendeeRole");
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [busy, setBusy] = useState(false);

  const update = async (
    id: string,
    data: { role?: string; attendance?: string; note?: string },
  ) => {
    const current = attendees.find((attendee) => attendee.id === id);
    if (!current) return;
    const result = await updateAttendeeAction({
      id,
      role: data.role ?? current.role,
      attendance: data.attendance ?? current.attendance,
      note: data.note ?? current.note ?? "",
    });
    if (!result.ok) {
      notify(result.error, "danger");
      return;
    }
    router.refresh();
  };

  const remove = async (id: string, name: string) => {
    const result = await removeAttendeeAction({ id });
    if (!result.ok) {
      notify(result.error, "danger");
      return;
    }
    notify(t("removedNamedToast", { name }), "success");
    router.refresh();
  };

  const markAll = async () => {
    setBusy(true);
    const result = await markAllAttendeesPresentAction({ meetingId });
    setBusy(false);
    if (!result.ok) {
      notify(result.error, "danger");
      return;
    }
    notify(t("markedToast", { count: result.data.updated }), "success");
    router.refresh();
  };

  const quickAddGuest = async () => {
    const result = await addAttendeeGuestAction({
      meetingId,
      name: guestName,
      role: "GUEST",
    });
    if (!result.ok) {
      notify(result.error, "danger");
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
          <ActionButton
            color="primary"
            variant="solid"
            startIcon={<UserPlus className="h-4 w-4" />}
            onPress={() => setModalOpen(true)}
          >
            {t("addUser")}
          </ActionButton>
          <ActionButton
            color="default"
            variant="flat"
            startIcon={<UserCheck className="h-4 w-4" />}
            isPending={busy}
            onPress={markAll}
          >
            {t("markAll")}
          </ActionButton>
          <div className="flex items-end gap-1">
            <FormTextField
              label={t("guestName")}
              value={guestName}
              onChange={setGuestName}
              placeholder={t("name")}
              className="w-56"
            />
            <ActionButton
              color="default"
              variant="flat"
              isDisabled={guestName.trim().length < 2}
              onPress={quickAddGuest}
            >
              {t("addGuest")}
            </ActionButton>
          </div>
        </div>
      ) : null}

      {attendees.length === 0 ? (
        <p className="text-sm text-ink-500">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-200 text-left text-ink-500">
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
                <tr key={attendee.id} className="border-b border-ink-100">
                  <td className="p-2 font-medium">
                    {attendee.memberId && canViewMembers ? (
                      <Link
                        href={`/uyeler/${attendee.memberId}`}
                        title={t("openMember")}
                        className="text-accent underline-offset-4 hover:underline"
                      >
                        {attendee.name}
                      </Link>
                    ) : (
                      attendee.name
                    )}
                  </td>
                  <td className="p-2 text-ink-500">
                    {attendee.memberId
                      ? t("member")
                      : attendee.userId
                        ? t("registered")
                        : t("guest")}
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
                          className="h-8 w-full appearance-none rounded-lg bg-ink-100 px-2.5 pr-8 text-xs font-medium text-foreground transition-colors hover:bg-ink-200 focus:bg-background focus:outline-none focus:ring-2 focus:ring-accent/40 cursor-pointer border border-transparent focus:border-accent/50"
                        >
                          {ATTENDEE_ROLE_VALUES.map((roleKey) => (
                            <option
                              key={roleKey}
                              value={roleKey}
                              className="bg-background text-foreground"
                            >
                              {tRole(roleKey)}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400"
                          aria-hidden="true"
                        />
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
                            if (val)
                              void update(attendee.id, { attendance: val });
                          }}
                          className="h-8 w-full appearance-none rounded-lg bg-ink-100 px-2.5 pr-8 text-xs font-medium text-foreground transition-colors hover:bg-ink-200 focus:bg-background focus:outline-none focus:ring-2 focus:ring-accent/40 cursor-pointer border border-transparent focus:border-accent/50"
                        >
                          {ATTENDANCE_VALUES.map((statusKey) => (
                            <option
                              key={statusKey}
                              value={statusKey}
                              className="bg-background text-foreground"
                            >
                              {tAttendance(statusKey)}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400"
                          aria-hidden="true"
                        />
                      </div>
                    ) : (
                      tAttendance(attendee.attendance)
                    )}
                  </td>
                  <td className="p-2">
                    {editable ? (
                      <input
                        id={`attendee-note-${attendee.id}`}
                        aria-label={t("note")}
                        defaultValue={attendee.note ?? ""}
                        onBlur={(event) => {
                          const note = event.target.value;
                          if (note !== (attendee.note ?? ""))
                            void update(attendee.id, { note });
                        }}
                        className="h-9 w-full rounded-lg border border-ink-200 bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
                      />
                    ) : (
                      (attendee.note ?? "-")
                    )}
                  </td>
                  <td className="p-2">
                    {editable ? (
                      <ActionButton
                        color="danger"
                        variant="light"
                        isIconOnly
                        ariaLabel={t("removeConfirm")}
                        startIcon={<Trash2 className="h-4 w-4" />}
                        onPress={() => void remove(attendee.id, attendee.name)}
                      >
                        <span className="sr-only">{t("removeConfirm")}</span>
                      </ActionButton>
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
        memberOptions={memberOptions}
        addedMemberIds={attendees.flatMap((attendee) =>
          attendee.memberId ? [attendee.memberId] : [],
        )}
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
