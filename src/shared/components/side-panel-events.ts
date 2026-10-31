/**
 * Sağ yan panel (ör. AI asistanı) ile sol menü arasındaki gevşek bağ: panel açılınca sol menü
 * ikon şeridine daralır, kapanınca kullanıcının önceki tercihine döner. Modüller uygulama
 * kabuğunu import etmeden bu olayla haberleşir.
 */
export const SIDE_PANEL_EVENT = "verein:side-panel";

export type SidePanelEventDetail = { open: boolean };

export function announceSidePanel(open: boolean): void {
  window.dispatchEvent(new CustomEvent<SidePanelEventDetail>(SIDE_PANEL_EVENT, { detail: { open } }));
}
