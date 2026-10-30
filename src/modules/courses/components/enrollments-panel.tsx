"use client";

import { addToast, Button, Checkbox, Chip, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { formatMoney } from "@/shared/money";
import { formatDate } from "@/shared/utils";

import { enrollStudentsAction, setEnrollmentStatusAction } from "../actions/enrollment-actions";
import type { CourseEnrollmentStatus, EnrollmentRow } from "../types";

const STATUS_COLOR: Record<CourseEnrollmentStatus, "success" | "default" | "warning"> = { ACTIVE: "success", COMPLETED: "default", WITHDRAWN: "warning" };

/** Kurstaki öğrenciler: kayıt (aranabilir çoklu seçim, indirim), durum değişikliği. */
export function EnrollmentsPanel({
  courseId,
  enrollments,
  studentOptions,
  canEdit,
  canSeeFees,
  canOpenStudents,
  today,
}: {
  courseId: string;
  enrollments: EnrollmentRow[];
  studentOptions: { id: string; label: string; studentNumber: string }[];
  canEdit: boolean;
  canSeeFees: boolean;
  canOpenStudents: boolean;
  today: string;
}) {
  const t = useTranslations("courses.enrollments");
  const tEnum = useTranslations("courses.enums");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [enrolledAt, setEnrolledAt] = useState(today);
  const [discount, setDiscount] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const enrolledIds = new Set(enrollments.map((enrollment) => enrollment.studentId));
  const needle = query.trim().toLocaleLowerCase();
  const filtered = studentOptions.filter(
    (student) => !enrolledIds.has(student.id) && (!needle || `${student.label} ${student.studentNumber}`.toLocaleLowerCase().includes(needle)),
  );

  const enroll = async () => {
    setBusy(true);
    setError(null);
    const result = await enrollStudentsAction({ courseId, studentIds: [...selected], enrolledAt, discountPercent: discount || "0" });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    addToast({ title: t("enrolledToast", { count: result.data.enrolled }), color: "success" });
    setOpen(false);
    setSelected(new Set());
    router.refresh();
  };

  const changeStatus = async (id: string, status: CourseEnrollmentStatus) => {
    const result = await setEnrollmentStatusAction({ id, status });
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    addToast({ title: result.data.cancelledCharges > 0 ? t("withdrawnToast", { count: result.data.cancelledCharges }) : t("statusToast"), color: "success" });
    router.refresh();
  };

  return (
    <section className="flex flex-col gap-4">
      {canEdit ? (
        <Button color="primary" className="self-start" startContent={<UserPlus className="h-4 w-4" aria-hidden />} onPress={() => setOpen(true)}>
          {t("add")}
        </Button>
      ) : null}
      {enrollments.length === 0 ? (
        <p className="text-small text-default-500">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-small">
            <thead>
              <tr className="border-b border-default-200 text-left text-default-500">
                <th className="p-2">{t("student")}</th>
                <th className="p-2">{t("payer")}</th>
                <th className="p-2">{t("enrolledAt")}</th>
                {canSeeFees ? <th className="p-2 text-right">{t("open")}</th> : null}
                <th className="p-2">{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((enrollment) => (
                <tr key={enrollment.id} className="border-b border-default-100">
                  <td className="p-2">
                    {canOpenStudents ? (
                      <Link href={`/ogrenciler/${enrollment.studentId}`} className="font-medium text-primary hover:underline">
                        {enrollment.studentLabel}
                      </Link>
                    ) : (
                      <span className="font-medium">{enrollment.studentLabel}</span>
                    )}
                    <span className="ml-2 font-mono text-tiny text-default-400">{enrollment.studentNumber}</span>
                    {enrollment.discountPercent > 0 ? <span className="ml-2 text-tiny text-default-500">−{enrollment.discountPercent}%</span> : null}
                  </td>
                  <td className="p-2 text-default-600">{enrollment.payerLabel ? `${enrollment.payerLabel} (${enrollment.payerDebtorNumber})` : "—"}</td>
                  <td className="p-2">{formatDate(enrollment.enrolledAt)}</td>
                  {canSeeFees ? <td className="p-2 text-right">{enrollment.openCents > 0 ? formatMoney(enrollment.openCents) : "—"}</td> : null}
                  <td className="p-2">
                    {canEdit ? (
                      <select
                        aria-label={t("status")}
                        className="h-8 rounded-medium border border-default-200 bg-default-50/50 px-2 text-small"
                        value={enrollment.status}
                        onChange={(event) => changeStatus(enrollment.id, event.target.value as CourseEnrollmentStatus)}
                      >
                        {(["ACTIVE", "COMPLETED", "WITHDRAWN"] as const).map((status) => (
                          <option key={status} value={status}>
                            {tEnum(`enrollmentStatus.${status}`)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Chip size="sm" variant="flat" color={STATUS_COLOR[enrollment.status]}>
                        {tEnum(`enrollmentStatus.${enrollment.status}`)}
                      </Chip>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={open} onOpenChange={setOpen} size="lg">
        <ModalContent>
          <ModalHeader>{t("addTitle")}</ModalHeader>
          <ModalBody>
            <Input
              placeholder={t("search")}
              aria-label={t("search")}
              value={query}
              onValueChange={setQuery}
              isClearable
              onClear={() => setQuery("")}
              startContent={<Search className="h-4 w-4 text-default-400" aria-hidden />}
            />
            <div role="group" aria-label={t("student")} className="max-h-64 overflow-y-auto rounded-lg border border-default-200 p-1">
              {filtered.length === 0 ? (
                <p className="p-3 text-small text-default-500">{t("noStudents")}</p>
              ) : (
                filtered.map((student) => (
                  <div key={student.id} className="rounded-md px-2 py-1.5 hover:bg-default-100">
                    <Checkbox
                      size="sm"
                      isSelected={selected.has(student.id)}
                      onValueChange={(checked) =>
                        setSelected((current) => {
                          const next = new Set(current);
                          if (checked) next.add(student.id);
                          else next.delete(student.id);
                          return next;
                        })
                      }
                    >
                      <span className="text-small">{student.label}</span>
                      <span className="ml-2 font-mono text-tiny text-default-400">{student.studentNumber}</span>
                    </Checkbox>
                  </div>
                ))
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input type="date" label={t("enrolledAt")} labelPlacement="outside" placeholder=" " value={enrolledAt} onValueChange={setEnrolledAt} />
              <Input type="number" min={0} max={100} label={t("discount")} labelPlacement="outside" placeholder=" " value={discount} onValueChange={setDiscount} endContent={<span className="text-small text-default-400">%</span>} />
            </div>
            <p className="text-tiny text-default-500">{t("planHelp")}</p>
            {error ? <p className="text-small text-danger">{error}</p> : null}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button color="primary" isLoading={busy} isDisabled={selected.size === 0} onPress={enroll}>
              {t("enroll", { count: selected.size })}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </section>
  );
}
