import Link from "next/link";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { cn } from "@/shared/utils";

import {
  BatchIssuePanel,
  DonationCandidatePicker,
  FeeCandidateList,
  IssueFilters,
  type IssueCandidateRow,
  type IssueMode,
} from "../components/issue-wizard";
import { ReadinessChecklist } from "../components/readiness-checklist";
import { donationsPermissions } from "../permissions";
import {
  findBatchRecipients,
  findDonationCandidates,
  findMemberFeeCandidates,
} from "../queries/find-confirmation-candidates";
import { getReadiness } from "../services/issue-guards";
import type { ConfirmationCandidate } from "../types";
import { berlinTodayStart } from "../utils";

type RawParams = Record<string, string | string[] | undefined>;

const MODES: IssueMode[] = ["tek", "toplu", "aidat", "yillik"];

/** Seçili yıldan geriye listelenen yıl sayısı (yıl seçici). */
const YEAR_OPTIONS = 6;

function single(params: RawParams, key: string): string | null {
  const value = params[key];
  return typeof value === "string" && value !== "" ? value : null;
}

/**
 * `?tur=` yoksa spec'teki `?kaynak=bagis|aidat` girişinden türetilir (bağış ve
 * bağışçı detayındaki "Bildirim oluştur" bağlantıları kaynak + alıcı gönderir).
 */
function resolveMode(params: RawParams): IssueMode | null {
  const tur = single(params, "tur");
  if (tur && (MODES as string[]).includes(tur)) return tur as IssueMode;
  const kaynak = single(params, "kaynak");
  if (kaynak === "aidat") return "aidat";
  if (kaynak === "bagis") return "tek";
  return null;
}

function toRows(candidates: ConfirmationCandidate[]): IssueCandidateRow[] {
  return candidates.map((candidate) => ({
    sourceId: candidate.sourceId,
    itemDate: candidate.itemDate.toISOString(),
    amountCents: candidate.amountCents,
    waived: candidate.waived,
    sourceNumber: candidate.sourceNumber,
  }));
}

/**
 * Bildirim oluşturma sihirbazı (§ 15 md. 6): 1) tür, 2) yıl + alıcı ve adaylar,
 * 3) toplam/yazıyla önizleme + hazır olma kontrolü → "Oluştur". Adım durumu URL'de
 * (`?tur=&yil=&bagisci=&uye=&icerik=`); adaylar sunucuda yüklenir.
 */
export async function ConfirmationIssueView({ searchParams }: { searchParams: Promise<RawParams> }) {
  try {
    await requirePermission(donationsPermissions, "approve");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const t = await getTranslations("donations.confirmations.issue");
  const tSettings = await getTranslations("donations.settings");
  const params = await searchParams;
  const mode = resolveMode(params);
  const currentYear = berlinTodayStart().getUTCFullYear();
  const yearParam = Number(single(params, "yil"));
  const year = Number.isInteger(yearParam) && yearParam >= 2000 && yearParam <= currentYear ? yearParam : currentYear;
  const years = Array.from({ length: YEAR_OPTIONS }, (_, index) => currentYear - index);
  const batchContent = single(params, "icerik") === "aidat" ? "aidat" : "bagis";
  const donorId = single(params, "bagisci");
  const memberId = single(params, "uye");

  const readiness = await getReadiness(new Date());
  const isFee = mode === "aidat" || (mode === "yillik" && batchContent === "aidat");
  const canIssue = isFee ? readiness.canIssueMembershipFee : readiness.canIssueDonation;

  const typeCards: Array<{ mode: IssueMode; title: string; hint: string }> = [
    { mode: "tek", title: t("typeSingle"), hint: t("typeSingleHint") },
    { mode: "toplu", title: t("typeCollective"), hint: t("typeCollectiveHint") },
    { mode: "aidat", title: t("typeFee"), hint: t("typeFeeHint") },
    { mode: "yillik", title: t("typeBatch"), hint: t("typeBatchHint") },
  ];

  let step2: ReactNode = null;
  if (mode === "tek" || mode === "toplu") {
    const recipients = await findBatchRecipients("DONATION", year);
    const selected = donorId && recipients.some((recipient) => recipient.id === donorId) ? donorId : null;
    step2 = (
      <>
        <IssueFilters
          mode={mode}
          year={year}
          years={years}
          recipients={recipients}
          recipientParam="bagisci"
          selectedRecipientId={selected}
          batchContent={batchContent}
        />
        {recipients.length === 0 ? (
          <p className="text-small text-default-500">{t("noRecipients")}</p>
        ) : selected ? (
          <DonationCandidatePicker
            key={`${mode}-${selected}-${year}`}
            mode={mode}
            donorId={selected}
            year={year}
            candidates={toRows(await findDonationCandidates(selected, year))}
            canIssue={canIssue}
          />
        ) : null}
      </>
    );
  } else if (mode === "aidat") {
    const recipients = await findBatchRecipients("MEMBERSHIP_FEE", year);
    const selected = memberId && recipients.some((recipient) => recipient.id === memberId) ? memberId : null;
    step2 = (
      <>
        <IssueFilters
          mode={mode}
          year={year}
          years={years}
          recipients={recipients}
          recipientParam="uye"
          selectedRecipientId={selected}
          batchContent={batchContent}
        />
        {recipients.length === 0 ? (
          <p className="text-small text-default-500">{t("noRecipients")}</p>
        ) : selected ? (
          <FeeCandidateList
            key={`${selected}-${year}`}
            memberId={selected}
            year={year}
            candidates={toRows(await findMemberFeeCandidates(selected, year))}
            canIssue={canIssue}
          />
        ) : null}
      </>
    );
  } else if (mode === "yillik") {
    const content = batchContent === "aidat" ? "MEMBERSHIP_FEE" : "DONATION";
    const recipients = await findBatchRecipients(content, year);
    step2 = (
      <>
        <IssueFilters
          mode={mode}
          year={year}
          years={years}
          recipients={[]}
          recipientParam={null}
          selectedRecipientId={null}
          batchContent={batchContent}
        />
        <BatchIssuePanel
          key={`${content}-${year}`}
          content={content}
          year={year}
          recipients={recipients}
          canIssue={canIssue}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("title")} description={t("subtitle")} />

      <section className="flex flex-col gap-3">
        <h2 className="text-small font-semibold text-default-600">{t("step1")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {typeCards.map((card) => (
            <Link
              key={card.mode}
              href={`/bagislar/bildirimler/olustur?tur=${card.mode}&yil=${year}`}
              aria-current={mode === card.mode ? "page" : undefined}
              className={cn(
                "flex flex-col gap-1 rounded-medium border p-4 transition-colors",
                mode === card.mode
                  ? "border-primary bg-primary-50/60 dark:bg-primary-500/10"
                  : "border-default-200 bg-content1 hover:border-default-300 hover:bg-default-50",
              )}
            >
              <span className="text-small font-semibold text-foreground">{card.title}</span>
              <span className="text-tiny text-default-500">{card.hint}</span>
            </Link>
          ))}
        </div>
      </section>

      {mode ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="flex flex-col gap-4 rounded-medium border border-default-200 bg-content1 p-4 shadow-sm">
            <h2 className="text-small font-semibold text-default-600">{t("step2")}</h2>
            {step2}
          </section>
          <div className="flex flex-col gap-3">
            <ReadinessChecklist
              items={readiness.items.filter((item) => isFee || item.key !== "membershipFees")}
              title={t("readiness")}
              fixLabel={t("fix")}
              warnLabel={tSettings("validityWarn")}
            />
            {!canIssue ? <p className="text-tiny text-danger">{t("blocked")}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
