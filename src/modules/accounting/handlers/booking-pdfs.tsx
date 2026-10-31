import "server-only";

import { NextResponse } from "next/server";

import { translateMessage } from "@/shared/i18n/translate-message";
import { parseListParams, type RawSearchParams } from "@/shared/list-params";
import { resolvePdfLang } from "@/shared/pdf/i18n";

import { BOOKINGS_EXPORT_MAX_ROWS } from "../constants";
import { BookingListDocument } from "../pdf/booking-list-document";
import { DOCUMENT_STRINGS } from "../pdf/document-strings";
import { VoucherDocument } from "../pdf/voucher-document";
import { getBooking } from "../queries/get-booking";
import { BOOKING_SORTABLE_FIELDS, listBookingsForExport } from "../queries/list-bookings";
import { berlinToday } from "../utils";
import { authorizePdf, loadLetterhead, pdfResponse } from "./pdf-support";

/** GET /api/accounting/[id]/pdf — gelirde Quittung, giderde Auszahlungsbeleg, virmanda Umbuchungsbeleg. */
export async function bookingVoucherPdfHandler(request: Request, id: string): Promise<Response> {
  const user = await authorizePdf();
  if (user instanceof Response) return user;
  const booking = await getBooking(id);
  if (!booking) {
    return NextResponse.json({ ok: false, error: await translateMessage("accounting.errors.bookingNotFound") }, { status: 404 });
  }
  const lang = resolvePdfLang(request);
  return pdfResponse({
    user,
    document: <VoucherDocument data={{ organization: await loadLetterhead(), lang, strings: DOCUMENT_STRINGS[lang], booking }} />,
    fileName: `beleg-${booking.bookingNumber}.pdf`,
    audit: { entity: "AccountingBooking", entityId: booking.id, after: { report: "voucher-pdf", bookingNumber: booking.bookingNumber } },
  });
}

/** GET /api/accounting/export/pdf — fiş listesinin ekrandaki filtrelerle PDF'i. */
export async function bookingListPdfHandler(request: Request): Promise<Response> {
  const user = await authorizePdf();
  if (user instanceof Response) return user;
  const raw: RawSearchParams = Object.fromEntries(new URL(request.url).searchParams.entries());
  const params = parseListParams(raw, {
    sortableFields: BOOKING_SORTABLE_FIELDS,
    defaultSort: "bookingDate",
    defaultDir: "asc",
    filterKeys: ["year", "type", "accountId", "categoryId", "sphere", "projectId", "missingReceipt", "source", "includeReversed", "from", "to"],
  });
  const year = params.filters.year && /^\d{4}$/.test(params.filters.year) ? params.filters.year : String(berlinToday().getUTCFullYear());
  const effective = { ...params, filters: { ...params.filters, year } };
  const fetched = await listBookingsForExport(effective, BOOKINGS_EXPORT_MAX_ROWS + 1);
  const truncated = fetched.length > BOOKINGS_EXPORT_MAX_ROWS;
  const lang = resolvePdfLang(request);
  return pdfResponse({
    user,
    document: (
      <BookingListDocument
        data={{
          organization: await loadLetterhead(),
          lang,
          strings: DOCUMENT_STRINGS[lang],
          year,
          rows: fetched.slice(0, BOOKINGS_EXPORT_MAX_ROWS),
          truncatedAt: truncated ? BOOKINGS_EXPORT_MAX_ROWS : null,
        }}
      />
    ),
    fileName: `einnahmen-ausgaben-${year}.pdf`,
    audit: { entity: "AccountingBooking", entityId: null, after: { report: "booking-list-pdf", year, filters: effective.filters } },
  });
}
