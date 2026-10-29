import { ShieldX } from "lucide-react";
import { useTranslations } from "next-intl";

import { EmptyState } from "./empty-state";

/** requirePermission ForbiddenError fırlattığında view'lar bunu gösterir (7.4). */
export function AccessDenied() {
  const t = useTranslations("common");
  return (
    <EmptyState
      icon={ShieldX}
      title={t("accessDeniedTitle")}
      description={t("accessDeniedDescription")}
    />
  );
}
