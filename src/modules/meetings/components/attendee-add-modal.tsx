"use client";

import { notify } from "@/shared/components/ui/notify";import { Button } from "@heroui/react";
import { Checkbox, Description, Dialog, Input, InputGroup, Label, Select, Spinner, TextField } from "@/shared/components/kit";

import { FieldClearButton } from "@/shared/components/forms/field-clear-button";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useTranslations } from "next-intl";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Search } from "lucide-react";

import {
  addAttendeeGuestAction,
  addAttendeeMembersAction,
  addAttendeeUsersAction,
} from "../actions/attendee-actions";

export type AttendeeMemberOption = {
  id: string;
  label: string;
  membershipNumber: string;
};

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
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set(),
  );
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
        `${member.label} ${member.membershipNumber}`
          .toLocaleLowerCase()
          .includes(needle),
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
    notify.success(t("addedCountToast", { count: result.data.added }));
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
    notify.success(t("addedCountToast", { count: result.data.added }));
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
    notify.success(t("addedGuestToast"));
    close();
    router.refresh();
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} size="md" className={"w-full max-w-md "}>
            <DialogDismissButton />

            <Dialog.Header>
              <Dialog.Heading className="flex items-center gap-2">
                {t("title")}
              </Dialog.Heading>
            </Dialog.Header>
            <Dialog.Body>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onPress={() => setTab("user")}
                  variant={actionVariant(
                    tab === "user" ? "primary" : "default",
                    tab === "user" ? "flat" : "light",
                  )}
                >
                  {t("tabUsers")}
                </Button>
                {memberOptions.length > 0 ? (
                  <Button
                    size="sm"
                    onPress={() => setTab("member")}
                    variant={actionVariant(
                      tab === "member" ? "primary" : "default",
                      tab === "member" ? "flat" : "light",
                    )}
                  >
                    {t("tabMembers")}
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  onPress={() => setTab("guest")}
                  variant={actionVariant(
                    tab === "guest" ? "primary" : "default",
                    tab === "guest" ? "flat" : "light",
                  )}
                >
                  {t("tabGuest")}
                </Button>
              </div>

              {tab === "member" ? (
                <>
                  <div className="flex flex-col gap-2">
                    <TextField
                      value={memberQuery}
                      onChange={setMemberQuery}
                      className={["w-full"].filter(Boolean).join(" ")}
                    >
                      <Label>{t("members")}</Label>
                      <InputGroup>
                        <InputGroup.Prefix>
                          {
                            <Search
                              className="h-4 w-4 text-ink-400"
                              aria-hidden
                            />
                          }
                        </InputGroup.Prefix>
                        <InputGroup.Input placeholder={t("membersSearch")} />
                        <InputGroup.Suffix>
                          {memberQuery ? (
                            <FieldClearButton
                              onPress={() => setMemberQuery("")}
                            />
                          ) : null}
                        </InputGroup.Suffix>
                      </InputGroup>
                      <Description>{t("membersDescription")}</Description>
                    </TextField>
                    <div
                      role="group"
                      aria-label={t("members")}
                      className="max-h-64 overflow-y-auto rounded-lg border border-ink-200 p-1"
                    >
                      {filteredMembers.length === 0 ? (
                        <p className="p-3 text-sm text-ink-500">
                          {t("noMembers")}
                        </p>
                      ) : (
                        filteredMembers.map((member) => {
                          const isAdded = added.has(member.id);
                          return (
                            <div
                              key={member.id}
                              className="rounded-md px-2 py-1.5 hover:bg-ink-100"
                            >
                              <Checkbox
                                isDisabled={isAdded}
                                isSelected={
                                  isAdded || selectedMembers.has(member.id)
                                }
                                onChange={(checked) =>
                                  toggleMember(member.id, checked)
                                }
                              >
                                  <Label>
                                    <span className="text-sm">
                                      {member.label}
                                    </span>
                                    <span className="ml-2 font-mono text-xs text-ink-400">
                                      {member.membershipNumber}
                                    </span>
                                    {isAdded ? (
                                      <span className="ml-2 text-xs text-ink-400">
                                        {t("alreadyAdded")}
                                      </span>
                                    ) : null}
                                  </Label>
                              </Checkbox>
                            </div>
                          );
                        })
                      )}
                    </div>
                    {selectedMembers.size > 0 ? (
                      <p className="text-xs text-ink-500">
                        {t("selectedCount", { count: selectedMembers.size })}
                      </p>
                    ) : null}
                  </div>
                  <Select
                    value={Array.from(role)[0] ?? null}
                    onChange={(selectedValue) => {
                      const keys =
                        selectedValue === null
                          ? undefined
                          : String(selectedValue);
                      return setRole(new Set(keys === undefined ? [] : [keys]));
                    }}
                  >
                    <Label>{t("role")}</Label>
                        {(["MEMBER", "CHAIRPERSON", "SECRETARY"] as const).map(
                          (roleKey) => (
                            <Select.Item
                              key={roleKey}
                              id={roleKey}
                              textValue={tRole(roleKey)}
                            >
                              <Label>{tRole(roleKey)}</Label>
                            </Select.Item>
                          ),
                        )}
                  </Select>
                </>
              ) : tab === "user" ? (
                <>
                  <Select
                    selectionMode="multiple"
                    isRequired
                    value={Array.from(selectedUsers)}
                    onChange={(selectedValue) => {
                      const keys = selectedValue.map(String);
                      return setSelectedUsers(new Set(keys));
                    }} >
                    <Label>{t("users")}</Label>
                        {userOptions.map((option) => (
                          <Select.Item
                            key={option.id}
                            id={option.id}
                            textValue={option.label}
                          >
                            <Label>{option.label}</Label>
                          </Select.Item>
                        ))}
                    <Description>{t("usersDescription")}</Description>
                  </Select>
                  <Select
                    value={Array.from(role)[0] ?? null}
                    onChange={(selectedValue) => {
                      const keys =
                        selectedValue === null
                          ? undefined
                          : String(selectedValue);
                      return setRole(new Set(keys === undefined ? [] : [keys]));
                    }}
                  >
                    <Label>{t("role")}</Label>
                        {(["MEMBER", "CHAIRPERSON", "SECRETARY"] as const).map(
                          (roleKey) => (
                            <Select.Item
                              key={roleKey}
                              id={roleKey}
                              textValue={tRole(roleKey)}
                            >
                              <Label>{tRole(roleKey)}</Label>
                            </Select.Item>
                          ),
                        )}
                  </Select>
                </>
              ) : (
                <>
                  <TextField
                    value={guestName}
                    isRequired
                    onChange={setGuestName}
                    className={["w-full"].filter(Boolean).join(" ")}
                  >
                    <Label>{t("name")}</Label>
                    <Input minLength={2} maxLength={120} />
                  </TextField>
                  <Select
                    value={Array.from(guestRole)[0] ?? null}
                    onChange={(selectedValue) => {
                      const keys =
                        selectedValue === null
                          ? undefined
                          : String(selectedValue);
                      return setGuestRole(
                        new Set(keys === undefined ? [] : [keys]),
                      );
                    }}
                  >
                    <Label>{t("role")}</Label>
                        {(["GUEST", "MEMBER"] as const).map((roleKey) => (
                          <Select.Item
                            key={roleKey}
                            id={roleKey}
                            textValue={tRole(roleKey)}
                          >
                            <Label>{tRole(roleKey)}</Label>
                          </Select.Item>
                        ))}
                  </Select>
                </>
              )}

              {error ? <p className="text-sm text-danger">{error}</p> : null}
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                onPress={close}
                variant={actionVariant("default", "light")}
              >
                {tCommon("cancel")}
              </Button>
              {tab === "member" ? (
                <Button
                  onPress={submitMembers}
                  isDisabled={selectedMembers.size === 0}
                  variant={actionVariant("primary", "solid")}
                  isPending={busy}
                >
                  {busy ? <Spinner size="sm" tone="current" /> : null}
                  {t("add")}
                </Button>
              ) : tab === "user" ? (
                <Button
                  onPress={submitUsers}
                  isDisabled={selectedUsers.size === 0}
                  variant={actionVariant("primary", "solid")}
                  isPending={busy}
                >
                  {busy ? <Spinner size="sm" tone="current" /> : null}
                  {t("add")}
                </Button>
              ) : (
                <Button
                  onPress={submitGuest}
                  isDisabled={guestName.trim().length < 2}
                  variant={actionVariant("primary", "solid")}
                  isPending={busy}
                >
                  {busy ? <Spinner size="sm" tone="current" /> : null}
                  {t("add")}
                </Button>
              )}
            </Dialog.Footer>
    </Dialog>
  );
}
