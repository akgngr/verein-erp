/** Sürüm notu biçimi: uygulama (system/changelog.json) ve modüller (src/modules/<modül>/releases.json). */
export type ReleaseChange = { type: "feature" | "improvement" | "fix" | "security" | "internal"; tr: string; de: string };
export type ModuleRelease = {
  version: string;
  date: string;
  title: { tr: string; de: string };
  changes: ReleaseChange[];
  /** Bu modül sürümünün yayımlandığı uygulama sürümü (isteğe bağlı). */
  appVersion?: string;
};

export type PublicReleaseChange = ReleaseChange & { type: Exclude<ReleaseChange["type"], "internal"> };
export type PublicModuleRelease = Omit<ModuleRelease, "changes"> & { changes: PublicReleaseChange[] };
/** Visible app/website notes never include internal-only releases. */
export function publicReleaseNotes(releases: readonly ModuleRelease[]): PublicModuleRelease[] {
  return releases.flatMap((release) => {
    const changes = release.changes.filter(
      (change): change is PublicReleaseChange => change.type !== "internal",
    );
    return changes.length ? [{ ...release, changes }] : [];
  });
}
