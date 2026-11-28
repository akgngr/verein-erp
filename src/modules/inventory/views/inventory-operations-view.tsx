import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { listMemberOptions } from "@/modules/members/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { LinkButton } from "@/shared/components/ui/link-button";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";

import { InventoryOperationsPanel } from "../components/inventory-operations-panel";
import { INVENTORY_BASE_PATH } from "../constants";
import { inventoryPermissions } from "../permissions";
import { getInventoryOperationsData } from "../queries/lending-maintenance";

const berlinToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());

export async function InventoryOperationsView() {
  let user;
  try {
    user = await requirePermission(inventoryPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const t = await getTranslations("inventory");
  const canUpdate = can(user.role, inventoryPermissions, "update");
  const [data, memberOptions] = await Promise.all([
    getInventoryOperationsData(),
    canUpdate ? listMemberOptions().catch(() => []) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("operations.pageTitle")}
        description={t("operations.pageDescription")}
        actions={
          <LinkButton href={INVENTORY_BASE_PATH} variant="bordered">
            {t("meta.list")}
          </LinkButton>
        }
      />
      <InventoryOperationsPanel
        data={data}
        memberOptions={memberOptions}
        canUpdate={canUpdate}
        today={berlinToday()}
      />
    </div>
  );
}
