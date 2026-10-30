"use client";

import { useTranslations } from "next-intl";

import {
  Button,
  Checkbox,
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

import { Search } from "lucide-react";

import {
  addAttendeeGuestAction,
  addAttendeeMembersAction,
  addAttendeeUsersAction,
} from "../actions/attendee-actions";

export type AttendeeMemberOption = { id: string; label: string; membershipNumber: string };

/**
 * Katılımcı ekleme penceresi (7.3): kayıtlı kullanıcı (çoklu seçim), dernek üyesi
 * (aranabilir çoklu seçim) ya da konuk (serbest metin). Kullanıcı eklemede rol seçilir; tek başkan/sekreter
 * kuralı sunucuda denetlenir.
 */
export function AttendeeAddModal({
  meetingId,
  userOptions,
  memberOptions,
  addedMemberIds,
  isOpen,
  onOpenChange,
}: {
  meetingId: string;
  userOptions: { id: string; label: string }[];
  /** Boşsa "Dernek üyesi" sekmesi gösterilmez (üye görme yetkisi yok). */
  memberOptions: AttendeeMemberOption[];
  addedMemberIds: string[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const tCommon = useTranslations("common");
  const t = useTranslations("meetings.attendeeAdd");
  const tRole = useTranslations("meetings.attendeeRole");
  const router = useRouter();
  const [tab, setTab] = useState<"user" | "member" | "guest">("user");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [memberQuery, setMemberQuery] = useState("");
  const [role, setRole] = useState<Set<string>>(new Set(["MEMBER"]));
  const [guestName, setGuestName] = useState("");
  const [guestRole, setGuestRole] = useState<Set<string>>(new Set(["GUEST"]));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    onOpenChange(false);
    setError(null);
    setSelectedUsers(new Set());
    setSelectedMembers(new Set());
    setMemberQuery("");
    setGuestName("");
  };

  const added = new Set(addedMemberIds);
  const needle = memberQuery.trim().toLocaleLowerCase();
  const filteredMembers = needle
    ? memberOptions.filter((member) =>
        `${member.label} ${member.membershipNumber}`.toLocaleLowerCase().includes(needle),
      )
    : memberOptions;

  const toggleMember = (id: string, checked: boolean) => {
    setSelectedMembers((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const submitMembers = async () => {
    setBusy(true);
    setError(null);
    const result = await addAttendeeMembersAction({
      meetingId,
      memberIds: Array.from(selectedMembers),
      role: Array.from(role)[0] as "MEMBER" | "CHAIRPERSON" | "SECRETARY",
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    addToast({ title: t("addedCountToast", { count: result.data.added }), color: "success" });
    close();
    router.refresh();
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
    addToast({ title: t("addedCountToast", { count: result.data.added }), color: "success" });
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
    addToast({ title: t("addedGuestToast"), color: "success" });
    close();
    router.refresh();
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>{t("title")}</ModalHeader>
        <ModalBody>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={tab === "user" ? "flat" : "light"}
              color={tab === "user" ? "primary" : "default"}
              onPress={() => setTab("user")}
            >
              {t("tabUsers")}
            </Button>
            {memberOptions.length > 0 ? (
              <Button
                size="sm"
                variant={tab === "member" ? "flat" : "light"}
                color={tab === "member" ? "primary" : "default"}
                onPress={() => setTab("member")}
              >
                {t("tabMembers")}
              </Button>
            ) : null}
            <Button
              size="sm"
              variant={tab === "guest" ? "flat" : "light"}
              color={tab === "guest" ? "primary" : "default"}
              onPress={() => setTab("guest")}
            >
              {t("tabGuest")}
            </Button>
          </div>

          {tab === "member" ? (
            <>
              <div className="flex flex-col gap-2">
                <Input
                  label={t("members")}
                  labelPlacement="outside"
                  placeholder={t("membersSearch")}
                  value={memberQuery}
                  onValueChange={setMemberQuery}
                  isClearable
                  onClear={() => setMemberQuery("")}
                  startContent={<Search className="h-4 w-4 text-default-400" aria-hidden />}
                  description={t("membersDescription")}
                />
                <div
                  role="group"
                  aria-label={t("members")}
                  className="max-h-64 overflow-y-auto rounded-lg border border-default-200 p-1"
                >
                  {filteredMembers.length === 0 ? (
                    <p className="p-3 text-small text-default-500">{t("noMembers")}</p>
                  ) : (
                    filteredMembers.map((member) => {
                      const isAdded = added.has(member.id);
                      return (
                        <div key={member.id} className="rounded-md px-2 py-1.5 hover:bg-default-100">
                          <Checkbox
                            size="sm"
                            isDisabled={isAdded}
                            isSelected={isAdded || selectedMembers.has(member.id)}
                            onValueChange={(checked) => toggleMember(member.id, checked)}
                          >
                            <span className="text-small">{member.label}</span>
                            <span className="ml-2 font-mono text-tiny text-default-400">
                              {member.membershipNumber}
                            </span>
                            {isAdded ? (
                              <span className="ml-2 text-tiny text-default-400">{t("alreadyAdded")}</span>
                            ) : null}
                          </Checkbox>
                        </div>
                      );
                    })
                  )}
                </div>
                {selectedMembers.size > 0 ? (
                  <p className="text-tiny text-default-500">{t("selectedCount", { count: selectedMembers.size })}</p>
                ) : null}
              </div>
              <Select
                label={t("role")}
                labelPlacement="outside"
                selectedKeys={role}
                onSelectionChange={(keys) => setRole(new Set(keys as Set<string>))}
              >
                {(["MEMBER", "CHAIRPERSON", "SECRETARY"] as const).map((roleKey) => (
                  <SelectItem key={roleKey} textValue={tRole(roleKey)}>
                    {tRole(roleKey)}
                  </SelectItem>
                ))}
              </Select>
            </>
          ) : tab === "user" ? (
            <>
              <Select
                label={t("users")}
                labelPlacement="outside"
                selectionMode="multiple"
                selectedKeys={selectedUsers}
                onSelectionChange={(keys) => setSelectedUsers(new Set(keys as Set<string>))}
                isRequired
                description={t("usersDescription")}
              >
                {userOptions.map((option) => (
                  <SelectItem key={option.id} textValue={option.label}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>
              <Select
                label={t("role")}
                labelPlacement="outside"
                selectedKeys={role}
                onSelectionChange={(keys) => setRole(new Set(keys as Set<string>))}
              >
                {(["MEMBER", "CHAIRPERSON", "SECRETARY"] as const).map((roleKey) => (
                  <SelectItem key={roleKey} textValue={tRole(roleKey)}>
                    {tRole(roleKey)}
                  </SelectItem>
                ))}
              </Select>
            </>
          ) : (
            <>
              <Input
                label={t("name")}
                labelPlacement="outside"
                value={guestName}
                onValueChange={setGuestName}
                isRequired
                minLength={2}
                maxLength={120}
              />
              <Select
                label={t("role")}
                labelPlacement="outside"
                selectedKeys={guestRole}
                onSelectionChange={(keys) => setGuestRole(new Set(keys as Set<string>))}
              >
                {(["GUEST", "MEMBER"] as const).map((roleKey) => (
                  <SelectItem key={roleKey} textValue={tRole(roleKey)}>
                    {tRole(roleKey)}
                  </SelectItem>
                ))}
              </Select>
            </>
          )}

          {error ? <p className="text-small text-danger">{error}</p> : null}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={close}>
            {tCommon("cancel")}
          </Button>
          {tab === "member" ? (
            <Button
              color="primary"
              isLoading={busy}
              onPress={submitMembers}
              isDisabled={selectedMembers.size === 0}
            >
              {t("add")}
            </Button>
          ) : tab === "user" ? (
            <Button
              color="primary"
              isLoading={busy}
              onPress={submitUsers}
              isDisabled={selectedUsers.size === 0}
            >
              {t("add")}
            </Button>
          ) : (
            <Button
              color="primary"
              isLoading={busy}
              onPress={submitGuest}
              isDisabled={guestName.trim().length < 2}
            >
              {t("add")}
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
