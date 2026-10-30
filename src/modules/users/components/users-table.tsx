"use client";

import { useFormDrawerHref } from "@/shared/components/forms/form-drawer";
import { useTranslations } from "next-intl";

import { addToast, Chip } from "@heroui/react";
import { KeyRound, Pencil, Power, RefreshCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DataTable } from "@/shared/components/data-table/data-table";
import type { DataTableColumn } from "@/shared/components/data-table/types";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { ROLE_COLORS } from "@/shared/roles";
import { formatDateTime } from "@/shared/utils";

import { ResetPasswordDialog } from "./reset-password-dialog";
import { deleteUserAction } from "../actions/delete-user";
import { setUserActiveAction } from "../actions/set-active";
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
  canDelete,
}: {
  rows: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  q?: string;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const tRoles = useTranslations("roles");
  const t = useTranslations("users.table");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const drawerHref = useFormDrawerHref();
  const [activeTarget, setActiveTarget] = useState<{ user: UserRow; isActive: boolean } | null>(
    null,
  );
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);

  const columns: DataTableColumn<UserRow>[] = [
    { key: "name", label: t("name"), sortable: true },
    { key: "email", label: t("email"), sortable: true },
    {
      key: "role",
      label: t("role"),
      sortable: true,
      render: (row) => (
        <Chip color={ROLE_COLORS[row.role]} size="sm" variant="flat">
          {tRoles(row.role)}
        </Chip>
      ),
    },
    {
      key: "isActive",
      label: t("status"),
      sortable: true,
      render: (row) => (
        <Chip color={row.isActive ? "success" : "default"} size="sm" variant="flat">
          {row.isActive ? tCommon("active") : tCommon("passive")}
        </Chip>
      ),
    },
    {
      key: "lastLoginAt",
      label: t("lastLogin"),
      sortable: true,
      render: (row) => formatDateTime(row.lastLoginAt),
    },
    {
      key: "createdAt",
      label: t("createdAt"),
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
      title: isActive ? t("activated") : t("deactivated"),
      color: "success",
    });
    router.refresh();
  };

  const handleDelete = async (user: UserRow) => {
    const result = await deleteUserAction({ id: user.id });
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    addToast({ title: t("deleted"), color: "success" });
    router.refresh();
  };

  return (
    <>
      <DataTable<UserRow>
        ariaLabel={t("aria")}
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        sort={sort}
        dir={dir}
        q={q}
        searchPlaceholder={t("search")}
        filters={[
          { key: "role", label: t("role"), options: ROLES.map((role) => ({ value: role as string, label: tRoles(role) })) },
          {
            key: "status",
            label: t("status"),
            options: [
              { value: "active", label: tCommon("active") },
              { value: "passive", label: tCommon("passive") },
            ],
          },
        ]}
        emptyMessage={t("empty")}
        rowActions={(row) => [
          {
            key: "edit",
            label: t("edit"),
            icon: <Pencil className="h-4 w-4" />,
            href: drawerHref("duzenle", row.id),
            hidden: !canUpdate,
          },
          {
            key: "reset-password",
            label: t("resetPassword"),
            icon: <KeyRound className="h-4 w-4" />,
            onPress: () => setResetTarget(row),
            hidden: !canUpdate,
          },
          {
            key: "toggle-active",
            label: row.isActive ? t("deactivate") : t("activate"),
            icon: row.isActive ? <Power className="h-4 w-4" /> : <RefreshCcw className="h-4 w-4" />,
            color: row.isActive ? "danger" : "default",
            onPress: () => setActiveTarget({ user: row, isActive: !row.isActive }),
            hidden: !canUpdate,
          },
          {
            key: "delete",
            label: t("delete"),
            icon: <Trash2 className="h-4 w-4" />,
            color: "danger",
            onPress: () => setDeleteTarget(row),
            hidden: !canDelete,
          },
        ]}
      />

      <ConfirmDialog
        isOpen={activeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setActiveTarget(null);
        }}
        title={activeTarget?.isActive ? t("activateTitle") : t("deactivateTitle")}
        message={
          activeTarget
            ? t(activeTarget.isActive ? "activateConfirm" : "deactivateConfirm", {
                name: activeTarget.user.name,
              })
            : ""
        }
        confirmLabel={activeTarget?.isActive ? t("activate") : t("deactivate")}
        confirmColor={activeTarget?.isActive ? "primary" : "danger"}
        onConfirm={async () => {
          if (activeTarget) await handleSetActive(activeTarget.user, activeTarget.isActive);
        }}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t("deleteTitle")}
        message={deleteTarget ? t("deleteConfirm", { name: deleteTarget.name }) : ""}
        confirmLabel={t("delete")}
        confirmColor="danger"
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget);
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
