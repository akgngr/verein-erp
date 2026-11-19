import { getTranslations } from "next-intl/server";

import type { AdvancedWorkbenchLabels } from "./advanced-workbench-view";

/** All visible copy comes from secretary.ui translations, never hard-coded in the component. */
export async function getAdvancedWorkbenchLabels(): Promise<AdvancedWorkbenchLabels> {
  const t = await getTranslations("secretary");
  return {
    title: t("ui.advancedTitle"),
    empty: t("ui.advancedEmpty"),
    openSource: t("ui.openSource"),
    approvalRequired: t("ui.advancedApprovalRequired"),
    kinds: {
      "mail-triage": t("ui.advancedMail"),
      "follow-up": t("ui.advancedFollowUp"),
      "weekly-report": t("ui.advancedWeeklyReport"),
      "ocr-suggestion": t("ui.advancedOcr"),
      "channel-consent": t("ui.advancedChannel"),
      delegation: t("ui.advancedDelegation"),
    },
    statuses: {
      draft: t("ui.advancedDraft"),
      "needs-review": t("ui.advancedNeedsReview"),
      paused: t("ui.advancedPaused"),
      complete: t("ui.advancedComplete"),
    },
  };
}
