import type { ReactNode } from "react";

import type { SessionUser } from "@/modules/auth";
import { listUsableModuleKeys } from "@/modules/system/server";
import { createTaskAction } from "@/modules/tasks/server";
import { can } from "@/shared/permissions/define";

import { AiChatPanel } from "../components/ai-chat-panel";
import { aiPermissions } from "../permissions";
import { getActiveProvider, hasAiConsent } from "../services/consent";

/**
 * İçerik sütununu saran asistan kabuğu: altta yüzen giriş çubuğu, açılınca sağda sohbet sütunu. Yalnızca modül etkin + erişim onaylı ve kullanıcının rolü
 * izinliyse çizilir; rıza verilmemişse panel önce bilgilendirme ve onay ekranını gösterir.
 */
export async function AiAssistantSlot({ user, children }: { user: SessionUser; children: ReactNode }) {
  if (!can(user.role, aiPermissions, "view")) return children;
  if (!(await listUsableModuleKeys()).includes("ai")) return children;
  const [consented, provider] = await Promise.all([hasAiConsent(user.id), getActiveProvider()]);
  return (
    <AiChatPanel consented={consented} provider={provider} createTask={createTaskAction}>
      {children}
    </AiChatPanel>
  );
}
