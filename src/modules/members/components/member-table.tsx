"use client";

import { Link, addToast } from "@heroui/react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { DataTable } from "@/shared/components/data-table/data-table";
import type {
  DataTableColumn,
  DataTableFilter,
  DataTableRowAction,
} from "@/shared/components/data-table/types";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { formatDate } from "@/shared/utils";

import type { MemberStatus, MembershipType } from "@prisma/client";

import { deleteMemberAction } from "../actions/delete-member";
import { StatusBadge } from "./status-badge";
import { TypeBadge } from "./type-badge";

/**
 * Üye listesi tablosu. DataTable paylaşılan client bileşeni olduğundan satır
 * aksiyonları (sil onayı) bu sarmalayıcıda yaşar — documents kalıbıyla aynı.
 */
export function MemberTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
  q,
  filters,
  toolbarExtra,
  searchPlaceholder,
  ariaLabel,
  emptyMessage,
  canUpdate,
  canDelete,
}: {
  rows: MemberRow[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  q?: string;
  filters?: DataTableFilter[];
  toolbarExtra?: React.ReactNode;
  /** RSC'den t() ile üretilen etiketler (i18n). */
  searchPlaceholder?: string;
  ariaLabel?: string;
  emptyMessage?: string;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("members");
  const [deleting, setDeleting] = useState<MemberRow | null>(null);

  const confirmDelete = async () => {
    if (!deleting) return;
    const result = await deleteMemberAction({ id: deleting.id });
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    addToast({ title: t("deleteConfirm.successToast", { membershipNumber: deleting.membershipNumber }), color: "success" });
    setDeleting(null);
    router.refresh();
  };

  const columns: DataTableColumn<MemberRow>[] = [
    {
      key: "membershipNumber",
      label: t("list.membershipNumber"),
      sortable: true,
      width: 140,
      render: (row) => (
        <Link href={`/uyeler/${row.id}`} size="sm" className="font-medium">
          {row.membershipNumber}
        </Link>
      ),
    },
    {
      key: "lastName",
      label: t("list.fullName"),
      sortable: true,
      width: 220,
      render: (row) => (
        <Link href={`/uyeler/${row.id}`} size="sm" className="text-foreground">
          {row.lastName}, {row.firstName}
        </Link>
      ),
    },
    {
      key: "type",
      label: t("list.type"),
      sortable: true,
      width: 110,
      render: (row) => <TypeBadge type={row.type} />,
    },
    {
      key: "status",
      label: t("list.status"),
      sortable: true,
      width: 110,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "joinDate",
      label: t("list.joinDate"),
      sortable: true,
      width: 120,
      render: (row) => formatDate(row.joinDate),
    },
    {
      key: "email",
      label: t("list.email"),
      width: 200,
      render: (row) => row.email ?? "-",
    },
    {
      key: "phone",
      label: t("list.phone"),
      width: 150,
      render: (row) => row.phone ?? "-",
    },
  ];

  const rowActions = (row: MemberRow): DataTableRowAction[] => [
    { key: "view", label: t("actions.view"), icon: <Eye className="h-4 w-4" />, href: `/uyeler/${row.id}` },
    ...(canUpdate
      ? [
          {
            key: "edit",
            label: t("actions.edit"),
            icon: <Pencil className="h-4 w-4" />,
            href: `/uyeler/${row.id}/duzenle`,
          },
        ]
      : []),
    ...(canDelete
      ? [
          {
            key: "delete",
            label: t("actions.delete"),
            icon: <Trash2 className="h-4 w-4" />,
            color: "danger" as const,
            onPress: () => setDeleting(row),
          },
        ]
      : []),
  ];

  return (
    <>
      <DataTable<MemberRow>
        ariaLabel={ariaLabel ?? t("list.aria")}
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        sort={sort}
        dir={dir}
        q={q}
        filters={filters}
        toolbarExtra={toolbarExtra}
        searchPlaceholder={searchPlaceholder ?? t("list.searchPlaceholder")}
        rowActions={rowActions}
        emptyMessage={emptyMessage ?? t("list.empty")}
      />

      <ConfirmDialog
        isOpen={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteConfirm.title")}
        message={t("deleteConfirm.message", { membershipNumber: deleting?.membershipNumber ?? "" })}
        confirmLabel={t("deleteConfirm.confirm")}
        confirmColor="danger"
        onConfirm={confirmDelete}
      />
    </>
  );
}

export type MemberRow = {
  id: string;
  membershipNumber: string;
  type: MembershipType;
  status: MemberStatus;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  joinDate: Date;
  exitDate: Date | null;
};
