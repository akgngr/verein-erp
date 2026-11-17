"use client";

import { useTranslations } from "next-intl";

import { RoleChip } from "@/shared/components/roles/roles-provider";
import { SurfaceCard } from "@/shared/components/ui/surface-card";
import type { ActionResult } from "@/shared/types/action";
import { ChangePasswordForm } from "../components/change-password-form";
import type { ProfileData } from "../schemas/profile";
import type { SessionUser } from "../types";
import { ProfileForm } from "./profile-form";

/** Profil sayfası ortak SurfaceCard sözleşmesini kullanır. */
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
      <SurfaceCard
        header={<h2 className="text-base font-medium">{t("accountInfo")}</h2>}
        contentClassName="gap-3 text-sm"
      >
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
      </SurfaceCard>

      <SurfaceCard
        header={<h2 className="text-base font-medium">{t("changePassword")}</h2>}
      >
        <ChangePasswordForm />
      </SurfaceCard>

      <SurfaceCard
        className="lg:col-span-2"
        header={
          <div className="flex flex-col items-start gap-1">
            <h2 className="text-base font-medium">{t("details")}</h2>
            <p className="text-sm text-ink-500">{t("detailsHint")}</p>
          </div>
        }
      >
        <ProfileForm profile={profile} saveAction={saveProfileAction} />
      </SurfaceCard>
    </div>
  );
}
