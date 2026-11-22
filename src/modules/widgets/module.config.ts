import type { ModuleConfig } from "@/shared/types/module";

/**
 * Widget Platform (ADR 0007-widget-platform, #435). CORE: discovers module widgets declared in
 * `src/modules/<module>/widget.ts` at build time (`pnpm module:sync` → src/widget-registry.ts) and decides
 * server-side which widgets a user may see. It does not import business modules and owns no data in WP1.
 * label/description are fallbacks; visible names come from messages/<lang>.json → widgets.module.*.
 */
export const moduleConfig: ModuleConfig = {
  key: "widgets",
  // Modül sürümü: releases.json en üstteki sürümle aynı olmalı (modülde her değişiklikte artırın).
  version: "0.2.0",
  label: "Widget Platformu",
  description: "Modüllerin üst çubuk ve paneller için bileşenlerini güvenli biçimde toplar.",
  category: "CORE",
  isProtected: true,
  hasSchema: true,
  // Görünür giriş noktası yok; widget'lar yuvalarda (ör. header.right) çizilir (WP2 #436).
  nav: [],
};

export default moduleConfig;
