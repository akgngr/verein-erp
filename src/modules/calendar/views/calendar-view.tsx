import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";

import { CalendarApp } from "../components/calendar-app";
import { calendarPermissions } from "../permissions";
import { canManageSharedCalendars } from "../services/calendars";
import { hasFeedToken } from "../services/feed";
import { listSources } from "../services/range";
import { syncSettingsFor } from "../services/sync";

export async function CalendarView() {
  let user;
  try {
    user = await requirePermission(calendarPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const canManage = canManageSharedCalendars(user);
  const [sources, hasFeed, sync] = await Promise.all([listSources(user), hasFeedToken(user.id), syncSettingsFor(user.id, canManage)]);
  return <CalendarApp sources={sources} canManageShared={canManage} hasFeed={hasFeed} sync={sync} />;
}
