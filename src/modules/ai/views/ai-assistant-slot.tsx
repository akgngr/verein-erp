import { cookies } from "next/headers";
import type { ReactNode } from "react";

import type { SessionUser } from "@/modules/auth";
import { listUsableModuleKeys } from "@/modules/system/server";
import { can } from "@/shared/permissions/define";

import { AiChatPanel } from "../components/ai-chat-panel";
import { AI_PANEL_COOKIE, decodePanelState } from "../panel-state";
import { aiPermissions } from "../permissions";
import { getActiveProvider, hasAiConsent } from "../services/consent";

/**
 * İçerik sütununu saran asistan kabuğu: altta yüzen giriş çubuğu, açılınca sağda sohbet sütunu. Yalnızca modül etkin + erişim onaylı ve kullanıcının rolü
 * izinliyse çizilir; rıza verilmemişse panel önce bilgilendirme ve onay ekranını gösterir.
 */
export async function AiAssistantSlot({ user, children }: { user: SessionUser; children: ReactNode }) {
  if (!can(user.role, aiPermissions, "view")) return children;
  if (!(await listUsableModuleKeys()).includes("ai")) return children;
  const [consented, provider, cookieStore] = await Promise.all([hasAiConsent(user.id), getActiveProvider(), cookies()]);
  return (
    <AiChatPanel consented={consented} provider={provider} initialState={decodePanelState(cookieStore.get(AI_PANEL_COOKIE)?.value)}>
      {children}
    </AiChatPanel>
  );
}
