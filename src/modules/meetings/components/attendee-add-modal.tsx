"use client";

import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  addToast,
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { addAttendeeGuestAction, addAttendeeUsersAction } from "../actions/attendee-actions";
import { ATTENDEE_ROLE_LABELS } from "../constants";

/**
 * Katılımcı ekleme penceresi (7.3): kayıtlı kullanıcı (çoklu seçim) ya da
 * konuk (serbest metin). Kullanıcı eklemede rol seçilir; tek başkan/sekreter
 * kuralı sunucuda denetlenir.
 */
export function AttendeeAddModal({
  meetingId,
  userOptions,
  isOpen,
  onOpenChange,
}: {
  meetingId: string;
  userOptions: { id: string; label: string }[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"user" | "guest">("user");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [role, setRole] = useState<Set<string>>(new Set(["MEMBER"]));
  const [guestName, setGuestName] = useState("");
  const [guestRole, setGuestRole] = useState<Set<string>>(new Set(["GUEST"]));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    onOpenChange(false);
    setError(null);
    setSelectedUsers(new Set());
    setGuestName("");
  };

  const submitUsers = async () => {
    setBusy(true);
    setError(null);
    const result = await addAttendeeUsersAction({
      meetingId,
      userIds: Array.from(selectedUsers),
      role: Array.from(role)[0] as "MEMBER" | "CHAIRPERSON" | "SECRETARY",
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    addToast({ title: `${result.data.added} katılımcı eklendi`, color: "success" });
    close();
    router.refresh();
  };

  const submitGuest = async () => {
    setBusy(true);
    setError(null);
    const result = await addAttendeeGuestAction({
      meetingId,
      name: guestName,
      role: Array.from(guestRole)[0] as "GUEST" | "MEMBER",
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    addToast({ title: "Konuk eklendi", color: "success" });
    close();
    router.refresh();
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>Katılımcı ekle</ModalHeader>
        <ModalBody>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={tab === "user" ? "flat" : "light"}
              color={tab === "user" ? "primary" : "default"}
              onPress={() => setTab("user")}
            >
              Kayıtlı kullanıcı
            </Button>
            <Button
              size="sm"
              variant={tab === "guest" ? "flat" : "light"}
              color={tab === "guest" ? "primary" : "default"}
              onPress={() => setTab("guest")}
            >
              Konuk
            </Button>
          </div>

          {tab === "user" ? (
            <>
              <Select
                label="Kullanıcılar"
                labelPlacement="outside"
                selectionMode="multiple"
                selectedKeys={selectedUsers}
                onSelectionChange={(keys) => setSelectedUsers(new Set(keys as Set<string>))}
                isRequired
                description="Bir kullanıcı toplantıya bir kez eklenebilir."
              >
                {userOptions.map((option) => (
                  <SelectItem key={option.id} textValue={option.label}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>
              <Select
                label="Görev"
                labelPlacement="outside"
                selectedKeys={role}
                onSelectionChange={(keys) => setRole(new Set(keys as Set<string>))}
              >
                {(["MEMBER", "CHAIRPERSON", "SECRETARY"] as const).map((roleKey) => (
                  <SelectItem key={roleKey} textValue={ATTENDEE_ROLE_LABELS[roleKey]}>
                    {ATTENDEE_ROLE_LABELS[roleKey]}
                  </SelectItem>
                ))}
              </Select>
            </>
          ) : (
            <>
              <Input
                label="Konuk adı"
                labelPlacement="outside"
                value={guestName}
                onValueChange={setGuestName}
                isRequired
                minLength={2}
                maxLength={120}
              />
              <Select
                label="Görev"
                labelPlacement="outside"
                selectedKeys={guestRole}
                onSelectionChange={(keys) => setGuestRole(new Set(keys as Set<string>))}
              >
                {(["GUEST", "MEMBER"] as const).map((roleKey) => (
                  <SelectItem key={roleKey} textValue={ATTENDEE_ROLE_LABELS[roleKey]}>
                    {ATTENDEE_ROLE_LABELS[roleKey]}
                  </SelectItem>
                ))}
              </Select>
            </>
          )}

          {error ? <p className="text-small text-danger">{error}</p> : null}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={close}>
            Vazgeç
          </Button>
          {tab === "user" ? (
            <Button
              color="primary"
              isLoading={busy}
              onPress={submitUsers}
              isDisabled={selectedUsers.size === 0}
            >
              Ekle
            </Button>
          ) : (
            <Button
              color="primary"
              isLoading={busy}
              onPress={submitGuest}
              isDisabled={guestName.trim().length < 2}
            >
              Ekle
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
