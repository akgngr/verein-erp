import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Button, Card, CardContent, CardHeader, StatusChip } from "@/shared/components/kit";

import { PortalRightsPanel } from "../components/portal-rights-panel";
import { PortalStepUpButton } from "../components/step-up-button";
import { PortalSelfServicePanel } from "../components/portal-self-service-panel";
import { getActivePortalSession } from "../services/auth";
import { isPortalEnabled, isPortalStepUpActive, PORTAL_SESSION_COOKIE } from "../services/auth-core";
import { getPortalMasterData } from "../services/master-data";
import { listPortalPasskeys } from "../services/passkey";
import {
  listPortalArt15Requests,
  listPortalBusinessFeatures,
  listPortalProcessingLog,
} from "../services/rights";
import {
  listPortalConsents,
  listPortalCorrections,
  listPortalReceipts,
} from "../services/self-service";

/**
 * Isolated Member Portal shell (ADR 0010 P1/P2/P3):
 * reads ONLY the portal session cookie (never admin session), shows own
 * master data with masked IBAN, passkey status, corrections queue, consents,
 * step-up receipts, Art. 15 export, processing log, and Business+ features.
 */
export async function PortalShellView() {
  if (!isPortalEnabled()) notFound();

  const cookieStore = await cookies();
  const rawSession = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;
  const session = await getActivePortalSession(rawSession);
  if (!session) redirect("/portal/giris");

  const [
    t,
    masterData,
    passkeys,
    corrections,
    consents,
    receipts,
    art15Requests,
    processingLog,
    businessFeatures,
  ] = await Promise.all([
    getTranslations("member-portal"),
    getPortalMasterData(session.subjectRef),
    listPortalPasskeys(session.subjectRef),
    listPortalCorrections(session.subjectRef),
    listPortalConsents(session.subjectRef),
    listPortalReceipts(session.subjectRef),
    listPortalArt15Requests(session.subjectRef),
    listPortalProcessingLog(session.subjectRef),
    listPortalBusinessFeatures(session.subjectRef),
  ]);

  if (!masterData) redirect("/portal/giris");

  const stepUpActive = isPortalStepUpActive(session);

  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-200 bg-surface p-5">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">
            {t("shell.welcome", { name: `${masterData.firstName} ${masterData.lastName}` })}
          </h1>
          <p className="text-xs text-ink-500">
            {t("shell.memberNumber")}: {masterData.memberNumber ?? "—"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip tone={stepUpActive ? "success" : "warning"}>
            {stepUpActive ? t("shell.stepUpActive") : t("shell.stepUpRequired")}
          </StatusChip>
          {!stepUpActive ? <PortalStepUpButton /> : null}
          <form action="/api/member-portal/logout" method="POST">
            <Button type="submit" size="sm" variant="secondary">
              {t("shell.signOutEverywhere")}
            </Button>
          </form>
        </div>
      </header>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-ink-900">{t("shell.masterDataTitle")}</h2>
          <p className="text-xs text-ink-500">{t("shell.masterDataSubtitle")}</p>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-ink-500">{t("shell.fields.email")}</dt>
              <dd className="font-medium text-ink-900">{masterData.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500">{t("shell.fields.phone")}</dt>
              <dd className="font-medium text-ink-900">{masterData.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500">{t("shell.fields.address")}</dt>
              <dd className="font-medium text-ink-900">
                {[masterData.street, masterData.houseNumber, masterData.postalCode, masterData.city]
                  .filter(Boolean)
                  .join(" ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500">{t("shell.fields.iban")}</dt>
              <dd className="font-mono text-ink-900">{masterData.maskedIban ?? "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-ink-900">{t("shell.securityTitle")}</h2>
        </CardHeader>
        <CardContent className="text-sm text-ink-600">
          <p>{t("shell.passkeyCount", { count: passkeys.length })}</p>
        </CardContent>
      </Card>

      <PortalSelfServicePanel
        initialCorrections={corrections}
        initialConsents={consents}
        receipts={receipts.map((r) => ({
          ref: r.ref,
          kind: r.kind,
          number: r.number,
          year: r.year,
          amountCents: r.amountCents,
          voided: r.voided,
        }))}
        stepUpActive={stepUpActive}
      />

      <PortalRightsPanel
        initialArt15={art15Requests.map((r) => ({
          id: r.id,
          status: r.status,
          expiresAt: r.expiresAt.toISOString(),
          createdAt: r.createdAt.toISOString(),
        }))}
        processingLog={processingLog.map((e) => ({
          id: e.id,
          actorRole: e.actorRole,
          category: e.category,
          action: e.action,
          createdAt: e.createdAt.toISOString(),
        }))}
        stepUpActive={stepUpActive}
        businessLicensed={businessFeatures.licensed}
        initialEvents={businessFeatures.events.map((ev) => ({
          id: ev.id,
          title: ev.title,
          startDate: ev.startDate.toISOString(),
          location: ev.location,
          isOnline: ev.isOnline,
          isRegistered: ev.isRegistered,
        }))}
        initialPendingForms={businessFeatures.pendingForms.map((f) => ({
          id: f.id,
          kind: f.kind,
          expiresAt: f.expiresAt.toISOString(),
        }))}
      />
    </main>
  );
}
