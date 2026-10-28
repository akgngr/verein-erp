"use client";

import {
  Button,
  Chip,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/react";
import { Building2, LayoutDashboard, LogOut, Menu as MenuIcon, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { registry } from "@/registry";
import { ROLE_COLORS, ROLE_LABELS, type Role } from "@/shared/roles";
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
  labelKey: "panel",
  icon: LayoutDashboard,
  group: "main",
  order: 0,
  permission: {
    definition: {
      resource: "panel",
      grants: { ADMIN: ["view"], BOARD: ["view"], SECRETARY: ["view"], VIEWER: ["view"], TREASURER: ["view"], AUDITOR: ["view"] },
    },
    action: "view",
  },
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/" || href === "/ayarlar") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContent({
  role,
  activeModuleKeys,
  onNavigate,
}: {
  role: Role;
  activeModuleKeys?: string[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const tNav = useTranslations("nav");
  const tSidebar = useTranslations("sidebar");

  // Yalnızca aktif olan modüllerin menü öğeleri gösterilir
  const activeModules = activeModuleKeys
    ? registry.filter((m) => activeModuleKeys.includes(m.key))
    : registry;

  // Menü yetkiye göre süzülür ve group + order ile sıralanır (7.4, 8. bölüm).
  const visibleItems = [...activeModules.flatMap((module) => module.nav), PANEL_ITEM]
    .filter((item) => can(role, item.permission.definition, item.permission.action))
    .sort((a, b) => (a.group === b.group ? a.order - b.order : a.group === "main" ? -1 : 1));

  const mainItems = visibleItems.filter((item) => item.group === "main");
  const settingsItems = visibleItems.filter((item) => item.group === "settings");

  const getItemLabel = (item: NavItem): string => {
    if (item.labelKey && tNav.has(item.labelKey)) {
      return tNav(item.labelKey);
    }
    const cleanKey = item.href.replace(/^\//, "").split("/").pop();
    if (cleanKey && tNav.has(cleanKey)) {
      return tNav(cleanKey);
    }
    return item.label;
  };

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(pathname, item.href);
    const label = getItemLabel(item);

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-small font-medium transition-all duration-150",
          active
            ? "bg-primary-50 text-primary-700 shadow-xs dark:bg-primary-500/15 dark:text-primary-300 font-semibold"
            : "text-default-600 hover:bg-default-100/80 hover:text-foreground",
        )}
      >
        {active && (
          <span
            className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary"
            aria-hidden
          />
        )}
        <Icon
          className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            active ? "text-primary" : "text-default-400 group-hover:text-default-600",
          )}
          aria-hidden
        />
        <span className="truncate">{label}</span>
      </Link>
    );
  };

  return (
    <nav className="flex flex-col gap-5 px-3 py-4" aria-label={tSidebar.has("mainMenu") ? tSidebar("mainMenu") : "Ana menü"}>
      <div className="flex flex-col gap-1">{mainItems.map(renderItem)}</div>
      {settingsItems.length > 0 ? (
        <div className="flex flex-col gap-1 pt-2">
          <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-default-400">
            {tSidebar.has("settings") ? tSidebar("settings") : "Ayarlar"}
          </p>
          {settingsItems.map(renderItem)}
        </div>
      ) : null}
    </nav>
  );
}

function Brand() {
  const tSidebar = useTranslations("sidebar");
  return (
    <div className="flex items-center gap-3 border-b border-default-200/80 px-5 py-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
        <Building2 className="h-5 w-5" aria-hidden />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-small font-bold tracking-tight text-foreground truncate">Dernek ERP</span>
        <span className="text-[11px] font-medium text-default-400 leading-none truncate">
          {tSidebar.has("brand") ? tSidebar("brand") : "Yönetim Sistemi"}
        </span>
      </div>
    </div>
  );
}

