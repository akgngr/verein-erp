import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

import { groupSecretaryProposals } from "@/modules/secretary/views/inbox-groups";
import type { ProposalView } from "@/modules/secretary/services/proposals";

const proposal = (moduleKey: string, actionKey: string): ProposalView => ({
  id: `${moduleKey}-${actionKey}`, moduleKey, actionKey, risk: "internal",
  title: "Synthetic proposal", expiresAt: "2026-12-01T00:00:00.000Z",
});

test("only vetted mail draft actions enter the separate approval group", () => {
  const { mailDrafts, other } = groupSecretaryProposals([
    proposal("mail", "replyDraft"), proposal("mail", "taskDraft"),
    proposal("mail", "send"), proposal("documents", "ocr"),
  ]);
  assert.deepEqual(mailDrafts.map((row) => row.actionKey), ["replyDraft", "taskDraft"]);
  assert.deepEqual(other.map((row) => row.actionKey), ["send", "ocr"]);
});

test("OCR review delegates authorization to the guarded documents route and never submits files from Secretary", () => {
  const home = fs.readFileSync("src/modules/secretary/views/home-view.tsx", "utf8");
  const link = fs.readFileSync("src/modules/secretary/components/document-review-link.tsx", "utf8");
  assert.match(home, /<SecretaryDocumentReviewLink/);
  assert.doesNotMatch(home, /@\/modules\/documents|@\/modules\/system\/server/);
  assert.match(link, /href="\/evrak\/yeni"/);
  assert.doesNotMatch(link, /fetch\(|FileReader|FormData|analyzeFileHandler|createDocumentAction/);
});

test("approval, follow-up, report, consent and delegation remain connected to real actions and translated", () => {
  const paths = [
    "src/modules/secretary/components/proposal-actions.tsx",
    "src/modules/secretary/components/follow-ups.tsx",
    "src/modules/secretary/components/weekly-report.tsx",
    "src/modules/secretary/components/channel-consents-panel.tsx",
    "src/modules/secretary/components/delegation-panel.tsx",
  ];
  for (const path of paths) {
    const code = fs.readFileSync(path, "utf8");
    assert.match(code, /from "\.\.\/actions\//, path);
    assert.doesNotMatch(code, /@heroui\/react|mockData|fakeSuccess/, path);
  }
  const tr = JSON.parse(fs.readFileSync("src/modules/secretary/messages/tr.json", "utf8"));
  const de = JSON.parse(fs.readFileSync("src/modules/secretary/messages/de.json", "utf8"));
  for (const key of ["mailTriageTitle", "mailTriageHelp", "mailReplyDraft", "mailTaskDraft", "documentReviewTitle", "documentReviewDescription", "documentReviewOpen"]) {
    assert.ok(tr.ui[key] && de.ui[key], key);
  }
});
