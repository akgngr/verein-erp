import { GraduationCap } from "lucide-react";

import { StatCardBody } from "@/shared/components/dashboard/card-bodies";
import { getDb } from "@/shared/db";
import { defineCards } from "@/shared/types/dashboard";

import { studentsPermissions } from "../permissions";

export const cards = defineCards([
  {
    key: "overview",
    titleKey: "cards.overview.title",
    descriptionKey: "cards.overview.description",
    icon: GraduationCap,
    size: "sm",
    href: "/ogrenciler",
    permission: { definition: studentsPermissions, action: "view" },
    render: async ({ t }) => {
      const db = getDb();
      const [active, withoutPayer, guardians] = await Promise.all([
        db.student.count({ where: { deletedAt: null, status: "ACTIVE" } }),
        db.student.count({ where: { deletedAt: null, status: "ACTIVE", guardians: { none: { isPayer: true } } } }),
        db.studentGuardian.count({ where: { deletedAt: null } }),
      ]);
      return (
        <StatCardBody
          value={active}
          label={t("cards.overview.active")}
          details={[
            { label: t("cards.overview.guardians"), value: guardians },
            ...(withoutPayer > 0 ? [{ label: t("cards.overview.withoutPayer"), value: withoutPayer, tone: "warning" as const }] : []),
          ]}
        />
      );
    },
  },
]);
