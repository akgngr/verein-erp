"use client";

import {
  Button,
  Select,
  SelectItem,
  Input,
  addToast,
} from "@heroui/react";
import { Trash2, UserPlus, UserCheck } from "lucide-react";
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
  ATTENDEE_ROLE_LABELS,
  ATTENDANCE_LABELS,
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
    addToast({ title: `Katılımcı çıkarıldı: ${name}`, color: "success" });
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
    addToast({ title: `${result.data.updated} katılımcı 'Katıldı' olarak işaretlendi`, color: "success" });
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
            Kullanıcı ekle
          </Button>
          <Button
            size="sm"
            variant="flat"
            startContent={<UserCheck className="h-4 w-4" />}
            isLoading={busy}
            onPress={markAll}
          >
            Tümünü katıldı işaretle
          </Button>
          <div className="flex items-end gap-1">
            <Input
              size="sm"
              label="Konuk adı"
              labelPlacement="outside"
              value={guestName}
              onValueChange={setGuestName}
              placeholder="Ad Soyad"
              classNames={{ base: "w-56" }}
            />
            <Button size="sm" variant="flat" isDisabled={guestName.trim().length < 2} onPress={quickAddGuest}>
              Konuk ekle
            </Button>
          </div>
        </div>
      ) : null}

      {attendees.length === 0 ? (
        <p className="text-small text-default-500">Katılımcı kaydı yok.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-small">
            <thead>
              <tr className="border-b border-default-200 text-left text-default-500">
                <th className="p-2">Ad Soyad</th>
                <th className="p-2">Kaynak</th>
                <th className="p-2">Görev</th>
                <th className="p-2">Katılım</th>
                <th className="p-2">Not</th>
                <th className="p-2 w-12" />
              </tr>
            </thead>
            <tbody>
              {attendees.map((attendee) => (
                <tr key={attendee.id} className="border-b border-default-100">
                  <td className="p-2 font-medium">{attendee.name}</td>
                  <td className="p-2 text-default-500">
                    {attendee.userId ? "Kayıtlı kullanıcı" : "Konuk"}
                  </td>
                  <td className="p-2">
                    {editable ? (
                      <Select
                        size="sm"
                        aria-label="Görev"
                        selectedKeys={new Set([attendee.role])}
                        onSelectionChange={(keys) => {
                          const key = Array.from(keys as Set<string>)[0];
                          if (key) void update(attendee.id, { role: String(key) });
                        }}
                        classNames={{ trigger: "min-h-8 h-8" }}
                      >
                        {(
                          Object.keys(ATTENDEE_ROLE_LABELS) as Array<keyof typeof ATTENDEE_ROLE_LABELS>
                        ).map((roleKey) => (
                          <SelectItem key={roleKey} textValue={ATTENDEE_ROLE_LABELS[roleKey]}>
                            {ATTENDEE_ROLE_LABELS[roleKey]}
                          </SelectItem>
                        ))}
                      </Select>
                    ) : (
                      ATTENDEE_ROLE_LABELS[attendee.role]
                    )}
                  </td>
                  <td className="p-2">
                    {editable ? (
                      <Select
                        size="sm"
                        aria-label="Katılım"
                        selectedKeys={new Set([attendee.attendance])}
                        onSelectionChange={(keys) => {
                          const key = Array.from(keys as Set<string>)[0];
                          if (key) void update(attendee.id, { attendance: String(key) });
                        }}
                        classNames={{ trigger: "min-h-8 h-8" }}
                      >
                        {(
                          Object.keys(ATTENDANCE_LABELS) as Array<keyof typeof ATTENDANCE_LABELS>
                        ).map((statusKey) => (
                          <SelectItem key={statusKey} textValue={ATTENDANCE_LABELS[statusKey]}>
                            {ATTENDANCE_LABELS[statusKey]}
                          </SelectItem>
                        ))}
                      </Select>
                    ) : (
                      ATTENDANCE_LABELS[attendee.attendance]
                    )}
                  </td>
                  <td className="p-2">
                    {editable ? (
                      <Input
                        id={`attendee-note-${attendee.id}`}
                        size="sm"
                        aria-label="Not"
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
                        aria-label="Çıkar"
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
