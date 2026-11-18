"use client";

import { notify } from "@/shared/components/ui/notify";
import { Dialog, Spinner, StatusChip, Button, buttonClassName, TextLink as ActionLink } from "@/shared/components/kit";
import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

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
                  <StatusChip tone={row.userId ? "success" : "default"}
                  >
                    {row.userId ? t("hasAccount") : t("noAccount")}
                  </StatusChip>
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
                            notify.error(result.error);
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
                          <Spinner size="sm" tone="current" />
                        ) : null}
                        {<MailPlus className="h-4 w-4" aria-hidden />}
                        {t("invite")}
                      </Button>
                    ) : null}
                    {canUpdate ? (
                      <ActionLink
                        href={drawerHref("duzenle", row.id)}
                        aria-label={tCommon("edit")}
                        className={buttonClassName({
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
      <Dialog
        isOpen={invite !== null}
        onOpenChange={(open) => !open && setInvite(null)} size="md" className={"w-full max-w-md "}>
              <DialogDismissButton />

              <Dialog.Header>
                <Dialog.Heading className="flex items-center gap-2">
                  {t("inviteTitle")}
                </Dialog.Heading>
              </Dialog.Header>
              <Dialog.Body>
                {invite ? <InviteResultNotice result={invite} /> : null}
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  onPress={() => setInvite(null)}
                  variant={actionVariant("primary", "solid")}
                >
                  {t("inviteDone")}
                </Button>
              </Dialog.Footer>
      </Dialog>
    </>
  );
}
