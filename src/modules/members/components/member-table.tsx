"use client";
import { toast, Link } from "@heroui/react";

import { Eye, Pencil, Trash2, UserCheck, UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { useFormDrawerHref } from "@/shared/components/forms/form-drawer";
import { DataTable } from "@/shared/components/data-table/data-table";
import type {
  DataTableColumn,
  DataTableFilter,
  DataTableRowAction,
} from "@/shared/components/data-table/types";
import type { DataTableSelection } from "@/shared/data-table/selection-contract";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { formatDate } from "@/shared/utils";

import type { MemberStatus, MembershipType } from "@prisma/client";

import { deleteMemberAction } from "../actions/delete-member";
import { bulkChangeMemberStatusAction } from "../actions/bulk-change-status";
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
  topRightExtra,
  dateFilter,
  filterExtra,
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
  topRightExtra?: React.ReactNode;
  dateFilter?: React.ReactNode;
  filterExtra?: React.ReactNode;
  toolbarExtra?: React.ReactNode;
  /** RSC'den t() ile üretilen etiketler (i18n). */
  searchPlaceholder?: string;
  ariaLabel?: string;
  emptyMessage?: string;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const drawerHref = useFormDrawerHref();
  const t = useTranslations("members");
  const [deleting, setDeleting] = useState<MemberRow | null>(null);
  const [selection, setSelection] = useState<DataTableSelection>({
    type: "explicit",
    ids: [],
  });
  const [bulkPending, setBulkPending] = useState(false);

  const confirmDelete = async () => {
    if (!deleting) return;
    const result = await deleteMemberAction({ id: deleting.id });
    if (!result.ok) {
      toast(result.error, { variant: "danger" });
      return;
    }
    toast(
      t("deleteConfirm.successToast", {
        membershipNumber: deleting.membershipNumber,
      }),
      { variant: "success" },
    );
    setDeleting(null);
    router.refresh();
  };

  const runBulkStatus = async (
    currentSelection: DataTableSelection,
    status: "ACTIVE" | "PASSIVE",
  ) => {
    setBulkPending(true);
    try {
      const result = await bulkChangeMemberStatusAction({
        selection: currentSelection,
        status,
      });
      if (!result.ok) {
        toast(result.error, { variant: "danger" });
        return;
      }

      toast(
        t("bulk.success", {
          updated: result.data.updated,
          skipped: result.data.skipped,
        }),
        { variant: "success" },
      );
      setSelection({ type: "explicit", ids: [] });
      router.refresh();
    } finally {
      setBulkPending(false);
    }
  };

  const columns: DataTableColumn<MemberRow>[] = [
    {
      key: "membershipNumber",
      label: t("list.membershipNumber"),
      sortable: true,
      width: 140,
      render: (row) => (
        <Link
          href={`/uyeler/${row.id}`}
          className={["font-medium", "text-sm"].filter(Boolean).join(" ")}
        >
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
        <Link
          href={`/uyeler/${row.id}`}
          className={["text-foreground", "text-sm"].filter(Boolean).join(" ")}
        >
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
    {
      key: "view",
      label: t("actions.view"),
      icon: <Eye className="h-4 w-4" />,
      href: `/uyeler/${row.id}`,
    },
    ...(canUpdate
      ? [
          {
            key: "edit",
            label: t("actions.edit"),
            icon: <Pencil className="h-4 w-4" />,
            href: drawerHref("duzenle", row.id),
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
        topRightExtra={topRightExtra}
        dateFilter={dateFilter}
        filterExtra={filterExtra}
        toolbarExtra={toolbarExtra}
        searchPlaceholder={searchPlaceholder ?? t("list.searchPlaceholder")}
        rowActions={rowActions}
        selection={
          canUpdate
            ? {
                mode: "multiple",
                value: selection,
                onChange: setSelection,
                allowQuerySelection: true,
                bulkActions: [
                  {
                    key: "activate",
                    label: t("bulk.activate"),
                    icon: <UserCheck className="h-4 w-4" />,
                    disabled: bulkPending,
                    onPress: (currentSelection) =>
                      runBulkStatus(currentSelection, "ACTIVE"),
                  },
                  {
                    key: "passivate",
                    label: t("bulk.passivate"),
                    icon: <UserMinus className="h-4 w-4" />,
                    disabled: bulkPending,
                    onPress: (currentSelection) =>
                      runBulkStatus(currentSelection, "PASSIVE"),
                  },
                ],
              }
            : undefined
        }
        emptyMessage={emptyMessage ?? t("list.empty")}
      />

      <ConfirmDialog
        isOpen={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteConfirm.title")}
        message={t("deleteConfirm.message", {
          membershipNumber: deleting?.membershipNumber ?? "",
        })}
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
