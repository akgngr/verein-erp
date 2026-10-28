"use client";

import { useState } from "react";
import { Button, Input, Chip } from "@heroui/react";
import { ChevronDown, Plus, Trash2, Mail, Phone, User } from "lucide-react";
import type { EventAttendeeItem, AttendeeStatus } from "../types";
import { ATTENDEE_STATUSES } from "../constants";
import {
  addAttendeeAction,
  updateAttendeeStatusAction,
  deleteAttendeeAction,
} from "../actions/event-actions";

interface AttendeeListProps {
  eventId: string;
  capacity: number | null;
  attendees: EventAttendeeItem[];
}

export function AttendeeList({ eventId, capacity, attendees }: AttendeeListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
        setErrorMsg(res.error ?? "Katılımcı eklenemedi.");
        return;
      }

      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setNotes("");
      setIsAdding(false);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (attendeeId: string, newStatus: AttendeeStatus) => {
    setStatusLoadingId(attendeeId);
    try {
      await updateAttendeeStatusAction({
        attendeeId,
        status: newStatus,
      });
    } finally {
      setStatusLoadingId(null);
    }
  };

  const handleDelete = async (attendeeId: string, name: string) => {
    if (!window.confirm(`${name} isimli katılımcıyı listeden çıkarmak istediğinize emin misiniz?`)) {
      return;
    }
    await deleteAttendeeAction(attendeeId);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Katılımcı Kayıtları ({attendees.length})
          </h3>
          <p className="text-xs text-default-500">
            Kayıt olan üyeler ve dış konukların katılım durumlarını yönetin.
          </p>
        </div>

        {!isAdding && (
          <Button
            size="sm"
            color="primary"
            variant="flat"
            startContent={<Plus className="h-4 w-4" />}
            onPress={() => setIsAdding(true)}
            isDisabled={isFull}
          >
            {isFull ? "Kontenjan Dolu" : "Katılımcı Ekle"}
          </Button>
        )}
      </div>

      {isAdding && (
        <form
          onSubmit={handleAddSubmit}
          className="p-4 rounded-xl border border-divider bg-default-50/50 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Manuel Katılımcı Kaydı</span>
            <Button size="sm" variant="light" onPress={() => setIsAdding(false)}>
              Kapat
            </Button>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-medium bg-danger-50 text-danger-600 text-xs">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            <Input
              size="sm"
              label="Ad"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              isRequired
            />
            <Input
              size="sm"
              label="Soyad"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              isRequired
            />
            <Input
              size="sm"
              type="email"
              label="E-Posta"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              size="sm"
              label="Telefon"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <Input
            size="sm"
            label="Özel Not (Alerji, Diyet Tercihi vb.)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 mt-1">
            <Button size="sm" variant="flat" onPress={() => setIsAdding(false)} isDisabled={loading}>
              İptal
            </Button>
            <Button size="sm" color="primary" type="submit" isLoading={loading}>
              Kaydı Tamamla
            </Button>
          </div>
        </form>
      )}

      {attendees.length === 0 ? (
        <div className="p-8 text-center rounded-xl border border-dashed border-divider text-default-400 text-xs">
          Henüz kayıtlı bir katılımcı bulunmuyor.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-divider bg-background shadow-xs">
          <table className="w-full text-left text-xs text-foreground">
            <thead className="bg-default-50 text-default-600 font-semibold uppercase tracking-wider text-[11px] border-b border-divider">
              <tr>
                <th className="py-3 px-4">Katılımcı Adı</th>
                <th className="py-3 px-4">Tür</th>
                <th className="py-3 px-4">İletişim</th>
                <th className="py-3 px-4">Kayıt Tarihi & Not</th>
                <th className="py-3 px-4 w-44">Katılım Durumu</th>
                <th className="py-3 px-4 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider font-medium">
              {attendees.map((attendee) => {
                const fullName = `${attendee.firstName} ${attendee.lastName}`;
                const isMember = Boolean(attendee.memberId);

                return (
                  <tr key={attendee.id} className="hover:bg-default-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-default-100 flex items-center justify-center text-default-600">
                          <User className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-semibold text-foreground">{fullName}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <Chip
                        size="sm"
                        variant="flat"
                        color={isMember ? "primary" : "default"}
                        className="text-[10px]"
                      >
                        {isMember ? "Dernek Üyesi" : "Misafir"}
                      </Chip>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-0.5 text-default-500">
                        {attendee.email && (
                          <span className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3 text-default-400" />
                            {attendee.email}
                          </span>
                        )}
                        {attendee.phone && (
                          <span className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-default-400" />
                            {attendee.phone}
                          </span>
                        )}
                        {!attendee.email && !attendee.phone && (
                          <span className="italic text-default-400">-</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-default-600">
                          {new Intl.DateTimeFormat("tr-TR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }).format(new Date(attendee.registeredAt))}
                        </span>
                        {attendee.notes && (
                          <span className="text-[11px] text-default-400 italic">
                            {attendee.notes}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="relative inline-block w-full">
                        <select
                          value={attendee.status}
                          disabled={statusLoadingId === attendee.id}
                          onChange={(e) =>
                            handleStatusChange(attendee.id, e.target.value as AttendeeStatus)
                          }
                          className="h-8 w-full appearance-none rounded-medium bg-default-100 px-2.5 pr-8 text-xs font-medium text-foreground transition-colors hover:bg-default-200 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer border border-transparent focus:border-primary/50 disabled:opacity-50"
                        >
                          {ATTENDEE_STATUSES.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.labelTr}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-default-400" />
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="light"
                        color="danger"
                        isIconOnly
                        aria-label="Katılımcıyı Çıkar"
                        onPress={() => handleDelete(attendee.id, fullName)}
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
    </div>
  );
}
