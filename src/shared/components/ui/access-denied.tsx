import { ShieldX } from "lucide-react";

import { EmptyState } from "./empty-state";

/** requirePermission ForbiddenError fırlattığında view'lar bunu gösterir (7.4). */
export function AccessDenied() {
  return (
    <EmptyState
      icon={ShieldX}
      title="Erişim engellendi"
      description="Bu sayfayı görüntüleme yetkiniz yok. Lütfen yöneticinizle görüşün."
    />
  );
}
