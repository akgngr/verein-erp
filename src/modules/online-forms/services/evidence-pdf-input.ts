import "server-only";


import { getOrganizationLogoDataUri, getOrganizationProfile } from "@/modules/organization/automation";
import { getEnvPdfLangDefault, type PdfLang } from "@/shared/pdf/i18n";
import type { LetterheadProfile } from "@/shared/pdf/letterhead";

import type { EvidencePdfLabels } from "../pdf/evidence-document";
import { getEvidence, hasStoredDocument, storeDocument, type EvidenceSnapshot } from "./evidence-store";

/** PDF girdisi ve worker yolu. @react-pdf'i YÜKLEMEZ (worker react-server koşuluyla çalışır). */
export type EvidencePdfInput = { snapshot: EvidenceSnapshot; signature: string; organization: LetterheadProfile; labels: EvidencePdfLabels; dateTime: string };

/** Belgenin tüm girdisi (çeviriler, antet, tarih); çizim ayrı yapılır (Next.js içinde ya da alt işlemde). */
export async function buildEvidencePdfInput(snapshot: EvidenceSnapshot, signature: string, lang: PdfLang): Promise<EvidencePdfInput> {
  const messages = lang === "de" ? (await import("../../../../messages/de.json")).default : (await import("../../../../messages/tr.json")).default;
  const t = simpleTranslator((messages as Record<string, unknown>)["online-forms"] as Record<string, unknown>);
  const fieldKeys = ["email", "phone", "birthDate", "profession", "street", "houseNumber", "postalCode", "city", "state", "country", "school", "gradeLevel", "iban", "bic", "accountHolder"];
  const labels: EvidencePdfLabels = {
    title: t("pdf.title"),
    subtitle: t("pdf.subtitle", { name: snapshot.subjectName, kind: t(`kinds.${snapshot.kind}`) }),
    sections: { member: t("public.sections.person"), student: snapshot.signerRole === "guardian" ? t("public.sections.child") : t("public.sections.person"), guardian: t("public.sections.guardian"), consents: t("public.sections.consents"), privacyText: t("pdf.privacyText"), photoText: t("pdf.photoText"), signature: t("public.sections.signature"), evidence: t("pdf.evidence") },
    fields: { ...Object.fromEntries(fieldKeys.map((key) => [key, t(`public.fields.${key}` as never)])), messagingConsents: t("pdf.messaging"), bulkMailOptOut: t("public.bulkMailOptOut") },
    consents: { sms: t("consents.sms"), whatsapp: t("consents.whatsapp"), telegram: t("consents.telegram") },
    yes: t("pdf.yes"), accepted: t("pdf.accepted"),
    no: t("pdf.no"),
    meta: { documentKey: t("pdf.documentKey"), signer: t("pdf.signer"), signedAt: t("pdf.signedAt"), channel: t("columns.channel"), textVersion: t("pdf.textVersion"), evidenceHash: t("pdf.evidenceHash"), note: t("pdf.note") },
  };
  const [profile, logoDataUri] = await Promise.all([getOrganizationProfile(), getOrganizationLogoDataUri()]);
  const dateTime = new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date(snapshot.signedAt));
  return { snapshot, signature, organization: { ...profile, logoDataUri }, labels, dateTime };
}

/**
 * Worker: PDF ayrı bir Node alt işleminde çizilir. Worker `react-server` koşuluyla çalışır ve orada React'ın
 * sunucu sürümü yüklenir; @react-pdf tam React ister. Alt işlem yalnız girdiyi (stdin) alır, PDF'i (stdout) döner.
 */
async function renderInChildProcess(input: EvidencePdfInput): Promise<Uint8Array> {
  const { spawn } = await import("node:child_process");
  const path = await import("node:path");
  const script = path.resolve(process.cwd(), "src/modules/online-forms/pdf/render-cli.mjs");
  const env = { ...process.env };
  delete env.NODE_OPTIONS;
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], { cwd: process.cwd(), env, stdio: ["pipe", "pipe", "pipe"] });
    const out: Buffer[] = [];
    let err = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), 90_000);
    child.stdout.on("data", (chunk: Buffer) => out.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => { err = (err + chunk.toString()).slice(-2000); });
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timer);
      const pdf = Buffer.concat(out);
      if (code === 0 && pdf.subarray(0, 4).toString() === "%PDF") resolve(new Uint8Array(pdf));
      else reject(new Error(`PDF_RENDER_FAILED code=${code} ${err.split("\n").slice(0, 4).join(" ").slice(0, 600)}`));
    });
    child.stdin.end(JSON.stringify(input));
  });
}

/** Worker görevi: alt işlemde çizip saklar. */
export async function storeEvidencePdfInWorker(id: string): Promise<void> {
  if (await hasStoredDocument(id)) return;
  const evidence = await getEvidence(id);
  if (!evidence) return;
  const input = await buildEvidencePdfInput(evidence.snapshot, evidence.signature, getEnvPdfLangDefault());
  await storeDocument(id, await renderInChildProcess(input));
}

/**
 * Worker'da next-intl yüklenemez (react-server koşulunda React context yok). PDF etiketleri düz metin ya da
 * yalnız `{ad}` yerleştirmesi içerir; bu kadarını burada çözeriz. Eksik anahtar anahtarın kendisini döner.
 */
function simpleTranslator(messages: Record<string, unknown>) {
  return (key: string, values: Record<string, string | number> = {}): string => {
    const found = key.split(".").reduce<unknown>((node, part) => (node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined), messages);
    if (typeof found !== "string") return key;
    return found.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match)).replace(/''/g, "'");
  };
}
