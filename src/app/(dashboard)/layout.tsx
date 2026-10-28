import { redirect } from "next/navigation";

import type { SessionUser } from "@/modules/auth";
import { requireUser, signOutAction } from "@/modules/auth/server";
import { getAllActiveModuleKeys } from "@/shared/modules/module-store";
import { allModules } from "@/registry";

import { DesktopSidebar, MobileSidebar, SidebarProvider } from "./_components/sidebar";
import { Topbar } from "./_components/topbar";

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

  return (
    <SidebarProvider>
      <div className="flex min-h-dvh">
        <DesktopSidebar role={user.role} activeModuleKeys={activeModuleKeys} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            name={user.name}
            email={user.email}
            role={user.role}
            onSignOut={signOutAction}
          />
          <main className="flex-1 px-4 py-6 md:px-6">{children}</main>
        </div>
        <MobileSidebar role={user.role} activeModuleKeys={activeModuleKeys} />
      </div>
    </SidebarProvider>
  );
}
