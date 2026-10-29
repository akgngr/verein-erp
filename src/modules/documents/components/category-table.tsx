"use client";

import { useTranslations } from "next-intl";

import { Button, addToast } from "@heroui/react";
import { Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DataTable } from "@/shared/components/data-table/data-table";
import type { DataTableColumn, DataTableRowAction } from "@/shared/components/data-table/types";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { formatDate } from "@/shared/utils";

import { setCategoryActiveAction } from "../actions/category-actions";
import { CategoryFormModal } from "./category-form-modal";
import type { CategoryListItem } from "../types";

/**
 * Kategori listesi tablosu (8.5): Ad, Durum, Evrak sayısı + satır aksiyonları
 * (Düzenle modalı, Pasife al/Aktifleştir onayı) ve "Yeni kategori" butonu.
 */
export function CategoryTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
  q,
  canUpdate,
}: {
  rows: CategoryListItem[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  q?: string;
  canUpdate: boolean;
}) {
  const tCommon = useTranslations("common");
  const t = useTranslations("documents.categories");
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryListItem | null>(null);
  const [deactivating, setDeactivating] = useState<CategoryListItem | null>(null);

  const toggleActive = async (category: CategoryListItem) => {
    const result = await setCategoryActiveAction({
      id: category.id,
      isActive: !category.isActive,
    });
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    addToast({
      title: category.isActive ? t("deactivatedToast") : t("activatedToast"),
      color: "success",
    });
    router.refresh();
  };

  const columns: DataTableColumn<CategoryListItem>[] = [
    { key: "name", label: "Ad", sortable: true, render: (row) => row.name },
    {
      key: "isActive",
      label: t("status"),
      sortable: true,
      width: 110,
      render: (row) =>
        row.isActive ? (
          <span className="text-small font-medium text-success">{t("active")}</span>
        ) : (
          <span className="text-small font-medium text-default-400">{t("passive")}</span>
        ),
    },
    {
      key: "documentCount",
      label: t("documentCount"),
      align: "center",
      width: 120,
      render: (row) => row.documentCount,
    },
    {
      key: "createdAt",
      label: t("createdAt"),
      sortable: true,
      width: 130,
      render: (row) => formatDate(row.createdAt),
    },
  ];

  const rowActions = (row: CategoryListItem): DataTableRowAction[] =>
    canUpdate
      ? [
          {
            key: "edit",
            label: tCommon("edit"),
            icon: <Pencil className="h-4 w-4" />,
            onPress: () => {
              setEditing(row);
              setFormOpen(true);
            },
          },
          {
            key: "toggle",
            label: row.isActive ? t("deactivate") : t("activate"),
            color: row.isActive ? "danger" : "default",
            onPress: () => setDeactivating(row),
          },
        ]
      : [];

  return (
    <>
      <div className="mb-3 flex justify-end">
        {canUpdate ? (
          <Button
            size="sm"
            color="primary"
            startContent={<Plus className="h-4 w-4" aria-hidden />}
            onPress={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            {t("new")}
          </Button>
        ) : null}
      </div>

      <DataTable<CategoryListItem>
        ariaLabel="Evrak kategorileri"
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        sort={sort}
        dir={dir}
        q={q}
        searchPlaceholder={t("search")}
        rowActions={rowActions}
        emptyMessage={t("empty")}
      />

      <CategoryFormModal
        isOpen={formOpen}
        onOpenChange={setFormOpen}
        category={editing}
      />

      <ConfirmDialog
        isOpen={deactivating !== null}
        onOpenChange={(open) => !open && setDeactivating(null)}
        title={deactivating?.isActive ? t("deactivateTitle") : t("activateTitle")}
        message={
          deactivating?.isActive
            ? t("deactivateNamedMessage", { name: deactivating?.name ?? "" })
            : t("activateMessage", { name: deactivating?.name ?? "" })
        }
        confirmLabel={deactivating?.isActive ? t("deactivate") : t("activate")}
        confirmColor={deactivating?.isActive ? "danger" : "primary"}
        onConfirm={() => deactivating ? toggleActive(deactivating) : Promise.resolve()}
      />
    </>
  );
}
