import "server-only";

import { requirePermission } from "@/modules/auth/server";
import { getDb } from "@/shared/db";
import { PROVIDERS } from "../constants";
import { socialLoginPermissions } from "../permissions";

export async function listProviderSettings() {
  await requirePermission(socialLoginPermissions, "update");
  const rows = await getDb().socialLoginProvider.findMany();
  return PROVIDERS.map((id) => {
    const row = rows.find((item) => item.id === id);
    return { id, enabled: row?.enabled ?? false, clientId: row?.clientId ?? "", tenantId: row?.tenantId ?? "", hasSecret: Boolean(row?.secretEnc) };
  });
}
