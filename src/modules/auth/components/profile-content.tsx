"use client";

import { useTranslations } from "next-intl";

import { Card, CardBody, CardHeader, Chip } from "@heroui/react";

import { ChangePasswordForm } from "../components/change-password-form";
import type { SessionUser } from "../types";
import { ROLE_COLORS } from "@/shared/roles";

/**
 * Profil sayfasının HeroUI kullanan bölümü client bileşendir;
 * sunucu tarafı ProfileView requireUser ile veriyi çekip buraya aktarır.
 */
export function ProfileContent({ user }: { user: SessionUser }) {
  const tRoles = useTranslations("roles");
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card shadow="sm">
        <CardHeader className="pb-0">
          <h2 className="text-medium font-medium">Hesap Bilgileri</h2>
        </CardHeader>
        <CardBody className="gap-3 text-small">
          <div className="flex items-center justify-between gap-4">
            <span className="text-default-500">Ad Soyad</span>
            <span className="font-medium">{user.name}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-default-500">E-posta</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-default-500">Rol</span>
            <Chip color={ROLE_COLORS[user.role]} size="sm" variant="flat">
              {tRoles(user.role)}
            </Chip>
          </div>
        </CardBody>
      </Card>

      <Card shadow="sm">
        <CardHeader className="pb-0">
          <h2 className="text-medium font-medium">Parola Değiştir</h2>
        </CardHeader>
        <CardBody>
          <ChangePasswordForm />
        </CardBody>
      </Card>
    </div>
  );
}
