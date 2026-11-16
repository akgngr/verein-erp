"use client";
import { Card } from "@heroui/react";

import { useTranslations } from "next-intl";

import { ChangePasswordForm } from "../components/change-password-form";
import type { SessionUser } from "../types";
import type { ProfileData } from "../schemas/profile";
import type { ActionResult } from "@/shared/types/action";
import { ProfileForm } from "./profile-form";
import { RoleChip } from "@/shared/components/roles/roles-provider";

/**
 * Profil sayfasının HeroUI kullanan bölümü client bileşendir;
 * sunucu tarafı ProfileView requireUser ile veriyi çekip buraya aktarır.
 */
export function ProfileContent({
  user,
  profile,
  saveProfileAction,
}: {
  user: SessionUser;
  profile: ProfileData;
  saveProfileAction: (input: unknown) => Promise<ActionResult>;
}) {
  const t = useTranslations("auth.profile");
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className={"shadow-sm border border-ink-200/80"}>
        <Card.Header className={["pb-0"].filter(Boolean).join(" ")}>
          <h2 className="text-base font-medium">{t("accountInfo")}</h2>
        </Card.Header>
        <Card.Content className={["gap-3 text-sm"].filter(Boolean).join(" ")}>
          <div className="flex items-center justify-between gap-4">
            <span className="text-ink-500">{t("name")}</span>
            <span className="font-medium">{user.name}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-ink-500">{t("email")}</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-ink-500">{t("role")}</span>
            <RoleChip role={user.role} />
          </div>
        </Card.Content>
      </Card>

      <Card className={"shadow-sm border border-ink-200/80"}>
        <Card.Header className={["pb-0"].filter(Boolean).join(" ")}>
          <h2 className="text-base font-medium">{t("changePassword")}</h2>
        </Card.Header>
        <Card.Content>
          <ChangePasswordForm />
        </Card.Content>
      </Card>

      <Card
        className={["lg:col-span-2", "shadow-sm border border-ink-200/80"]
          .filter(Boolean)
          .join(" ")}
      >
        <Card.Header
          className={["flex-col items-start gap-1 pb-0"]
            .filter(Boolean)
            .join(" ")}
        >
          <h2 className="text-base font-medium">{t("details")}</h2>
          <p className="text-sm text-ink-500">{t("detailsHint")}</p>
        </Card.Header>
        <Card.Content>
          <ProfileForm profile={profile} saveAction={saveProfileAction} />
        </Card.Content>
      </Card>
    </div>
  );
}
