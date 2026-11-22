/** Owner decision 2026-11-22: no individual tax/legal advice from any LLM surface (StBerG / RDG). */
import assert from "node:assert/strict";
import test from "node:test";

import { systemPrompt } from "@/modules/ai/services/system-prompt";
import { PROFESSIONAL_ADVICE_INSTRUCTION } from "@/shared/ai/advice-policy";

test("assistant system prompt always carries the professional-advice boundary (TR and DE)", () => {
  for (const locale of ["tr", "de"]) {
    const prompt = systemPrompt(locale, "2031-01-01", "");
    assert.ok(prompt.includes(PROFESSIONAL_ADVICE_INSTRUCTION), locale);
  }
  assert.match(PROFESSIONAL_ADVICE_INSTRUCTION, /Steuerberater/);
  assert.match(PROFESSIONAL_ADVICE_INSTRUCTION, /keine Steuer- oder Rechtsberatung/);
  assert.match(PROFESSIONAL_ADVICE_INSTRUCTION, /vergi veya hukuk danışmanlığı değildir/);
});
