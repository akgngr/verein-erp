/** Sohbet panelinin kalıcı durumu (çerez): açık mı, genişlik, etkin sohbet. İstemci + sunucu. */
export const AI_PANEL_COOKIE = "ai_panel";
export const AI_PANEL_MIN_WIDTH = 320;
export const AI_PANEL_MAX_WIDTH = 760;
export const AI_PANEL_DEFAULT_WIDTH = 400;

export type AiPanelState = { open: boolean; width: number; conversationId: string | null };

export function encodePanelState(state: AiPanelState): string {
  return encodeURIComponent([state.open ? "1" : "0", Math.round(state.width), state.conversationId ?? ""].join("|"));
}

export function decodePanelState(raw: string | undefined): AiPanelState {
  const [open, width, conversationId] = decodeURIComponent(raw ?? "").split("|");
  const parsed = Number(width);
  return {
    open: open === "1",
    width: Number.isFinite(parsed) ? Math.min(AI_PANEL_MAX_WIDTH, Math.max(AI_PANEL_MIN_WIDTH, parsed)) : AI_PANEL_DEFAULT_WIDTH,
    conversationId: conversationId && /^[a-z0-9]{10,64}$/i.test(conversationId) ? conversationId : null,
  };
}
