"use server";

import { revalidatePath } from "next/cache";
import type { DocumentStatus, Prisma } from "@prisma/client";
import { z } from "zod";

import { createAction } from "@/modules/auth/server";
import { parseBulkSelection } from "@/shared/data-table/server-selection";
import {
  dataTableSelectionSchema,
  type DataTableSelection,
} from "@/shared/data-table/selection-contract";
import { getDb } from "@/shared/db";
import type { ListParams } from "@/shared/list-params";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { STATUS_VALUES } from "../constants";
import { documentsPermissions } from "../permissions";
import {
  buildDocumentWhere,
  DOCUMENT_DEFAULT_SORT,
  DOCUMENT_SORTABLE_FIELDS,
  type DocumentListFilterKeys,
} from "../queries/list-documents";

const DOCUMENT_FILTER_KEYS = [
  "direction",
  "status",
  "categoryId",
  "assigneeId",
  "from",
  "to",
  "mine",
  "overdue",
] as const;

const bulkDocumentStatusSchema = z.object({
  selection: dataTableSelectionSchema,
  status: z.enum(STATUS_VALUES),
}).strict();

type BulkDocumentStatusResult = {
  updated: number;
  skipped: number;
};

function queryToListParams(
  query: Extract<DataTableSelection, { type: "query" }>["query"],
): ListParams<DocumentListFilterKeys> {
  const filters: Partial<Record<DocumentListFilterKeys, string>> = {};
  for (const key of DOCUMENT_FILTER_KEYS) {
    const value = query.filters[key];
    if (value) filters[key] = value;
  }

  const sort =
    query.sort &&
    DOCUMENT_SORTABLE_FIELDS.includes(
      query.sort as (typeof DOCUMENT_SORTABLE_FIELDS)[number],
    )
      ? query.sort
      : DOCUMENT_DEFAULT_SORT;

  return {
    page: 1,
    pageSize: 10,
    q: query.q ?? "",
    sort,
    dir: query.dir ?? "desc",
    filters,
    skip: 0,
    take: 10,
  };
}

function selectionWhere(
  selection: DataTableSelection,
  currentUserId: string,
): Prisma.DocumentWhereInput {
  if (selection.type === "explicit") {
    return {
      deletedAt: null,
      id: { in: selection.ids },
    };
  }

  const base = buildDocumentWhere(
    queryToListParams(selection.query),
    currentUserId,
  );

  if (selection.excludedIds.length === 0) return base;

  return {
    AND: [base, { id: { notIn: selection.excludedIds } }],
  };
}

export async function bulkChangeDocumentStatusAction(
  input: unknown,
): Promise<ActionResult<BulkDocumentStatusResult>> {
  return createAction({
    permission: { definition: documentsPermissions, action: "update" },
    schema: bulkDocumentStatusSchema,
    handler: async ({ input, user, audit }) => {
      const selection = parseBulkSelection(input.selection, {
        allowedFilterKeys: DOCUMENT_FILTER_KEYS,
      });
      const where = selectionWhere(selection, user.id);
      const db = getDb();

      const selectedTotal = await db.document.count({ where });
      if (selectedTotal === 0) {
        return { updated: 0, skipped: 0 };
      }

      const targetStatus = input.status as DocumentStatus;
      const result = await db.document.updateMany({
        where: {
          AND: [where, { status: { not: targetStatus } }],
        },
        data: {
          status: targetStatus,
          updatedById: user.id,
          updatedByLabel: buildUserLabel(user.name, user.email),
        },
      });

      const skipped = Math.max(0, selectedTotal - result.count);

      await audit({
        action: "STATUS_CHANGE",
        entity: "DocumentBulk",
        entityId: "bulk-status",
        before: {
          selectionType: selection.type,
          selectedCount: selectedTotal,
        },
        after: {
          status: targetStatus,
          updatedCount: result.count,
          skippedCount: skipped,
        },
      });

      revalidatePath("/evrak");
      return { updated: result.count, skipped };
    },
  })(input);
}
