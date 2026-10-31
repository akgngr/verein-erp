import "server-only";

import type { Prisma } from "@prisma/client";
import type { Role } from "@/shared/roles";

import { getDb } from "@/shared/db";
import type { ListParams, ListResult } from "@/shared/list-params";

/** passwordHash bu tipte ve tüm select'lerde ASLA yer almaz. */
export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
};

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export function buildUserWhere(params: ListParams<"role" | "status">): Prisma.UserWhereInput {
  const conditions: Prisma.UserWhereInput[] = [
    params.q
      ? {
          OR: [
            { name: { contains: params.q, mode: "insensitive" } },
            { email: { contains: params.q, mode: "insensitive" } },
          ],
        }
      : {},
    params.filters.role ? { role: params.filters.role as Role } : {},
    params.filters.status === "active" ? { isActive: true } : {},
    params.filters.status === "passive" ? { isActive: false } : {},
  ];
  return { AND: conditions.filter((condition) => Object.keys(condition).length > 0) };
}

/** parseListParams çıktısıyla Prisma findMany + count (Promise.all) — 9.1. */
export async function listUsers(
  params: ListParams<"role" | "status">,
): Promise<ListResult<UserRow>> {
  const where = buildUserWhere(params);
  const db = getDb();

  const [rows, total] = await Promise.all([
    db.user.findMany({
      where,
      select: USER_SELECT,
      orderBy: { [params.sort]: params.dir } as Prisma.UserOrderByWithRelationInput,
      skip: params.skip,
      take: params.take,
    }),
    db.user.count({ where }),
  ]);

  return { rows, total, page: params.page, pageSize: params.pageSize };
}

/** Düzenleme ekranı için tek kullanıcı (passwordHash seçilmez). */
export async function getUserById(id: string): Promise<UserRow | null> {
  const user = await getDb().user.findUnique({
    where: { id },
    select: USER_SELECT,
  });
  return user ?? null;
}
