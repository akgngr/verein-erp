import { Users } from "lucide-react";

import { requirePermission, ForbiddenError } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { PageHeader } from "@/shared/components/ui/page-header";

import { membersPermissions } from "../permissions";

export async function MembersView() {
  try {
    await requirePermission(membersPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  return (
    <div>
      <PageHeader title="Üyeler" description="Dernek üye kayıtları." />
      <EmptyState
        icon={Users}
        title="Bu modül yakında eklenecek"
        description="Üye yönetimi sonraki fazda devreye alınacaktır."
      />
    </div>
  );
}
