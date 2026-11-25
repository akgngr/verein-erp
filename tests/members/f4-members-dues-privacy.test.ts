import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { checkDueOverpayment } from "@/modules/members/services/dues-rules";

test("checkDueOverpayment blocks payments exceeding open annual due balance (#578)", () => {
  // 60 EUR due, 40 EUR already paid -> remaining 20 EUR
  assert.deepEqual(checkDueOverpayment(6000, 4000, 2000), { ok: true, remainingAfterCents: 0 });
  assert.deepEqual(checkDueOverpayment(6000, 4000, 1500), { ok: true, remainingAfterCents: 500 });
  assert.deepEqual(checkDueOverpayment(6000, 4000, 10000), {
    ok: false,
    remainingOpenCents: 2000,
    excessCents: 8000,
  });
  // Already fully paid -> any additional payment blocked
  assert.deepEqual(checkDueOverpayment(6000, 6000, 100), {
    ok: false,
    remainingOpenCents: 0,
    excessCents: 100,
  });
  // Historical year with no MemberDue row -> allowed
  assert.deepEqual(checkDueOverpayment(null, 0, 5000), { ok: true, remainingAfterCents: null });
});

test("members structural guards: transactional dues invariants, receipt audit, Art. 15 fields, soft-delete cleanup, case-insensitive import (#578)", () => {
  const createPayment = readFileSync("src/modules/members/actions/create-payment.ts", "utf8");
  assert.match(createPayment, /checkDueOverpayment/);
  assert.match(createPayment, /paymentExceedsOpenDue/);

  const duesActions = readFileSync("src/modules/members/actions/dues-actions.ts", "utf8");
  // Both updateDueAction and deleteDueAction query inside $transaction (tx.memberPayment)
  assert.match(duesActions, /tx\.memberPayment\.aggregate/);
  assert.match(duesActions, /tx\.memberPayment\.count/);

  const receiptPdf = readFileSync("src/modules/members/handlers/receipt-pdf.tsx", "utf8");
  assert.match(receiptPdf, /writeAudit\(/);
  assert.match(receiptPdf, /dueAmountLabel/);

  const dataExport = readFileSync("src/modules/members/handlers/data-export.ts", "utf8");
  assert.match(dataExport, /sepaMandate/);
  assert.match(dataExport, /consents/);
  assert.match(dataExport, /memberDue\.findMany/);
  assert.match(dataExport, /memberCorrectionProposal\.findMany/);

  const importMembers = readFileSync("src/modules/members/handlers/import-members.ts", "utf8");
  assert.match(importMembers, /mode:\s*"insensitive"/);
  assert.match(importMembers, /BATCH_SIZE/);

  const deleteMember = readFileSync("src/modules/members/actions/delete-member.ts", "utf8");
  assert.match(deleteMember, /sepaMandateReference:\s*null/);
  assert.match(deleteMember, /revokePortalSessionsForMember\(tx,\s*member\.id/);
  assert.match(deleteMember, /cancelPendingMemberForms\(tx,\s*member\.id\)/);
  assert.match(readFileSync("src/modules/member-portal/services/cleanup.ts", "utf8"), /portalSession\.updateMany/);
  assert.match(readFileSync("src/modules/online-forms/services/cleanup.ts", "utf8"), /onlineFormRequest\.updateMany/);

  const memberList = readFileSync("src/modules/members/views/member-list-view.tsx", "utf8");
  assert.match(memberList, /CorrectionProposalsPanel/);
  assert.match(memberList, /listPendingMemberCorrectionProposals/);
});
