import { CalendarDays } from "lucide-react";

import { requirePermission, ForbiddenError } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { PageHeader } from "@/shared/components/ui/page-header";

import { meetingsPermissions } from "../permissions";

export async function MeetingsView() {
  try {
    await requirePermission(meetingsPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  return (
    <div>
      <PageHeader
        title="Toplantılar"
        description="Dernek toplantıları ve karar defteri."
      />
      <EmptyState
        icon={CalendarDays}
        title="Bu modül yakında eklenecek"
        description="Toplantı yönetimi sonraki fazda devreye alınacaktır."
      />
    </div>
  );
}
