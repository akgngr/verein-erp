import economicOperation2026 from "./2026/gem.economic-operation-threshold.json";
import exemptionNotice2026 from "./2026/gem.exemption-notice-expiry.json";
import receiptValidity2026 from "./2026/gem.receipt-template-validity.json";
import timelyUse2026 from "./2026/gem.timely-use-of-funds.json";
import uebungsleiter2026 from "./2026/gem.uebungsleiter-allowance.json";
import { complianceRuleSchema, type ComplianceRule } from "./schema";

/** All rule versions (ADR 0009). Add new tax-year versions here; never edit a reviewed version in place. */
export const RULE_FILES: readonly unknown[] = [exemptionNotice2026, receiptValidity2026, timelyUse2026, uebungsleiter2026, economicOperation2026];

/** Parsed and validated rules; an invalid file throws (CI fails). */
export const COMPLIANCE_RULES: readonly ComplianceRule[] = Object.freeze(RULE_FILES.map((file) => complianceRuleSchema.parse(file)));
