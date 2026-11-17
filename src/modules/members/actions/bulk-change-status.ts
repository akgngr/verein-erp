"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

import { createAction } from "@/modules/auth/server";
import { getDb } from "@/shared/db";
import {
  parseBulkSelection,
} from "@/shared/data-table/server-selection";
import { dataTableSelectionSchema } from "@/shared/data-table/selection-contract";
import type { ListParams } from "@/shared/list-params";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { membersPermissions } from "../permissions";
import {
  buildMemberWhere,
  MEMBER_DEFAULT_SORT,
  MEMBER_SORTABLE_FIELDS,
  type MemberListFilterKeys,
} from "../queries/list-members";

const bulkMemberStatusSchema = z.object({
  selection: dataTableSelectionSchema,
  status: z.enum(["ACTIVE", "PASSIVE"]),
}).strict();

type BulkMemberStatusResult = {
  updated: number;
  skipped: number;
};

const MEMBER_FILTER_KEYS = ["status", "type", "from", "to"] as const;

function queryToListParams(
  query: Extract<
    z.infer<typeof dataTableSelectionSchema>,
    { type: "query" }
  >["query"],
): ListParams<MemberListFilterKeys> {
  const filters: Partial<Record<MemberListFilterKeys, string>> = {};
  for (const key of MEMBER_FILTER_KEYS) {
    const value = query.filters[key];
    if (value) filters[key] = value;
  }

  const sort =
    query.sort && MEMBER_SORTABLE_FIELDS.includes(query.sort as (typeof MEMBER_SORTABLE_FIELDS)[number])
      ? query.sort
      : MEMBER_DEFAULT_SORT;

  return {
    page: 1,
    pageSize: 10,
    q: query.q ?? "",
    sort,
    dir: query.dir ?? "asc",
    filters,
    skip: 0,
    take: 10,
  };
}

function selectionWhere(
  selection: z.infer<typeof dataTableSelectionSchema>,
): Prisma.MemberWhereInput {
  if (selection.type === "explicit") {
    return {
      deletedAt: null,
      id: { in: selection.ids },
    };
  }

  const base = buildMemberWhere(queryToListParams(selection.query));
  if (selection.excludedIds.length === 0) return base;

  return {
    AND: [base, { id: { notIn: selection.excludedIds } }],
  };
}

export async function bulkChangeMemberStatusAction(
  input: unknown,
): Promise<ActionResult<BulkMemberStatusResult>> {
  return createAction({
    permission: { definition: membersPermissions, action: "update" },
    schema: bulkMemberStatusSchema,
    handler: async ({ input, user, audit }) => {
      const selection = parseBulkSelection(input.selection, {
        allowedFilterKeys: MEMBER_FILTER_KEYS,
      });
      const where = selectionWhere(selection);
      const db = getDb();

      const selectedTotal = await db.member.count({ where });
      if (selectedTotal === 0) {
        return { updated: 0, skipped: 0 };
      }

      const eligibleWhere: Prisma.MemberWhereInput = {
        AND: [
          where,
          {
            status: {
              in: ["ACTIVE", "PASSIVE"],
              not: input.status,
            },
          },
        ],
      };

      const updatedByLabel = buildUserLabel(user.name, user.email);
      const result = await db.member.updateMany({
        where: eligibleWhere,
        data: {
          status: input.status,
          cancellationReceivedAt: null,
          updatedById: user.id,
          updatedByLabel,
        },
      });

      const skipped = Math.max(0, selectedTotal - result.count);

      await audit({
        action: "UPDATE",
        entity: "MemberBulk",
        entityId: "bulk-status",
        before: {
          selectionType: selection.type,
          selectedCount: selectedTotal,
        },
        after: {
          status: input.status,
          updatedCount: result.count,
          skippedCount: skipped,
        },
      });

      revalidatePath("/uyeler");
      return { updated: result.count, skipped };
    },
  })(input);
}
