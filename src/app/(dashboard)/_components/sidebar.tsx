"use client";

import { Button, Drawer, DrawerBody, DrawerContent, DrawerHeader } from "@heroui/react";
import { Building2, LayoutDashboard, Menu as MenuIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";

import { registry } from "@/registry";
import type { Role } from "@/shared/roles";
import { can } from "@/shared/permissions/define";
import type { NavItem } from "@/shared/types/module";
import { cn } from "@/shared/utils";

type SidebarContextValue = {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

function SidebarProvider({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <SidebarContext.Provider value={{ mobileOpen, setMobileOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar yalnızca SidebarProvider içinde kullanılabilir.");
  return ctx;
}

/** Sidebar'da sabit "Panel" öğesi (yetki gerektirmez). */
const PANEL_ITEM: NavItem = {
  href: "/",
  label: "Panel",
  icon: LayoutDashboard,
  group: "main",
  order: 0,
  permission: {
    definition: {
      resource: "panel",
      grants: { ADMIN: ["view"], BOARD: ["view"], SECRETARY: ["view"], VIEWER: ["view"] },
    },
    action: "view",
  },
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContent({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();

  // Menü yetkiye göre süzülür ve group + order ile sıralanır (7.4, 8. bölüm).
  const visibleItems = [...registry.flatMap((module) => module.nav), PANEL_ITEM]
    .filter((item) => can(role, item.permission.definition, item.permission.action))
    .sort((a, b) => (a.group === b.group ? a.order - b.order : a.group === "main" ? -1 : 1));

  const mainItems = visibleItems.filter((item) => item.group === "main");
  const settingsItems = visibleItems.filter((item) => item.group === "settings");

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-medium px-3 py-2 text-small transition-colors",
          active
            ? "bg-primary-100 text-primary-600 dark:bg-primary-100/20 dark:text-primary-300"
            : "text-default-600 hover:bg-default-100",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <nav className="flex flex-col gap-4 px-3 py-4" aria-label="Ana menü">
      <div className="flex flex-col gap-1">{mainItems.map(renderItem)}</div>
      {settingsItems.length > 0 ? (
        <div className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-tiny font-medium uppercase tracking-wide text-default-400">
            Ayarlar
          </p>
          {settingsItems.map(renderItem)}
        </div>
      ) : null}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2 border-b border-default-200 px-5 py-4">
      <Building2 className="h-5 w-5 text-primary" aria-hidden />
      <span className="text-small font-semibold">Dernek Yönetim</span>
    </div>
  );
}

/** Masaüstü sabit sidebar (256px). */
function DesktopSidebar({ role }: { role: Role }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-default-200 lg:flex">
      <Brand />
      <SidebarContent role={role} />
    </aside>
  );
}

/** Mobil (<1024px) HeroUI Drawer. */
function MobileSidebar({ role }: { role: Role }) {
  const { mobileOpen, setMobileOpen } = useSidebar();
  return (
    <Drawer
      isOpen={mobileOpen}
      onOpenChange={setMobileOpen}
      placement="left"
      size="xs"
      hideCloseButton
    >
      <DrawerContent>
        {(onClose) => (
          <>
            <DrawerHeader className="flex flex-col items-start px-0 pb-0">
              <Brand />
            </DrawerHeader>
            <DrawerBody className="px-0">
              <SidebarContent role={role} onNavigate={onClose} />
            </DrawerBody>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}

/** Topbar'daki mobil menü butonu. */
function SidebarTrigger() {
  const { setMobileOpen } = useSidebar();
  return (
    <Button
      isIconOnly
      variant="light"
      size="sm"
      aria-label="Menüyü aç"
      className="lg:hidden"
      onPress={() => setMobileOpen(true)}
    >
      <MenuIcon className="h-5 w-5" />
    </Button>
  );
}

export { SidebarProvider, DesktopSidebar, MobileSidebar, SidebarTrigger };
