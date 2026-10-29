"use client";

import { useTranslations } from "next-intl";

import { addToast, Chip } from "@heroui/react";
import { KeyRound, Pencil, Power, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DataTable } from "@/shared/components/data-table/data-table";
import type { DataTableColumn } from "@/shared/components/data-table/types";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { ROLE_COLORS } from "@/shared/roles";
import { formatDateTime } from "@/shared/utils";

import { ResetPasswordDialog } from "./reset-password-dialog";
import { setUserActiveAction } from "../actions/set-active";
import { USER_STATUS_OPTIONS } from "../constants";
import type { UserRow } from "../queries/list-users";
import { ROLES } from "@/shared/roles";

/**
 * Kullanıcı listesi: ortak DataTable üzerinde modüle özel kolonlar,
 * filtreler ve satır aksiyonları (11.1).
 */
export function UsersTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
  q,
  canUpdate,
}: {
  rows: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  q?: string;
  canUpdate: boolean;
}) {
  const tRoles = useTranslations("roles");
  const router = useRouter();
  const [activeTarget, setActiveTarget] = useState<{ user: UserRow; isActive: boolean } | null>(
    null,
  );
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);

  const columns: DataTableColumn<UserRow>[] = [
    { key: "name", label: "Ad", sortable: true },
    { key: "email", label: "E-posta", sortable: true },
    {
      key: "role",
      label: "Rol",
      sortable: true,
      render: (row) => (
        <Chip color={ROLE_COLORS[row.role]} size="sm" variant="flat">
          {tRoles(row.role)}
        </Chip>
      ),
    },
    {
      key: "isActive",
      label: "Durum",
      sortable: true,
      render: (row) => (
        <Chip color={row.isActive ? "success" : "default"} size="sm" variant="flat">
          {row.isActive ? "Aktif" : "Pasif"}
        </Chip>
      ),
    },
    {
      key: "lastLoginAt",
      label: "Son giriş",
      sortable: true,
      render: (row) => formatDateTime(row.lastLoginAt),
    },
    {
      key: "createdAt",
      label: "Oluşturulma",
      sortable: true,
      render: (row) => formatDateTime(row.createdAt),
    },
  ];

  const handleSetActive = async (user: UserRow, isActive: boolean) => {
    const result = await setUserActiveAction({ id: user.id, isActive });
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    addToast({
      title: isActive ? "Kullanıcı aktifleştirildi." : "Kullanıcı pasife alındı.",
      color: "success",
    });
    router.refresh();
  };

  return (
    <>
      <DataTable<UserRow>
        ariaLabel="Kullanıcı listesi"
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        sort={sort}
        dir={dir}
        q={q}
        searchPlaceholder="Ad veya e-posta ara..."
        filters={[
          { key: "role", label: "Rol", options: ROLES.map((role) => ({ value: role as string, label: tRoles(role) })) },
          { key: "status", label: "Durum", options: [...USER_STATUS_OPTIONS] },
        ]}
        emptyMessage="Kullanıcı bulunamadı."
        rowActions={(row) => [
          {
            key: "edit",
            label: "Düzenle",
            icon: <Pencil className="h-4 w-4" />,
            href: `/ayarlar/kullanicilar/${row.id}`,
            hidden: !canUpdate,
          },
          {
            key: "reset-password",
            label: "Parola sıfırla",
            icon: <KeyRound className="h-4 w-4" />,
            onPress: () => setResetTarget(row),
            hidden: !canUpdate,
          },
          {
            key: "toggle-active",
            label: row.isActive ? "Pasife al" : "Aktifleştir",
            icon: row.isActive ? <Power className="h-4 w-4" /> : <RefreshCcw className="h-4 w-4" />,
            color: row.isActive ? "danger" : "default",
            onPress: () => setActiveTarget({ user: row, isActive: !row.isActive }),
            hidden: !canUpdate,
          },
        ]}
      />

      <ConfirmDialog
        isOpen={activeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setActiveTarget(null);
        }}
        title={activeTarget?.isActive ? "Kullanıcıyı aktifleştir" : "Kullanıcıyı pasife al"}
        message={
          activeTarget
            ? `"${activeTarget.user.name}" kullanıcısı ${
                activeTarget.isActive
                  ? "aktifleştirilecek. Onaylıyor musunuz?"
                  : "pasife alınacak; mevcut oturumuyla bile işlem yapamayacak. Onaylıyor musunuz?"
              }`
            : ""
        }
        confirmLabel={activeTarget?.isActive ? "Aktifleştir" : "Pasife al"}
        confirmColor={activeTarget?.isActive ? "primary" : "danger"}
        onConfirm={async () => {
          if (activeTarget) await handleSetActive(activeTarget.user, activeTarget.isActive);
        }}
      />

      {resetTarget ? (
        <ResetPasswordDialog
          userId={resetTarget.id}
          isOpen
          onOpenChange={(open) => {
            if (!open) setResetTarget(null);
          }}
        />
      ) : null}
    </>
  );
}
