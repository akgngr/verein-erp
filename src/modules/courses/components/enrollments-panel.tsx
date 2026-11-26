"use client";

import { notify } from "@/shared/components/ui/notify";
import { DateInput, Checkbox, Dialog, InputGroup, Label, Spinner, StatusChip, TextField, Button } from "@/shared/components/kit";
import { FieldClearButton } from "@/shared/components/forms/field-clear-button";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { formatMoney } from "@/shared/money";
import { formatDate } from "@/shared/utils";

import {
  enrollStudentsAction,
  setEnrollmentStatusAction,
} from "../actions/enrollment-actions";
import type { CourseEnrollmentStatus, EnrollmentRow } from "../types";

const STATUS_COLOR: Record<
  CourseEnrollmentStatus,
  "success" | "default" | "warning"
> = { ACTIVE: "success", COMPLETED: "default", WITHDRAWN: "warning" };

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

  const enrolledIds = new Set(
    enrollments.map((enrollment) => enrollment.studentId),
  );
  const needle = query.trim().toLocaleLowerCase();
  const filtered = studentOptions.filter(
    (student) =>
      !enrolledIds.has(student.id) &&
      (!needle ||
        `${student.label} ${student.studentNumber}`
          .toLocaleLowerCase()
          .includes(needle)),
  );

  const enroll = async () => {
    setBusy(true);
    setError(null);
    const result = await enrollStudentsAction({
      courseId,
      studentIds: [...selected],
      enrolledAt,
      discountPercent: discount || "0",
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    notify.success(t("enrolledToast", { count: result.data.enrolled }));
    setOpen(false);
    setSelected(new Set());
    router.refresh();
  };

  const changeStatus = async (id: string, status: CourseEnrollmentStatus) => {
    const result = await setEnrollmentStatusAction({ id, status });
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    notify.success(
      result.data.cancelledCharges > 0
        ? t("withdrawnToast", { count: result.data.cancelledCharges })
        : t("statusToast"));
    router.refresh();
  };

  return (
    <section className="flex flex-col gap-4">
      {canEdit ? (
        <Button
          className="self-start"
          onPress={() => setOpen(true)}
          variant={actionVariant("primary", "solid")}
        >
          {<UserPlus className="h-4 w-4" aria-hidden />}
          {t("add")}
        </Button>
      ) : null}
      {enrollments.length === 0 ? (
        <p className="text-sm text-ink-500">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-200 text-left text-ink-500">
                <th className="p-2">{t("student")}</th>
                <th className="p-2">{t("payer")}</th>
                <th className="p-2">{t("enrolledAt")}</th>
                {canSeeFees ? (
                  <th className="p-2 text-right">{t("open")}</th>
                ) : null}
                <th className="p-2">{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((enrollment) => (
                <tr key={enrollment.id} className="border-b border-ink-100">
                  <td className="p-2">
                    {canOpenStudents ? (
                      <Link
                        href={`/ogrenciler/${enrollment.studentId}`}
                        className="font-medium text-accent hover:underline"
                      >
                        {enrollment.studentLabel}
                      </Link>
                    ) : (
                      <span className="font-medium">
                        {enrollment.studentLabel}
                      </span>
                    )}
                    <span className="ml-2 font-mono text-xs text-ink-400">
                      {enrollment.studentNumber}
                    </span>
                    {enrollment.discountPercent > 0 ? (
                      <span className="ml-2 text-xs text-ink-500">
                        −{enrollment.discountPercent}%
                      </span>
                    ) : null}
                  </td>
                  <td className="p-2 text-ink-600">
                    {enrollment.payerLabel
                      ? `${enrollment.payerLabel} (${enrollment.payerDebtorNumber})`
                      : "—"}
                  </td>
                  <td className="p-2">{formatDate(enrollment.enrolledAt)}</td>
                  {canSeeFees ? (
                    <td className="p-2 text-right">
                      {enrollment.openCents > 0
                        ? formatMoney(enrollment.openCents)
                        : "—"}
                    </td>
                  ) : null}
                  <td className="p-2">
                    {canEdit ? (
                      <select
                        aria-label={t("status")}
                        className="h-8 rounded-lg border border-ink-200 bg-ink-50/50 px-2 text-sm"
                        value={enrollment.status}
                        onChange={(event) =>
                          changeStatus(
                            enrollment.id,
                            event.target.value as CourseEnrollmentStatus,
                          )
                        }
                      >
                        {(["ACTIVE", "COMPLETED", "WITHDRAWN"] as const).map(
                          (status) => (
                            <option key={status} value={status}>
                              {tEnum(`enrollmentStatus.${status}`)}
                            </option>
                          ),
                        )}
                      </select>
                    ) : (
                      <StatusChip tone={STATUS_COLOR[enrollment.status]}
                      >
                        {tEnum(`enrollmentStatus.${enrollment.status}`)}
                      </StatusChip>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog isOpen={open} onOpenChange={setOpen} size="lg" className={"w-full max-w-lg "}>
              <DialogDismissButton />

              <Dialog.Header>
                <Dialog.Heading className="flex items-center gap-2">
                  {t("addTitle")}
                </Dialog.Heading>
              </Dialog.Header>
              <Dialog.Body>
                <TextField
                  aria-label={t("search")}
                  value={query}
                  onChange={setQuery}
                  className={["w-full"].filter(Boolean).join(" ")}
                >
                  <InputGroup>
                    <InputGroup.Prefix>
                      {<Search className="h-4 w-4 text-ink-400" aria-hidden />}
                    </InputGroup.Prefix>
                    <InputGroup.Input placeholder={t("search")} />
                    <InputGroup.Suffix>
                      {query ? (
                        <FieldClearButton onPress={() => setQuery("")} />
                      ) : null}
                    </InputGroup.Suffix>
                  </InputGroup>
                </TextField>
                <div
                  role="group"
                  aria-label={t("student")}
                  className="max-h-64 overflow-y-auto rounded-lg border border-ink-200 p-1"
                >
                  {filtered.length === 0 ? (
                    <p className="p-3 text-sm text-ink-500">
                      {t("noStudents")}
                    </p>
                  ) : (
                    filtered.map((student) => (
                      <div
                        key={student.id}
                        className="rounded-md px-2 py-1.5 hover:bg-ink-100"
                      >
                        <Checkbox
                          isSelected={selected.has(student.id)}
                          onChange={(checked) =>
                            setSelected((current) => {
                              const next = new Set(current);
                              if (checked) next.add(student.id);
                              else next.delete(student.id);
                              return next;
                            })
                          }
                        >
                            <Label>
                              <span className="text-sm">{student.label}</span>
                              <span className="ml-2 font-mono text-xs text-ink-400">
                                {student.studentNumber}
                              </span>
                            </Label>
                        </Checkbox>
                      </div>
                    ))
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <DateInput
                    label={t("enrolledAt")}
                    ariaLabel={t("enrolledAt")}
                    value={enrolledAt}
                    onChange={setEnrolledAt}
                    className="w-full"
                  />
                  <TextField
                    value={discount}
                    onChange={setDiscount}
                    className={["w-full"].filter(Boolean).join(" ")}
                  >
                    <Label>{t("discount")}</Label>
                    <InputGroup>
                      <InputGroup.Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder=" "
                      />
                      <InputGroup.Suffix>
                        {<span className="text-sm text-ink-400">%</span>}
                      </InputGroup.Suffix>
                    </InputGroup>
                  </TextField>
                </div>
                <p className="text-xs text-ink-500">{t("planHelp")}</p>
                {error ? <p className="text-sm text-danger">{error}</p> : null}
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  onPress={() => setOpen(false)}
                  variant={actionVariant("default", "light")}
                >
                  {tCommon("cancel")}
                </Button>
                <Button
                  isDisabled={selected.size === 0}
                  onPress={enroll}
                  variant={actionVariant("primary", "solid")}
                  isPending={busy}
                >
                  {busy ? <Spinner size="sm" tone="current" /> : null}
                  {t("enroll", { count: selected.size })}
                </Button>
              </Dialog.Footer>
      </Dialog>
    </section>
  );
}
