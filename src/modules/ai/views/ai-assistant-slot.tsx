import type { SessionUser } from "@/modules/auth";
import { listUsableModuleKeys } from "@/modules/system/server";
import { createTaskAction } from "@/modules/tasks/server";
import { can } from "@/shared/permissions/define";

import { AiChatPanel } from "../components/ai-chat-panel";
import { aiPermissions } from "../permissions";
import { hasAiConsent, isAiConfigured } from "../services/consent";

/**
 * Sağ paneldeki sohbet alanı. Yalnızca modül etkin + erişim onaylı ve kullanıcının rolü
 * izinliyse çizilir; rıza verilmemişse panel önce bilgilendirme ve onay ekranını gösterir.
 */
export async function AiAssistantSlot({ user }: { user: SessionUser }) {
  if (!can(user.role, aiPermissions, "view")) return null;
  if (!(await listUsableModuleKeys()).includes("ai")) return null;
  const consented = await hasAiConsent(user.id);
  return <AiChatPanel consented={consented} configured={isAiConfigured()} createTask={createTaskAction} />;
}
