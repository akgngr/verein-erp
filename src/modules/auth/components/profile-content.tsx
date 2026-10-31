"use client";

import { useTranslations } from "next-intl";

import { Card, CardBody, CardHeader } from "@heroui/react";

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
      <Card shadow="sm">
        <CardHeader className="pb-0">
          <h2 className="text-medium font-medium">{t("accountInfo")}</h2>
        </CardHeader>
        <CardBody className="gap-3 text-small">
          <div className="flex items-center justify-between gap-4">
            <span className="text-default-500">{t("name")}</span>
            <span className="font-medium">{user.name}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-default-500">{t("email")}</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-default-500">{t("role")}</span>
            <RoleChip role={user.role} />
          </div>
        </CardBody>
      </Card>

      <Card shadow="sm">
        <CardHeader className="pb-0">
          <h2 className="text-medium font-medium">{t("changePassword")}</h2>
        </CardHeader>
        <CardBody>
          <ChangePasswordForm />
        </CardBody>
      </Card>

      <Card shadow="sm" className="lg:col-span-2">
        <CardHeader className="flex-col items-start gap-1 pb-0">
          <h2 className="text-medium font-medium">{t("details")}</h2>
          <p className="text-small text-default-500">{t("detailsHint")}</p>
        </CardHeader>
        <CardBody>
          <ProfileForm profile={profile} saveAction={saveProfileAction} />
        </CardBody>
      </Card>
    </div>
  );
}
