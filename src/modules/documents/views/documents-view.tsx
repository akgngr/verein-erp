import { FileText } from "lucide-react";

import { requirePermission, ForbiddenError } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { PageHeader } from "@/shared/components/ui/page-header";

import { documentsPermissions } from "../permissions";

export async function DocumentsView() {
  try {
    await requirePermission(documentsPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  return (
    <div>
      <PageHeader
        title="Evrak Kayıt"
        description="Derneğin gelen ve giden evrak kayıtları."
      />
      <EmptyState
        icon={FileText}
        title="Bu modül yakında eklenecek"
        description="Evrak kayıt işlemleri sonraki fazda devreye alınacaktır."
      />
    </div>
  );
}
