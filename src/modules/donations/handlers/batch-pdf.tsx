import "server-only";

import { Document, Page, Text, renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";
import { can } from "@/shared/permissions/define";
import { registerSharedPdfFonts } from "@/shared/pdf/fonts";
import { buildUserLabel } from "@/shared/utils";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import { BATCH_PDF_MAX_IDS } from "../constants";
import { donationsPermissions } from "../permissions";
import { ConfirmationBody, type ConfirmationPdfData } from "../pdf/confirmation-document";
import { ATTACHMENT_TITLE } from "../pdf/template-de";
import { storedSnapshotToPdfData } from "./snapshot-pdf";

/** ASCII güvenli dosya adı. */
function asciiFileName(name: string): string {
  return name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_").slice(0, 150);
}

/**
 * Toplu yazdırma (§ 13): ?ids=a,b,c (max 100); DEPOLANMIŞ snapshot'lardan TEK
 * çok sayfalı PDF (deterministik; depolanmaz). audit PDF_BATCH_DOWNLOAD (adet).
 */
export async function batchPdfHandler(request: Request): Promise<Response> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: "Oturum bulunamadı." }, { status: 401 });
    }
    throw error;
  }

  if (!can(user.role, donationsPermissions, "view")) {
    return NextResponse.json({ ok: false, error: "Bu işlem için yetkiniz yok." }, { status: 403 });
  }

  const idsParam = new URL(request.url).searchParams.get("ids") ?? "";
  const ids = idsParam.split(",").map((id) => id.trim()).filter(Boolean).slice(0, BATCH_PDF_MAX_IDS);
  if (ids.length === 0) {
    return NextResponse.json({ ok: false, error: "Bildirim seçilmedi." }, { status: 400 });
  }

  const db = getDb();
  const confirmations = await db.zuwendungConfirmation.findMany({
    where: { id: { in: ids } },
    include: { items: { orderBy: { position: "asc" } } },
    orderBy: [{ year: "asc" }, { sequence: "asc" }],
  });
  if (confirmations.length === 0) {
    return NextResponse.json({ ok: false, error: "Bildirim bulunamadı." }, { status: 404 });
  }

  // Değişmez snapshot'lardan PDF verisi (yeniden üretim deterministik; § 13).
  const documents: ConfirmationPdfData[] = [];
  for (const confirmation of confirmations) {
    documents.push(
      await storedSnapshotToPdfData(confirmation, confirmation.items.map((item) => ({
        position: item.position,
        itemType: item.itemType,
        sourceId: item.sourceId,
        itemDate: item.itemDate,
        amountCents: Number(item.amount.mul(100).toFixed(0)),
        label: item.label,
        waived: item.waived,
      }))),
    );
  }

  registerSharedPdfFonts();

  // KARAR: Tek Document içinde birden çok ConfirmationDocument body'si —
  // sayfa sayısı = her bildirimin sayfaları toplamı. Basitlik: her bildirim
  // ayrı <Page> dizisiyle tek Document'te birleşir (§ 13: one multi-page PDF).
  const buffer = await renderToBuffer(<BatchDocument documents={documents} />);

  await writeAudit({
    userId: user.id,
    userLabel: buildUserLabel(user.name, user.email),
    action: "PDF_BATCH_DOWNLOAD",
    entity: "ZuwendungConfirmation",
    entityId: null,
    after: { count: documents.length },
  });

  const today = new Date().toISOString().slice(0, 10);
  const fileName = `zuwendungsbestaetigungen-${today}.pdf`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${asciiFileName(fileName)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

/** Tek Document'te çok bildirim: her bildirimin gövde + Anlage sayfaları. */
function BatchDocument({ documents }: { documents: ConfirmationPdfData[] }) {
  return (
    <Document title="Zuwendungsbestätigungen" language="de">
      {documents.map((data, index) => (
        <SingleConfirmationPages key={`${data.confirmationNumber ?? "muster"}-${index}`} data={data} />
      ))}
    </Document>
  );
}

function SingleConfirmationPages({ data }: { data: ConfirmationPdfData }) {
  const items = data.items ?? [];
  const money = (cents: number) =>
    new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2 }).format(cents / 100);
  const formatDE = (date: Date) => {
    const iso = date.toISOString().slice(0, 10);
    const [y, m, d] = iso.split("-");
    return `${d}.${m}.${y}`;
  };
  return (
    <>
      <Page size="A4" style={{ padding: 36, fontFamily: "NotoSans", fontSize: 10 }} wrap>
        <ConfirmationBody data={data} />
        <Text
          style={{ position: "absolute", bottom: 24, right: 36, fontSize: 8.5, color: "#555555" }}
          fixed
          render={({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}`}
        />
      </Page>
      {data.attachment && items.length > 0 ? (
        <Page size="A4" style={{ padding: 36, fontFamily: "NotoSans", fontSize: 10 }} wrap>
          <Text style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
            {ATTACHMENT_TITLE(formatDE(data.issueDate))}
          </Text>
          <Text>{data.recipient.name}</Text>
          <Text style={{ fontSize: 9, color: "#555555", marginBottom: 6 }}>
            {data.confirmationNumber ?? ""}
          </Text>
          <Text style={{ fontSize: 8.5 }}>
            {items
              .map(
                (item) =>
                  `${item.position}. ${formatDE(item.itemDate)} — ${item.label} — ${money(item.amountCents)} € — ${item.waived ? "Ja" : "Nein"}`,
              )
              .join("\n")}
          </Text>
          <Text style={{ fontSize: 9, fontWeight: 700, marginTop: 8 }}>
            Gesamtsumme: {money(data.totalCents)} €
          </Text>
          <Text
            style={{ position: "absolute", bottom: 24, right: 36, fontSize: 8.5, color: "#555555" }}
            fixed
            render={({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}`}
          />
        </Page>
      ) : null}
    </>
  );
}
