"use client";

import {
  Button,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  addToast,
} from "@heroui/react";
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

  const [editTarget, setEditTarget] = useState<MemberTypeConfigRow | null>(null);
  const [annualDue, setAnnualDue] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const openEdit = (row: MemberTypeConfigRow) => {
    setEditTarget(row);
    setAnnualDue(
      row.annualDueCents === null ? "" : (row.annualDueCents / 100).toFixed(2).replace(".", ","),
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
      addToast({ title: t("toastSaved"), color: "success" });
      setEditTarget(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-medium border border-default-200 bg-content1 p-5 shadow-sm">
      <Table aria-label={t("title")} removeWrapper>
        <TableHeader>
          <TableColumn>{t("colType")}</TableColumn>
          <TableColumn>{t("colAnnualDue")}</TableColumn>
          <TableColumn>{t("colMemberCount")}</TableColumn>
          <TableColumn>{t("colStatus")}</TableColumn>
          <TableColumn aria-label=" ">{" "}</TableColumn>
        </TableHeader>
        <TableBody emptyContent={t("empty")}>
          {rows.map((row) => (
            <TableRow key={row.type}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <TypeBadge type={row.type} />
                </div>
              </TableCell>
              <TableCell>
                {row.annualDueCents === null ? (
                  <span className="text-default-400">{t("notSet")}</span>
                ) : row.annualDueCents === 0 ? (
                  <span className="text-default-500">{t("noDue")}</span>
                ) : (
                  formatMoney(row.annualDueCents)
                )}
              </TableCell>
              <TableCell>{row.memberCount}</TableCell>
              <TableCell>
                {row.isActive ? (
                  <Chip color="success" size="sm" variant="flat">
                    {t("active")}
                  </Chip>
                ) : (
                  <Chip color="default" size="sm" variant="flat">
                    {t("passive")}
                  </Chip>
                )}
              </TableCell>
              <TableCell>
                {canUpdate ? (
                  <div className="flex justify-end">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      aria-label={t("edit")}
                      onPress={() => openEdit(row)}
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal isOpen={editTarget !== null} onOpenChange={(next) => !next && setEditTarget(null)} size="md">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{t("editTitle")}</ModalHeader>
              <ModalBody>
                <Input
                  label={t("colAnnualDue")}
                  placeholder="0,00"
                  value={annualDue}
                  onValueChange={setAnnualDue}
                  description={t("annualDueHint")}
                />
                <Switch isSelected={isActive} onValueChange={setIsActive} size="sm">
                  {t("isActive")}
                </Switch>
                {formError ? <p className="text-small text-danger">{formError}</p> : null}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  {t("cancel")}
                </Button>
                <Button color="primary" isLoading={saving} onPress={submitEdit}>
                  {t("save")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
