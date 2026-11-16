"use client";
import { statusStyle } from "@/shared/components/ui/status-appearance";
import {
  toast,
  Chip,
  Button,
  Spinner,
  Link as ActionLink,
  buttonVariants,
  Modal,
} from "@heroui/react";
import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";
import { statusTone } from "@/shared/components/ui/status-appearance";

import { MailPlus, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useFormDrawerHref } from "@/shared/components/forms/form-drawer";

import { inviteTeacherAction } from "../actions/teacher-actions";
import type { TeacherRow } from "../types";
import { InviteResultNotice, type InviteResult } from "./invite-result";

export function TeacherTable({
  rows,
  canUpdate,
  canInvite,
}: {
  rows: TeacherRow[];
  canUpdate: boolean;
  canInvite: boolean;
}) {
  const t = useTranslations("courses.teachers");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const drawerHref = useFormDrawerHref();
  const [invite, setInvite] = useState<InviteResult | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (rows.length === 0)
    return <p className="text-sm text-ink-500">{t("empty")}</p>;

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-ink-200 bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-200 text-left text-ink-500">
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
              <tr
                key={row.id}
                className="border-b border-ink-100 last:border-none"
              >
                <td className="p-3 font-medium">
                  {row.firstName} {row.lastName}
                  {!row.isActive ? (
                    <span className="ml-2 text-xs text-ink-400">
                      ({t("inactive")})
                    </span>
                  ) : null}
                </td>
                <td className="p-3 text-ink-600">{row.subjects ?? "—"}</td>
                <td className="p-3 text-ink-600">
                  {[row.email, row.phone].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="p-3 text-right">{row.courseCount}</td>
                <td className="p-3">
                  <Chip
                    size="sm"
                    color={statusTone(row.userId ? "success" : "default")}
                    variant={"soft"}
                    style={statusStyle(row.userId ? "success" : "default")}
                  >
                    {row.userId ? t("hasAccount") : t("noAccount")}
                  </Chip>
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    {canInvite && !row.userId ? (
                      <Button
                        size="sm"
                        isDisabled={!row.email}
                        onPress={async () => {
                          setBusyId(row.id);
                          const result = await inviteTeacherAction({
                            id: row.id,
                          });
                          setBusyId(null);
                          if (!result.ok) {
                            toast(result.error, { variant: "danger" });
                            return;
                          }
                          setInvite({
                            ...result.data,
                            email: row.email ?? undefined,
                          });
                          router.refresh();
                        }}
                        variant={actionVariant("default", "flat")}
                        isPending={busyId === row.id}
                      >
                        {busyId === row.id ? (
                          <Spinner size="sm" color="current" />
                        ) : null}
                        {<MailPlus className="h-4 w-4" aria-hidden />}
                        {t("invite")}
                      </Button>
                    ) : null}
                    {canUpdate ? (
                      <ActionLink
                        href={drawerHref("duzenle", row.id)}
                        aria-label={tCommon("edit")}
                        className={buttonVariants({
                          variant: actionVariant("default", "light"),
                          size: "sm",
                          isIconOnly: true,
                        })}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </ActionLink>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal
        isOpen={invite !== null}
        onOpenChange={(open) => !open && setInvite(null)}
      >
        <Modal.Backdrop>
          <Modal.Container size="md">
            <Modal.Dialog className={"w-full max-w-md "}>
              <DialogDismissButton />

              <Modal.Header>
                <Modal.Heading className="flex items-center gap-2">
                  {t("inviteTitle")}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                {invite ? <InviteResultNotice result={invite} /> : null}
              </Modal.Body>
              <Modal.Footer>
                <Button
                  onPress={() => setInvite(null)}
                  variant={actionVariant("primary", "solid")}
                >
                  {t("inviteDone")}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
