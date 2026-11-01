import type { SessionUser } from "@/modules/auth";
import { listUsableModuleKeys } from "@/modules/system/server";
import { can } from "@/shared/permissions/define";

import { FeedbackWidget } from "../components/feedback-widget";
import { feedbackPermissions } from "../permissions";

/** Düzene eklenen yüzen buton: modül kapalıysa veya rol izinli değilse hiçbir şey çizmez. */
export async function FeedbackSlot({ user }: { user: SessionUser }) {
  if (!can(user.role, feedbackPermissions, "create")) return null;
  if (!(await listUsableModuleKeys()).includes("feedback")) return null;
  return <FeedbackWidget />;
}
