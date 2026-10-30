import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { parseListParams, type RawSearchParams } from "@/shared/list-params";
import { can } from "@/shared/permissions/define";

import { ChargesTable } from "../components/charges-table";
import { courseFeesPermissions } from "../permissions";
import { CHARGE_SORTABLE_FIELDS, getCoursesSettings, listCharges, type ChargeListFilterKeys } from "../queries/course-parts";
import { berlinToday, formatDateOnly } from "../utils";

/** Tüm kursların ücret kalemleri (varsayılan: açık olanlar) ve tahsilat. */
export async function FeesView({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  let user;
  try {
    user = await requirePermission(courseFeesPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const t = await getTranslations("courses.fees");
  const raw = await searchParams;
  const params = parseListParams<ChargeListFilterKeys>(raw, { sortableFields: CHARGE_SORTABLE_FIELDS, defaultSort: "dueDate", filterKeys: ["status", "overdue"] });
  const [charges, settings] = await Promise.all([listCharges(params), getCoursesSettings()]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      {!settings.incomeCategoryId ? <p className="rounded-medium border border-warning-200 bg-warning-50 p-3 text-small text-warning-700">{t("categoryMissing")}</p> : null}
      <ChargesTable
        {...charges}
        sort={params.sort}
        dir={params.dir}
        q={params.q}
        canPay={can(user.role, courseFeesPermissions, "create")}
        canManage={can(user.role, courseFeesPermissions, "update")}
        showCourse
        today={formatDateOnly(berlinToday())}
      />
    </div>
  );
}
