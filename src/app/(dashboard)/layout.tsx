import { getLocale } from "next-intl/server";
import { WorkspaceHeader } from "./_components/workspace-header";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { SessionUser } from "@/modules/auth";
import { requireUser, signOutAction } from "@/modules/auth/server";
import { AiAssistantSlot } from "@/modules/ai/ui";
import { FeedbackSlot } from "@/modules/feedback/ui";
import { listUsableModuleKeys } from "@/modules/system/server";
import { resolveWidgetsForUser } from "@/modules/widgets/server";
import {
  getUserNavPreference,
  listPermissionResources,
  listRoleDirectory,
  loadPermissionPolicy,
} from "@/modules/users/server";
import { RolesProvider } from "@/shared/components/roles/roles-provider";
import { QuickSearchProvider } from "@/shared/components/search/quick-search-palette";

import {
  DesktopSidebar,
  MobileHeader,
  MobileSidebar,
  SidebarProvider,
} from "./_components/sidebar";
import { SIDEBAR_COLLAPSED_COOKIE } from "./_components/sidebar-state";

// KARAR: requireUser() oturum çerezlerini okur; bu segment statik üretilemez.
// force-dynamic, derleme sırasında veritabanına erişim denemesini de engeller.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user: SessionUser;
  try {
    user = await requireUser({ allowPasswordChangePending: true });
  } catch {
    // KARAR: Pasife alınmış kullanıcı için bilgilendirme gösterilir;
    // "?pasif=1" parametresi middleware'deki yönlendirme döngüsünü kırar.
    redirect("/giris?pasif=1");
  }

  // Menüde yalnızca kullanılabilir modüller: çekirdek + etkin ve erişim izni onaylı olanlar.
  const [activeModuleKeys, roles, policy, resources, initialNavConfig] = await Promise.all([
    listUsableModuleKeys(),
    listRoleDirectory(),
    loadPermissionPolicy(),
    listPermissionResources(),
    getUserNavPreference(user.id).catch(() => null),
  ]);
  const locale = await getLocale();
  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Berlin",
  }).format(new Date());
  // All module, tenant, permission and admin-policy checks stay on the server.
  // A failed lookup removes widgets; no client-side fallback may grant access.
  // Zorunlu parola değişimi beklenirken SSE bildirim zili gibi üst widget'lar açılmaz.
  const widgetAccess = user.mustChangePassword
    ? { allowedIds: [], preferences: [] }
    : await resolveWidgetsForUser(user, activeModuleKeys)
        .catch(() => ({ allowedIds: [], preferences: [] }));
  const collapsed =
    (await cookies()).get(SIDEBAR_COLLAPSED_COOKIE)?.value === "1";

  return (
    <RolesProvider
      roles={roles}
      policy={policy}
      resources={resources.map(({ moduleKey, definition }) => ({
        moduleKey,
        definition,
      }))}
    >
      <QuickSearchProvider
        role={user.role}
        activeModuleKeys={activeModuleKeys}
        disabled={user.mustChangePassword}
      >
        <SidebarProvider initialCollapsed={collapsed}>
          <div className="workspace-shell flex min-h-dvh">
            <DesktopSidebar
              role={user.role}
              activeModuleKeys={activeModuleKeys}
              initialNavConfig={initialNavConfig}
              userName={user.name}
              userEmail={user.email}
              onSignOut={signOutAction}
            />
            {/* AI asistanı içerik sütununu sarar: altta yüzen giriş çubuğu, sağda sohbet sütunu.
              Modül kapalıysa, rol izinli değilse sütun olduğu gibi döner. */}
            <AiAssistantSlot user={user}>
              <div className="flex min-w-0 flex-1 flex-col">
                <MobileHeader widgetAccess={widgetAccess} />
                <WorkspaceHeader
                  dateLabel={dateLabel}
                  widgetAccess={widgetAccess}
                />
                {/* #586: Alt boşluk (güvenli alan dahil): yüzen AI/geri bildirim düğmeleri son satırları,
                  sayfalamayı ve kaydet düğmelerini örtmez. */}
                <main className="workspace-main flex-1 px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-7 lg:pt-8 lg:pb-28">
                  {children}
                </main>
              </div>
            </AiAssistantSlot>
            {/* Test aşaması: sağ altta yüzen hata/öneri butonu (modül kapalıysa çizilmez). */}
            <FeedbackSlot user={user} />
            <MobileSidebar
              role={user.role}
              activeModuleKeys={activeModuleKeys}
              initialNavConfig={initialNavConfig}
              userName={user.name}
              userEmail={user.email}
              onSignOut={signOutAction}
            />
          </div>
        </SidebarProvider>
      </QuickSearchProvider>
    </RolesProvider>
  );
}
