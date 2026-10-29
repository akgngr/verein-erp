"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import { DataTable, type DataTableProps } from "@/shared/components/data-table";
import { deleteInventoryAction, updateInventoryStatusAction } from "../actions/inventory-actions";
import {
  INVENTORY_CATEGORIES,
  INVENTORY_CATEGORY_LABEL_KEYS,
  INVENTORY_STATUS_LABEL_KEYS,
  INVENTORY_STATUSES,
} from "../constants";
import {
  formatCurrency,
  formatIsoDate,
  getStatusBadgeClass,
  isInventoryStatus,
} from "../helpers/inventory-helpers";
import type {
  InventoryAbilities,
  InventoryFilters,
  InventoryItemRow,
  InventoryListResult,
} from "../types";
import { InventoryFormModal } from "./inventory-form-modal";

type InventoryTableProps = DataTableProps<InventoryItemRow>;

interface InventoryTableComponentProps {
  result: InventoryListResult;
  filters: InventoryFilters;
  abilities: InventoryAbilities;
  locale: string;
}

export function InventoryTable({
  result,
  filters,
  abilities,
  locale,
}: InventoryTableComponentProps) {
  const t = useTranslations("inventory");
  const [editingItem, setEditingItem] = useState<InventoryItemRow | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryItemRow | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isStatusPending, startStatusTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();

  const columns = useMemo<InventoryTableProps["columns"]>(() => {
    const handleStatusChange = (id: string, value: string) => {
      if (!isInventoryStatus(value)) return;
      setActionError(null);
      startStatusTransition(async () => {
        const response = await updateInventoryStatusAction({ id, status: value });
        if (!response.ok) setActionError(t(`errors.${response.error}`));
      });
    };

    return [
      {
        key: "name",
        label: t("fields.name"),
        sortable: true,
        render: (row) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.name}</span>
            {row.serialNumber ? (
              <span className="text-tiny text-default-500">
                {t("table.serialPrefix")} {row.serialNumber}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        key: "category",
        label: t("fields.category"),
        sortable: true,
        render: (row) => t(INVENTORY_CATEGORY_LABEL_KEYS[row.category]),
      },
      {
        key: "location",
        label: t("fields.location"),
        render: (row) => row.location ?? "—",
      },
      {
        key: "quantity",
        label: t("fields.quantity"),
        sortable: true,
        align: "end",
        render: (row) => <span className="tabular-nums">{row.quantity}</span>,
      },
      {
        key: "status",
        label: t("fields.status"),
        sortable: true,
        render: (row) =>
          abilities.canUpdate ? (
            <div className="relative inline-block w-full min-w-32">
              <select
                aria-label={t("fields.status")}
                value={row.status}
                disabled={isStatusPending}
                onChange={(event) => handleStatusChange(row.id, event.target.value)}
                className="h-8 w-full appearance-none rounded-medium bg-default-100 px-2.5 pr-8 text-xs font-medium text-foreground transition-colors hover:bg-default-200 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer border border-transparent focus:border-primary/50 disabled:cursor-wait disabled:opacity-60"
              >
                {INVENTORY_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {t(INVENTORY_STATUS_LABEL_KEYS[status])}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-default-400"
                aria-hidden="true"
              />
            </div>
          ) : (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(row.status)}`}
            >
              {t(INVENTORY_STATUS_LABEL_KEYS[row.status])}
            </span>
          ),
      },
      {
        key: "purchaseDate",
        label: t("fields.purchaseDate"),
        sortable: true,
        render: (row) => formatIsoDate(row.purchaseDate, locale),
      },
      {
        key: "purchasePrice",
        label: t("fields.purchasePrice"),
        sortable: true,
        align: "end",
        render: (row) => (
          <span className="tabular-nums">{formatCurrency(row.purchasePrice, locale)}</span>
        ),
      },
      {
        key: "assignedMemberId",
        label: t("fields.assignedMemberId"),
        render: (row) =>
          row.assignedMemberId ?? <span className="text-default-400">{t("table.unassigned")}</span>,
      },
    ];
  }, [abilities.canUpdate, isStatusPending, locale, t]);

  const tableFilters = useMemo<NonNullable<InventoryTableProps["filters"]>>(
    () => [
      {
        key: "category",
        label: t("fields.category"),
        options: INVENTORY_CATEGORIES.map((category) => ({
          value: category,
          label: t(INVENTORY_CATEGORY_LABEL_KEYS[category]),
        })),
      },
      {
        key: "status",
        label: t("fields.status"),
        options: INVENTORY_STATUSES.map((status) => ({
          value: status,
          label: t(INVENTORY_STATUS_LABEL_KEYS[status]),
        })),
      },
    ],
    [t],
  );

  const rowActions: InventoryTableProps["rowActions"] =
    abilities.canUpdate || abilities.canDelete
      ? (row) => [
          {
            key: "edit",
            label: t("actions.edit"),
            icon: <Pencil className="h-4 w-4" />,
            hidden: !abilities.canUpdate,
            onPress: () => setEditingItem(row),
          },
          {
            key: "delete",
            label: t("actions.delete"),
            icon: <Trash2 className="h-4 w-4" />,
            color: "danger",
            hidden: !abilities.canDelete,
            onPress: () => {
              setActionError(null);
              setDeletingItem(row);
            },
          },
        ]
      : undefined;

  const handleConfirmDelete = () => {
    if (!deletingItem) return;
    const id = deletingItem.id;
    startDeleteTransition(async () => {
      const response = await deleteInventoryAction({ id });
      setDeletingItem(null);
      if (!response.ok) setActionError(t(`errors.${response.error}`));
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {actionError ? (
        <p role="alert" className="rounded-medium bg-danger-50 px-3 py-2 text-small text-danger">
          {actionError}
        </p>
      ) : null}

      <DataTable
        columns={columns}
        rows={result.items}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        sort={filters.requestedSort ?? undefined}
        dir={filters.requestedDirection ?? undefined}
        q={filters.search}
        searchPlaceholder={t("placeholders.search")}
        filters={tableFilters}
        rowActions={rowActions}
        emptyMessage={t("noResultsTitle")}
        ariaLabel={t("title")}
      />

      {abilities.canUpdate ? (
        <InventoryFormModal
          isOpen={editingItem !== null}
          item={editingItem}
          onClose={() => setEditingItem(null)}
        />
      ) : null}

      {abilities.canDelete ? (
        <Modal
          isOpen={deletingItem !== null}
          onOpenChange={(open) => {
            if (!open && !isDeletePending) setDeletingItem(null);
          }}
          size="md"
        >
          <ModalContent>
            <ModalHeader>{t("modal.deleteTitle")}</ModalHeader>
            <ModalBody>
              <p className="text-small text-default-600">
                {t("modal.deleteDescription", { name: deletingItem?.name ?? "" })}
              </p>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="light"
                onPress={() => setDeletingItem(null)}
                isDisabled={isDeletePending}
              >
                {t("actions.cancel")}
              </Button>
              <Button color="danger" onPress={handleConfirmDelete} isLoading={isDeletePending}>
                {t("actions.confirmDelete")}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      ) : null}
    </div>
  );
}
