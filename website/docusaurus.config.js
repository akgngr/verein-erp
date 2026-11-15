// @ts-check
import { themes as prismThemes } from "prism-react-renderer";

/** Verein ERP dokümantasyonu. Yayın: GitHub Pages (.github/workflows/docs.yml). */
/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "Verein ERP",
  tagline: "Dernekler ve küçük işletmeler için modüler yönetim sistemi",
  favicon: "img/favicon.svg",
  url: "https://akgngr.github.io",
  baseUrl: "/verein-erp/",
  organizationName: "akgngr",
  projectName: "verein-erp",
  trailingSlash: false,
  onBrokenLinks: "throw",
  markdown: {
    // .md dosyaları CommonMark (MDX değil) olarak okunur: depodaki teknik belgeler olduğu gibi kullanılabilir.
    format: "detect",
    hooks: { onBrokenMarkdownLinks: "warn" },
  },
  i18n: { defaultLocale: "tr", locales: ["tr"] },
  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: "/",
          sidebarPath: "./sidebars.js",
          editUrl: "https://github.com/akgngr/verein-erp/edit/main/website/",
          showLastUpdateTime: false,
        },
        blog: false,
        theme: { customCss: "./src/css/custom.css" },
      }),
    ],
  ],
  plugins: [
    [
      "@docusaurus/plugin-content-docs",
      {
        // Depodaki teknik belgeler (docs/): tek kaynak; kopyalanmaz.
        id: "teknik",
        path: "../docs",
        routeBasePath: "teknik",
        sidebarPath: "./sidebars-teknik.js",
        exclude: ["**/TODO_*.md", "reviews/**"],
        editUrl: "https://github.com/akgngr/verein-erp/edit/main/docs/",
      },
    ],
  ],
  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: { respectPrefersColorScheme: true },
      navbar: {
        title: "Verein ERP",
        logo: { alt: "Verein ERP", src: "img/logo.svg" },
        items: [
          { type: "docSidebar", sidebarId: "kullanim", position: "left", label: "Kullanım" },
          { type: "docSidebar", sidebarId: "yonetim", position: "left", label: "Yönetim" },
          { type: "docSidebar", sidebarId: "gelistirici", position: "left", label: "Geliştirici" },
          { type: "docSidebar", sidebarId: "teknik", docsPluginId: "teknik", position: "left", label: "Teknik belgeler" },
          { href: "https://github.com/akgngr/verein-erp", label: "GitHub", position: "right" },
        ],
      },
      footer: {
        style: "dark",
        links: [
          { title: "Belgeler", items: [{ label: "Giriş", to: "/" }, { label: "Modüller", to: "/kullanim/moduller" }, { label: "Kurulum", to: "/yonetim/kurulum" }] },
          { title: "Geliştirici", items: [{ label: "Mimari", to: "/gelistirici/mimari" }, { label: "Modül geliştirme", to: "/gelistirici/modul-gelistirme" }] },
          { title: "Kaynak", items: [{ label: "GitHub", href: "https://github.com/akgngr/verein-erp" }] },
        ],
        copyright: `Verein ERP · Docusaurus ile oluşturuldu`,
      },
      prism: { theme: prismThemes.github, darkTheme: prismThemes.dracula, additionalLanguages: ["bash", "json"] },
      docs: { sidebar: { hideable: true } },
    }),
};

export default config;
