import { getTranslations } from "next-intl/server";
import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";
import { parseListParams, type RawSearchParams } from "@/shared/list-params";

import { documentCategoriesPermissions } from "../permissions";
import { listCategories } from "../queries/list-categories";
import { CategoryTable } from "../components/category-table";

/** Kategori yönetimi (8.5): kategoriler silinmez, pasife alınır. */
export async function CategoryListView({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const t = await getTranslations("documents");
  let user;
  try {
    user = await requirePermission(documentCategoriesPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const params = parseListParams(await searchParams, {
    sortableFields: ["name", "isActive", "createdAt"],
    defaultSort: "name",
    filterKeys: ["isActive"],
  });

  const list = await listCategories(params);

  return (
    <div>
      <PageHeader
        title={t("categoriesPageTitle")}
        description={t("categoriesPageDescription")}
      />
      <CategoryTable
        rows={list.rows}
        total={list.total}
        page={list.page}
        pageSize={list.pageSize}
        sort={params.sort}
        dir={params.dir}
        q={params.q}
        canUpdate={can(user.role, documentCategoriesPermissions, "update")}
      />
    </div>
  );
}
