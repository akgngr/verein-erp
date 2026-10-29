import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { FormDrawer } from "@/shared/components/forms/form-drawer";

import { listAccountOptions } from "../queries/list-accounts";
import { listCategoryOptions } from "../queries/list-categories";
import { listProjectOptions } from "../queries/list-projects";
import { accountingPermissions } from "../permissions";
import { BookingForm } from "../components/booking-form";

/** Yeni fiş (§ 11.2): ?tur=gelir|gider|virman → tür; alan seti türle uyarlanır. */
export async function AccountingCreateView({
  type,
}: {
  type: "INCOME" | "EXPENSE" | "TRANSFER";
}) {
  let canCreate;
  try {
    await requirePermission(accountingPermissions, "create");
    canCreate = true;
  } catch (error) {
    if (error instanceof ForbiddenError) return <FormDrawer title="">{<AccessDenied />}</FormDrawer>;
    throw error;
  }
  void canCreate;

  const [accounts, categories, projects] = await Promise.all([
    listAccountOptions(),
    listCategoryOptions(),
    listProjectOptions(),
  ]);
  const t = await getTranslations("accounting.form");

  return (
    <FormDrawer title={t("createTitle")} description={type === "INCOME" ? t("typeIncome") : type === "EXPENSE" ? t("typeExpense") : t("typeTransfer")}>
      <BookingForm mode="create" accounts={accounts} categories={categories} projects={projects} initial={{ type }} />
    </FormDrawer>
  );
}
