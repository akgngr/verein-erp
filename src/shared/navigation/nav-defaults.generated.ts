// Bu dosya scripts/sync-schemas.ts (syncModuleNavDefaults) tarafından otomatik üretilir.
// Her modül kendi src/modules/<modül>/nav.json dosyasında varsayılan kategori ve alt modül bilgisini tutar.

import type { NavCategoryId } from "../types/module";

export type ModuleNavDefault = {
  categoryGroup: NavCategoryId;
  parentModule?: string;
  order?: number;
};

export const MODULE_NAV_DEFAULTS: Record<string, ModuleNavDefault> = {
  "accounting": {
    "categoryGroup": "finance",
    "order": 10
  },
  "automation": {
    "categoryGroup": "operations",
    "order": 30
  },
  "calendar": {
    "categoryGroup": "operations",
    "order": 10
  },
  "compliance": {
    "categoryGroup": "operations",
    "order": 40
  },
  "courses": {
    "categoryGroup": "education",
    "parentModule": "students",
    "order": 20
  },
  "crm": {
    "categoryGroup": "communication",
    "order": 20
  },
  "documents": {
    "categoryGroup": "association",
    "order": 40
  },
  "donations": {
    "categoryGroup": "finance",
    "parentModule": "accounting",
    "order": 20
  },
  "events": {
    "categoryGroup": "association",
    "order": 20
  },
  "exports": {
    "categoryGroup": "finance",
    "order": 40
  },
  "feedback": {
    "categoryGroup": "communication",
    "order": 30
  },
  "finance": {
    "categoryGroup": "finance",
    "parentModule": "accounting",
    "order": 30
  },
  "inventory": {
    "categoryGroup": "association",
    "order": 50
  },
  "mailings": {
    "categoryGroup": "communication",
    "order": 10
  },
  "meetings": {
    "categoryGroup": "association",
    "order": 30
  },
  "members": {
    "categoryGroup": "association",
    "order": 10
  },
  "online-forms": {
    "categoryGroup": "association",
    "order": 70
  },
  "progress": {
    "categoryGroup": "education",
    "parentModule": "students",
    "order": 30
  },
  "secretary": {
    "categoryGroup": "operations",
    "order": 20
  },
  "students": {
    "categoryGroup": "education",
    "order": 10
  },
  "tasks": {
    "categoryGroup": "association",
    "order": 60
  },
  "weather": {
    "categoryGroup": "operations",
    "order": 50
  },
  "youth-protection": {
    "categoryGroup": "education",
    "parentModule": "students",
    "order": 40
  }
};
