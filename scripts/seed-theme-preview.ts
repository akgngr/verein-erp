/** Synthetic browser fixtures for the disposable GitHub Actions database only. */
import { createPrismaClient } from "../src/shared/db-client";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (
    process.env.CI !== "true" ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.pathname !== "/verein_ci"
  ) {
    throw new Error("THEME_FIXTURES_REQUIRE_ISOLATED_CI_DATABASE");
  }
  const db = createPrismaClient();
  try {
    const user = await db.user.findUniqueOrThrow({
      where: { email: "ci-admin@example.test" },
      select: { id: true },
    });
    for (let i = 1; i <= 12; i++) {
      const id = `theme-preview-member-${String(i).padStart(2, "0")}`;
      const data = {
        year: 2026,
        sequence: 900000 + i,
        membershipNumber: `PREVIEW-${String(i).padStart(4, "0")}`,
        firstName: "Demo",
        lastName: `Mitglied${String(i).padStart(2, "0")}`,
        email: `mitglied${i}@example.test`,
        joinDate: new Date("2026-03-01T00:00:00Z"),
        createdById: user.id,
        createdByLabel: "CI preview",
        status: i === 12 ? ("PASSIVE" as const) : ("ACTIVE" as const),
        type: i % 4 === 0 ? ("DESTEKCI" as const) : ("ASIL" as const),
      };
      await db.member.upsert({
        where: { id },
        create: { id, ...data },
        update: data,
      });
    }
    console.info("[theme] 12 synthetic member fixtures prepared.");
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "THEME_FIXTURES_FAILED",
  );
  process.exit(1);
});
