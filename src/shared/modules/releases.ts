/** Sürüm notu biçimi: uygulama (system/changelog.json) ve modüller (src/modules/<modül>/releases.json). */
export type ReleaseChange = { type: "feature" | "improvement" | "fix" | "security"; tr: string; de: string };
export type ModuleRelease = {
  version: string;
  date: string;
  title: { tr: string; de: string };
  changes: ReleaseChange[];
  /** Bu modül sürümünün yayımlandığı uygulama sürümü (isteğe bağlı). */
  appVersion?: string;
};
