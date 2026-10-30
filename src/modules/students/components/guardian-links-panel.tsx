"use client";

import { addToast, Button, Checkbox, Chip } from "@heroui/react";
import { Link2, Trash2, UserPlus, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { linkGuardianAction, makeStudentSelfPayerAction, unlinkGuardianAction } from "../actions/student-actions";
import { GUARDIAN_RELATION_VALUES } from "../constants";
import type { StudentDetail, StudentGuardianRelation } from "../types";

const SELECT_CLASS =
  "h-10 w-full rounded-medium border border-default-200 bg-default-50/50 px-3 text-small outline-none focus:border-primary";

/**
 * Öğrencinin velileri: mevcut veliyi bağla, ödeme sorumlusunu belirle, bağı kaldır ya da
 * yetişkin öğrenci için "kendisi öder" kaydı aç. Yeni veli veliler sayfasında oluşturulur.
 */
export function GuardianLinksPanel({
  student,
  guardianOptions,
  canUpdate,
}: {
  student: StudentDetail;
  guardianOptions: { id: string; label: string }[];
  canUpdate: boolean;
}) {
  const t = useTranslations("students.guardians");
  const tRelation = useTranslations("students.relation");
  const router = useRouter();
  const [guardianId, setGuardianId] = useState("");
  const [relation, setRelation] = useState<StudentGuardianRelation>("MOTHER");
  const [isPayer, setIsPayer] = useState(student.guardians.length === 0);
  const [busy, setBusy] = useState(false);

  const linked = new Set(student.guardians.map((guardian) => guardian.guardianId));
  const available = guardianOptions.filter((option) => !linked.has(option.id));

  const done = (result: { ok: boolean; error?: string }, success: string) => {
    setBusy(false);
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return false;
    }
    addToast({ title: success, color: "success" });
    router.refresh();
    return true;
  };

  const link = async () => {
    setBusy(true);
    const result = await linkGuardianAction({ studentId: student.id, guardianId, relation, isPayer });
    if (done(result, t("linked"))) setGuardianId("");
  };

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-default-200 bg-content1 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-medium font-semibold">{t("title")}</h2>
        {canUpdate && !student.guardians.some((guardian) => guardian.relation === "SELF") ? (
          <Button
            size="sm"
            variant="flat"
            startContent={<Wallet className="h-4 w-4" aria-hidden />}
            isDisabled={busy}
            onPress={async () => {
              setBusy(true);
              done(await makeStudentSelfPayerAction({ studentId: student.id }), t("selfPayerCreated"));
            }}
          >
            {t("selfPayer")}
          </Button>
        ) : null}
      </div>

      {student.guardians.length === 0 ? (
        <p className="text-small text-warning-600">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {student.guardians.map((guardian) => (
            <li key={guardian.guardianId} className="flex flex-wrap items-center justify-between gap-2 rounded-medium border border-default-200 p-3">
              <div className="flex min-w-0 flex-col">
                <span className="text-small font-medium">
                  {guardian.name} <span className="font-mono text-tiny text-default-400">#{guardian.debtorNumber}</span>
                </span>
                <span className="text-tiny text-default-500">
                  {[tRelation(guardian.relation), guardian.email, guardian.phone].filter(Boolean).join(" · ")}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {guardian.isPayer ? (
                  <Chip size="sm" color="primary" variant="flat">
                    {t("payer")}
                  </Chip>
                ) : canUpdate ? (
                  <Button
                    size="sm"
                    variant="light"
                    isDisabled={busy}
                    onPress={async () => {
                      setBusy(true);
                      done(
                        await linkGuardianAction({ studentId: student.id, guardianId: guardian.guardianId, relation: guardian.relation, isPayer: true }),
                        t("payerSet"),
                      );
                    }}
                  >
                    {t("makePayer")}
                  </Button>
                ) : null}
                <Button as={Link} href={`/ogrenciler/veliler?duzenle=${guardian.guardianId}`} size="sm" variant="light">
                  {t("openGuardian")}
                </Button>
                {canUpdate ? (
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    color="danger"
                    aria-label={t("unlink")}
                    isDisabled={busy}
                    onPress={async () => {
                      setBusy(true);
                      done(await unlinkGuardianAction({ studentId: student.id, guardianId: guardian.guardianId }), t("unlinked"));
                    }}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canUpdate ? (
        <div className="flex flex-col gap-3 border-t border-default-100 pt-4">
          <p className="text-small font-medium">{t("linkTitle")}</p>
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[2fr_1fr_auto_auto]">
            <label className="flex flex-col gap-1 text-small">
              <span>{t("guardian")}</span>
              <select className={SELECT_CLASS} value={guardianId} onChange={(event) => setGuardianId(event.target.value)}>
                <option value="">{t("chooseGuardian")}</option>
                {available.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-small">
              <span>{t("relation")}</span>
              <select className={SELECT_CLASS} value={relation} onChange={(event) => setRelation(event.target.value as StudentGuardianRelation)}>
                {GUARDIAN_RELATION_VALUES.filter((value) => value !== "SELF").map((value) => (
                  <option key={value} value={value}>
                    {tRelation(value)}
                  </option>
                ))}
              </select>
            </label>
            <Checkbox isSelected={isPayer} onValueChange={setIsPayer} className="pb-2">
              {t("payer")}
            </Checkbox>
            <Button color="primary" startContent={<Link2 className="h-4 w-4" aria-hidden />} isDisabled={!guardianId || busy} onPress={link}>
              {t("link")}
            </Button>
          </div>
          <Button as={Link} href="/ogrenciler/veliler?yeni" size="sm" variant="light" className="self-start" startContent={<UserPlus className="h-4 w-4" aria-hidden />}>
            {t("newGuardian")}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