function SidebarUserFooter({
  name,
  email,
  role,
  onSignOut,
  onNavigate,
}: {
  name: string;
  email: string;
  role: Role;
  onSignOut: () => Promise<void>;
  onNavigate?: () => void;
}) {
  const tNav = useTranslations("nav");
  const tSidebar = useTranslations("sidebar");
  const initials = name
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");

  return (
    <div className="border-t border-default-200/80 p-3 bg-default-50/50 shrink-0">
      <Dropdown placement="top-start">
        <DropdownTrigger>
          <button
            type="button"
            className="group flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition-all duration-150 hover:bg-default-100/90 cursor-pointer"
            aria-label={tSidebar.has("userMenu") ? tSidebar("userMenu") : "Kullanıcı menüsü"}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold text-small shadow-xs group-hover:scale-105 transition-transform">
              {initials || "?"}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-small font-semibold text-foreground leading-tight">
                {name}
              </span>
              <span className="truncate text-tiny text-default-400 leading-tight">
                {email}
              </span>
            </div>
            <Chip
              size="sm"
              variant="flat"
              color={ROLE_COLORS[role]}
              className="h-5 text-[10px] shrink-0"
            >
              {ROLE_LABELS[role]}
            </Chip>
          </button>
        </DropdownTrigger>
        <DropdownMenu aria-label={tSidebar.has("userActions") ? tSidebar("userActions") : "Kullanıcı işlemleri"}>
          <DropdownItem key="identity" isReadOnly showDivider>
            <div className="flex flex-col gap-1 py-1">
              <p className="text-small font-semibold text-foreground">{name}</p>
              <p className="text-tiny text-default-500">{email}</p>
              <Chip color={ROLE_COLORS[role]} size="sm" variant="flat" className="mt-1 self-start">
                {ROLE_LABELS[role]}
              </Chip>
            </div>
          </DropdownItem>
          <DropdownItem
            key="profile"
            startContent={<UserRound className="h-4 w-4 text-default-500" />}
            href="/profil"
            onPress={onNavigate}
          >
            {tNav.has("profil") ? tNav("profil") : "Profil"}
          </DropdownItem>
          <DropdownItem
            key="settings"
            startContent={<Settings className="h-4 w-4 text-default-500" />}
            href="/ayarlar"
            onPress={onNavigate}
          >
            {tNav.has("ayarlar") ? tNav("ayarlar") : "Ayarlar"}
          </DropdownItem>
          <DropdownItem
            key="logout"
            color="danger"
            className="text-danger"
            startContent={<LogOut className="h-4 w-4" />}
            onPress={() => void onSignOut()}
          >
            Çıkış yap
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </div>
  );
}

/** Masaüstü sabit sidebar (256px). */
function DesktopSidebar({
  role,
  activeModuleKeys,
  userName,
  userEmail,
  onSignOut,
}: {
  role: Role;
  activeModuleKeys?: string[];
  userName?: string;
  userEmail?: string;
  onSignOut?: () => Promise<void>;
}) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-default-200/80 bg-background/95 backdrop-blur-sm lg:flex">
      <Brand />
      <div className="flex-1 overflow-y-auto">
        <SidebarContent role={role} activeModuleKeys={activeModuleKeys} />
      </div>
      {userName && onSignOut && (
        <SidebarUserFooter
          name={userName}
          email={userEmail ?? ""}
          role={role}
          onSignOut={onSignOut}
        />
      )}
    </aside>
  );
}

/** Mobil (<1024px) HeroUI Drawer. */
function MobileSidebar({
  role,
  activeModuleKeys,
  userName,
  userEmail,
  onSignOut,
}: {
  role: Role;
  activeModuleKeys?: string[];
  userName?: string;
  userEmail?: string;
  onSignOut?: () => Promise<void>;
}) {
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
          <div className="flex h-full flex-col">
            <DrawerHeader className="flex flex-col items-start px-0 pb-0">
              <Brand />
            </DrawerHeader>
            <DrawerBody className="flex-1 overflow-y-auto px-0">
              <SidebarContent
                role={role}
                activeModuleKeys={activeModuleKeys}
                onNavigate={onClose}
              />
            </DrawerBody>
            {userName && onSignOut && (
              <SidebarUserFooter
                name={userName}
                email={userEmail ?? ""}
                role={role}
                onSignOut={onSignOut}
                onNavigate={onClose}
              />
            )}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

/** Topbar'daki mobil menü butonu. */
function SidebarTrigger() {
  const { setMobileOpen } = useSidebar();
  const tSidebar = useTranslations("sidebar");
  return (
    <Button
      isIconOnly
      variant="light"
      size="sm"
      aria-label={tSidebar.has("openMobile") ? tSidebar("openMobile") : "Menüyü aç"}
      className="lg:hidden"
      onPress={() => setMobileOpen(true)}
    >
      <MenuIcon className="h-5 w-5" />
    </Button>
  );
}

export { SidebarProvider, DesktopSidebar, MobileSidebar, SidebarTrigger };
