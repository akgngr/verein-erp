import { getLocale } from "next-intl/server";
import { WorkspaceHeader } from "./_components/workspace-header";
import { Fragment } from "react";
import { moduleHeaderRegistry } from "@/header-registry";
import { usableHeaderActions } from "@/shared/header/define";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { SessionUser } from "@/modules/auth";
import { requireUser, signOutAction } from "@/modules/auth/server";
import { AiAssistantSlot } from "@/modules/ai/ui";
import { FeedbackSlot } from "@/modules/feedback/ui";
import { listUsableModuleKeys } from "@/modules/system/server";
import {
  listPermissionResources,
  listRoleDirectory,
  loadPermissionPolicy,
} from "@/modules/users/server";
import { RolesProvider } from "@/shared/components/roles/roles-provider";

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
    user = await requireUser();
  } catch {
    // KARAR: Pasife alınmış kullanıcı için bilgilendirme gösterilir;
    // "?pasif=1" parametresi middleware'deki yönlendirme döngüsünü kırar.
    redirect("/giris?pasif=1");
  }

  // Menüde yalnızca kullanılabilir modüller: çekirdek + etkin ve erişim izni onaylı olanlar.
  const [activeModuleKeys, roles, policy, resources] = await Promise.all([
    listUsableModuleKeys(),
    listRoleDirectory(),
    loadPermissionPolicy(),
    listPermissionResources(),
  ]);
  const locale = await getLocale();
  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Berlin",
  }).format(new Date());
  // Üst çubuk eylemleri (RFC-002): yalnız kullanılabilir modüllerin; her eylem kendi yetkisini denetler.
  const headerActions = await Promise.all(
    usableHeaderActions(moduleHeaderRegistry, activeModuleKeys).map(async (action) => ({
      key: `${action.module}:${action.key}`,
      node: await Promise.resolve(action.render({ user: { id: user.id, role: user.role } })).catch(() => null),
    })),
  );
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
      <SidebarProvider initialCollapsed={collapsed}>
        <div className="workspace-shell flex min-h-dvh">
          <DesktopSidebar
            role={user.role}
            activeModuleKeys={activeModuleKeys}
            userName={user.name}
            userEmail={user.email}
            onSignOut={signOutAction}
          />
          {/* AI asistanı içerik sütununu sarar: altta yüzen giriş çubuğu, sağda sohbet sütunu.
            Modül kapalıysa, rol izinli değilse sütun olduğu gibi döner. */}
          <AiAssistantSlot user={user}>
            <div className="flex min-w-0 flex-1 flex-col">
              <MobileHeader />
              <WorkspaceHeader
                dateLabel={dateLabel}
                actions={headerActions.map(({ key, node }) => <Fragment key={key}>{node}</Fragment>)}
              />
              <main className="workspace-main flex-1 px-4 py-6 md:px-7 lg:py-8">
                {children}
              </main>
            </div>
          </AiAssistantSlot>
          {/* Test aşaması: sağ altta yüzen hata/öneri butonu (modül kapalıysa çizilmez). */}
          <FeedbackSlot user={user} />
          <MobileSidebar
            role={user.role}
            activeModuleKeys={activeModuleKeys}
            userName={user.name}
            userEmail={user.email}
            onSignOut={signOutAction}
          />
        </div>
      </SidebarProvider>
    </RolesProvider>
  );
}
