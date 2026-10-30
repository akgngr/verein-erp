"use client";

import { addToast, Button, Chip, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { MailPlus, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useFormDrawerHref } from "@/shared/components/forms/form-drawer";

import { inviteTeacherAction } from "../actions/teacher-actions";
import type { TeacherRow } from "../types";
import { InviteResultNotice, type InviteResult } from "./invite-result";

export function TeacherTable({ rows, canUpdate, canInvite }: { rows: TeacherRow[]; canUpdate: boolean; canInvite: boolean }) {
  const t = useTranslations("courses.teachers");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const drawerHref = useFormDrawerHref();
  const [invite, setInvite] = useState<InviteResult | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (rows.length === 0) return <p className="text-small text-default-500">{t("empty")}</p>;

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-default-200 bg-content1">
        <table className="w-full text-small">
          <thead>
            <tr className="border-b border-default-200 text-left text-default-500">
              <th className="p-3">{t("name")}</th>
              <th className="p-3">{t("subjects")}</th>
              <th className="p-3">{t("contact")}</th>
              <th className="p-3 text-right">{t("courses")}</th>
              <th className="p-3">{t("account")}</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-default-100 last:border-none">
                <td className="p-3 font-medium">
                  {row.firstName} {row.lastName}
                  {!row.isActive ? <span className="ml-2 text-tiny text-default-400">({t("inactive")})</span> : null}
                </td>
                <td className="p-3 text-default-600">{row.subjects ?? "—"}</td>
                <td className="p-3 text-default-600">{[row.email, row.phone].filter(Boolean).join(" · ") || "—"}</td>
                <td className="p-3 text-right">{row.courseCount}</td>
                <td className="p-3">
                  <Chip size="sm" variant="flat" color={row.userId ? "success" : "default"}>
                    {row.userId ? t("hasAccount") : t("noAccount")}
                  </Chip>
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    {canInvite && !row.userId ? (
                      <Button
                        size="sm"
                        variant="flat"
                        startContent={<MailPlus className="h-4 w-4" aria-hidden />}
                        isLoading={busyId === row.id}
                        isDisabled={!row.email}
                        onPress={async () => {
                          setBusyId(row.id);
                          const result = await inviteTeacherAction({ id: row.id });
                          setBusyId(null);
                          if (!result.ok) {
                            addToast({ title: result.error, color: "danger" });
                            return;
                          }
                          setInvite({ ...result.data, email: row.email ?? undefined });
                          router.refresh();
                        }}
                      >
                        {t("invite")}
                      </Button>
                    ) : null}
                    {canUpdate ? (
                      <Button as="a" href={drawerHref("duzenle", row.id)} isIconOnly size="sm" variant="light" aria-label={tCommon("edit")}>
                        <Pencil className="h-4 w-4" aria-hidden />
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal isOpen={invite !== null} onOpenChange={(open) => !open && setInvite(null)}>
        <ModalContent>
          <ModalHeader>{t("inviteTitle")}</ModalHeader>
          <ModalBody>{invite ? <InviteResultNotice result={invite} /> : null}</ModalBody>
          <ModalFooter>
            <Button color="primary" onPress={() => setInvite(null)}>
              {t("inviteDone")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
