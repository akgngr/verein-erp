import { CloudSun } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";

import { weatherPermissions } from "./permissions";

export const moduleConfig: ModuleConfig = {
  key: "weather",
  version: "0.2.0",
  label: "Hava Durumu",
  description:
    "Anlık konum bazlı hava durumu, tahminler, panel kartı ve sekreter etkinlik önerileri (Dış API: api.open-meteo.com).",
  category: "EXTENSION",
  hasSchema: false,
  access: [{ module: "organization", operations: ["read"] }],
  nav: [
    {
      href: "/weather",
      label: "Hava Durumu",
      labelKey: "weather",
      icon: CloudSun,
      group: "main",
      order: 75,
      permission: { definition: weatherPermissions, action: "view" },
    },
  ],
};

export { weatherPermissions };
