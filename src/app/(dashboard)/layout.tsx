import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { SessionUser } from "@/modules/auth";
import { requireUser, signOutAction } from "@/modules/auth/server";
import { getAllActiveModuleKeys } from "@/shared/modules/module-store";
import { allModules } from "@/registry";

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

  const activeModuleKeys = getAllActiveModuleKeys(allModules.map((m) => m.key));
  const collapsed = (await cookies()).get(SIDEBAR_COLLAPSED_COOKIE)?.value === "1";

  return (
    <SidebarProvider initialCollapsed={collapsed}>
      <div className="flex min-h-dvh">
        <DesktopSidebar
          role={user.role}
          activeModuleKeys={activeModuleKeys}
          userName={user.name}
          userEmail={user.email}
          onSignOut={signOutAction}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileHeader />
          <main className="flex-1 px-4 py-6 md:px-6">{children}</main>
        </div>
        <MobileSidebar
          role={user.role}
          activeModuleKeys={activeModuleKeys}
          userName={user.name}
          userEmail={user.email}
          onSignOut={signOutAction}
        />
      </div>
    </SidebarProvider>
  );
}
