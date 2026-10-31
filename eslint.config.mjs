import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// Modül iç dosyalarına doğrudan erişim yasaktır. Yalnızca public giriş noktaları serbesttir:
//   @/modules/<modül>          → index.ts (izomorfik)
//   @/modules/<modül>/server   → sunucu girişi
//   @/modules/<modül>/ui       → UI girişi
//   @/modules/<modül>/page     → Dashboard sayfa girişi (otomatik senkronize)
//   @/modules/<modül>/edge     → yalnızca auth modülü (middleware)
//   @/modules/<modül>/cards    → panel kartları (yalnızca üretilen src/dashboard-cards.ts)
// KARAR: Desen; "@ /modules/x/queries/y" gibi derin içe aktarmaları da kapsasın diye
// "@ /modules/*/**" ile genişletildi. İstisnalar yalnızca tam public giriş yollarıdır.
const MODULE_INTERNAL_IMPORTS = {
  group: [
    "@/modules/*/*",
    "@/modules/*/**",
    "!@/modules/*/server",
    "!@/modules/*/ui",
    "!@/modules/*/page",
    "!@/modules/*/edge",
    "!@/modules/*/cards",
    "!@/modules/*/ai",
    "!@/modules/*/routes",
    "!@/modules/*/routes/**",
    "!@/modules/*/api",
    "!@/modules/*/api/**",
  ],
  message:
    "Modül iç dosyalarına doğrudan erişim yasaktır. Public girişler: @/modules/<modül>, @/modules/<modül>/server, @/modules/<modül>/ui, @/modules/<modül>/page",
};

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // Her yerde: modül iç dosyalarına erişim yasağı (3.4)
    rules: {
      "no-restricted-imports": ["error", { patterns: [MODULE_INTERNAL_IMPORTS] }],
    },
  },
  {
    // shared katmanı: hiçbir modülü ve src/app'i import edemez (3.1)
    files: ["src/shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            MODULE_INTERNAL_IMPORTS,
            { group: ["@/modules", "@/modules/**"], message: "shared katmanı modülleri import edemez." },
            { group: ["@/app", "@/app/**"], message: "shared katmanı src/app'i import edemez." },
          ],
        },
      ],
    },
  },
  {
    // modüller: src/app'i import edemez (3.1)
    files: ["src/modules/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            MODULE_INTERNAL_IMPORTS,
            { group: ["@/app", "@/app/**"], message: "Modüller src/app katmanını import edemez." },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      ".zscripts/**",
      "skills/**",
      "download/**",
      "upload/**",
    ],
  },
];

export default eslintConfig;
