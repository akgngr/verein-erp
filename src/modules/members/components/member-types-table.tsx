"use client";

import { notify } from "@/shared/components/ui/notify";
import { Description, Dialog, Input, Label, Spinner, StatusChip, Switch, Table, TextField, Button } from "@/shared/components/kit";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { formatMoney } from "@/shared/money";

import { updateMembershipTypeConfigAction } from "../actions/member-type-actions";
import { TypeBadge } from "./type-badge";
import type { MemberTypeConfigRow } from "../types";

/**
 * Üyelik türleri tablosu (Faz 3 eklemeleri). KARAR: Yalnızca 4 sabit tür
 * (enum) olduğundan DataTable yerine basit HeroUI Table kullanılır; tür
 * ekleme/silme yoktur, yalnız aidat tutarı + aktiflik düzenlenir.
 */
export function MemberTypesTable({
  rows,
  canUpdate,
}: {
  rows: MemberTypeConfigRow[];
  canUpdate: boolean;
}) {
  const t = useTranslations("members.types");
  const router = useRouter();

  const [editTarget, setEditTarget] = useState<MemberTypeConfigRow | null>(
    null,
  );
  const [annualDue, setAnnualDue] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const openEdit = (row: MemberTypeConfigRow) => {
    setEditTarget(row);
    setAnnualDue(
      row.annualDueCents === null
        ? ""
        : (row.annualDueCents / 100).toFixed(2).replace(".", ","),
    );
    setIsActive(row.isActive);
    setFormError(null);
  };

  const submitEdit = async () => {
    if (!editTarget) return;
    setFormError(null);
    setSaving(true);
    try {
      const result = await updateMembershipTypeConfigAction({
        type: editTarget.type,
        annualDue,
        isActive,
      });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      notify.success(t("toastSaved"));
      setEditTarget(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-ink-200 bg-surface p-5 shadow-sm">
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label={t("title")}>
            <Table.Header>
              <Table.Column isRowHeader id={"column-0"}>
                {t("colType")}
              </Table.Column>
              <Table.Column id={"column-1"}>{t("colAnnualDue")}</Table.Column>
              <Table.Column id={"column-2"}>{t("colMemberCount")}</Table.Column>
              <Table.Column id={"column-3"}>{t("colStatus")}</Table.Column>
              <Table.Column aria-label=" " id={"column-4"}>
                {" "}
              </Table.Column>
            </Table.Header>
            <Table.Body renderEmptyState={() => t("empty")}>
              {rows.map((row) => (
                <Table.Row key={row.type} id={row.type}>
                  <Table.Cell>
                    <div className="flex items-center gap-2">
                      <TypeBadge type={row.type} />
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    {row.annualDueCents === null ? (
                      <span className="text-ink-400">{t("notSet")}</span>
                    ) : row.annualDueCents === 0 ? (
                      <span className="text-ink-500">{t("noDue")}</span>
                    ) : (
                      formatMoney(row.annualDueCents)
                    )}
                  </Table.Cell>
                  <Table.Cell>{row.memberCount}</Table.Cell>
                  <Table.Cell>
                    {row.isActive ? (
                      <StatusChip tone="success">
                        {t("active")}
                      </StatusChip>
                    ) : (
                      <StatusChip tone="default">
                        {t("passive")}
                      </StatusChip>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    {canUpdate ? (
                      <div className="flex justify-end">
                        <Button
                          isIconOnly
                          size="sm"
                          aria-label={t("edit")}
                          onPress={() => openEdit(row)}
                          variant={actionVariant("default", "light")}
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                    ) : null}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>

      <Dialog
        isOpen={editTarget !== null}
        onOpenChange={(next) => !next && setEditTarget(null)} size="md" className={"w-full max-w-md "}>
              {({ close: onClose }) => (
                <>
                  <DialogDismissButton />
                  <Dialog.Header>
                    <Dialog.Heading className="flex items-center gap-2">
                      {t("editTitle")}
                    </Dialog.Heading>
                  </Dialog.Header>
                  <Dialog.Body>
                    <TextField
                      value={annualDue}
                      onChange={setAnnualDue}
                      className={["w-full"].filter(Boolean).join(" ")}
                    >
                      <Label>{t("colAnnualDue")}</Label>
                      <Input placeholder="0,00" />
                      <Description>{t("annualDueHint")}</Description>
                    </TextField>
                    <Switch
                      isSelected={isActive}
                      onChange={setIsActive}
                      size={"sm"}
                    >
                        <Label>{t("isActive")}</Label>
                    </Switch>
                    {formError ? (
                      <p className="text-sm text-danger">{formError}</p>
                    ) : null}
                  </Dialog.Body>
                  <Dialog.Footer>
                    <Button
                      onPress={onClose}
                      variant={actionVariant("default", "light")}
                    >
                      {t("cancel")}
                    </Button>
                    <Button
                      onPress={submitEdit}
                      variant={actionVariant("primary", "solid")}
                      isPending={saving}
                    >
                      {saving ? <Spinner size="sm" tone="current" /> : null}
                      {t("save")}
                    </Button>
                  </Dialog.Footer>
                </>
              )}
      </Dialog>
    </div>
  );
}
