import assert from "node:assert/strict";
import { test } from "node:test";

import { DOCUMENT_STRINGS } from "@/modules/accounting/pdf/document-strings";
import { buildEpcQrPayload, encodeQrMatrix } from "@/shared/pdf/epc-qr";

test("Outgoing invoice EPC-QR strings exist in DE and TR and produce a valid QR matrix", () => {
  for (const lang of ["de", "tr"] as const) {
    const s = DOCUMENT_STRINGS[lang];
    assert.ok(s.epcQrTitle.includes("EPC-QR"));
    assert.ok(s.epcQrCaption("R-2026-0042").includes("R-2026-0042"));

    const payload = buildEpcQrPayload({
      beneficiaryName: "Musterverein e.V.",
      iban: "DE89 3704 0044 0532 0130 00",
      bic: "COBADEFFXXX",
      amountCents: 19900,
      remittanceText: `${s.invoiceTitle} R-2026-0042`,
    });
    assert.ok(payload);
    assert.ok(payload.includes("EUR199.00"));
    assert.ok(payload.includes("R-2026-0042"));
    const matrix = encodeQrMatrix(payload);
    assert.ok(matrix.version >= 1 && matrix.version <= 13);
  }
});
