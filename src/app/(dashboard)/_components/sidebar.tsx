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
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { registry } from "@/registry";
import { ROLE_COLORS, type Role } from "@/shared/roles";
import { can } from "@/shared/permissions/define";
import {
  MODULE_HOME_KEY,
  findActiveKey,
  findActiveModule,
  hasModuleMenu,
  moduleHome,
  moduleMenuItems,
} from "@/shared/navigation/module-nav";
import type { ModuleConfig, NavItem, PermissionRequirement } from "@/shared/types/module";
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

type MenuLink = {
  key: string;
  href: string;
  label: string;
  icon: LucideIcon;
  isDownload?: boolean;
};

/**
 * Sol panel içeriği: ana menü ⇄ modül menüsü.
 *
 * KARAR: Alt menüsü (ModuleConfig.menu) olan bir modüle girildiğinde ana menü kayarak
 * modülün menüsüne dönüşür; en üstte "Ana menü" butonu olur. Ana menüye dönüldüğünde sayfa
 * değişmez ve en üstte modüle geri dönme butonu çıkar. Görünüm adresten türetilir; kullanıcının
 * seçimi yalnızca adres değişene kadar geçerlidir (sayfa değişince menü yine adrese uyar).
 */
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
  const searchParams = useSearchParams();
  const tNav = useTranslations("nav");
  const tSidebar = useTranslations("sidebar");
  const tRoot = useTranslations();

  const allowed = (permission: PermissionRequirement) =>
    can(role, permission.definition, permission.action);

  // Yalnızca aktif olan ve kullanıcının görebildiği modüller
  const modules = (activeModuleKeys ? registry.filter((m) => activeModuleKeys.includes(m.key)) : registry).filter(
    (mod) => mod.nav.some((item) => allowed(item.permission)),
  );

  // Menü yetkiye göre süzülür ve group + order ile sıralanır (7.4, 8. bölüm).
  const visibleItems = [...modules.flatMap((mod) => mod.nav), PANEL_ITEM]
    .filter((item) => allowed(item.permission))
    .sort((a, b) => (a.group === b.group ? a.order - b.order : a.group === "main" ? -1 : 1));
  const mainItems = visibleItems.filter((item) => item.group === "main");
  const settingsItems = visibleItems.filter((item) => item.group === "settings");
  const activeMainHref = findActiveKey(visibleItems, (item) => item.href, pathname, searchParams);

  const routeModule = findActiveModule(modules, pathname, searchParams);
  const routeModuleKey = routeModule && hasModuleMenu(routeModule) ? routeModule.key : null;

  // null: adrese uy; "main": ana menü; diğer: o modülün menüsü (tıklama anında, gezinme bitmeden).
  const [override, setOverride] = useState<string | null>(null);
  const [overridePath, setOverridePath] = useState(pathname);
  if (overridePath !== pathname) {
    setOverridePath(pathname);
    setOverride(null);
  }
  const shownModuleKey = override === "main" ? null : (override ?? routeModuleKey);
  const shownModule = shownModuleKey ? modules.find((mod) => mod.key === shownModuleKey) : undefined;

  const navLabel = (item: NavItem): string => {
    if (item.labelKey && tNav.has(item.labelKey)) return tNav(item.labelKey);
    return item.label;
  };
  const moduleLabel = (mod: ModuleConfig): string => {
    const home = moduleHome(mod);
    return home ? navLabel(home) : mod.label;
  };
  const moduleNavKey = new Map(modules.map((mod) => [moduleHome(mod)?.href, mod]));

  const moduleLinks: MenuLink[] = shownModule
    ? moduleMenuItems(shownModule)
        .filter((item) => allowed(item.permission ?? moduleHome(shownModule)!.permission))
        .map((item) => {
          const key = item.key === MODULE_HOME_KEY ? "sidebar.overview" : `${shownModule.key}.menu.${item.key}`;
          return { ...item, label: tRoot.has(key) ? tRoot(key) : item.label };
        })
    : [];
  const activeModuleLink = findActiveKey(moduleLinks, (item) => item.key, pathname, searchParams);

  const itemClass = (active: boolean) =>
    cn(
      "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-small font-medium transition-all duration-150",
      active
        ? "bg-primary-50 text-primary-700 shadow-xs dark:bg-primary-500/15 dark:text-primary-300 font-semibold"
        : "text-default-600 hover:bg-default-100/80 hover:text-foreground",
    );

  const renderLink = (link: MenuLink, active: boolean, onClick?: () => void) => {
    const Icon = link.icon;
    const content = (
      <>
        {active && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary" aria-hidden />
        )}
        <Icon
          className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            active ? "text-primary" : "text-default-400 group-hover:text-default-600",
          )}
          aria-hidden
        />
        <span className="truncate">{link.label}</span>
      </>
    );
    // İndirme bağlantıları API rotasıdır: istemci yönlendirmesi yapılmaz.
    if (link.isDownload) {
      return (
        <a key={link.key} href={link.href} className={itemClass(false)}>
          {content}
        </a>
      );
    }
    return (
      <Link
        key={link.key}
        href={link.href}
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={itemClass(active)}
      >
        {content}
      </Link>
    );
  };

  const renderMainItem = (item: NavItem) => {
    const mod = moduleNavKey.get(item.href);
    const drillsDown = mod ? hasModuleMenu(mod) : false;
    return renderLink(
      { key: item.href, href: item.href, label: navLabel(item), icon: item.icon },
      item.href === activeMainHref,
      // Alt menüsü olan modülde panel modül menüsüne geçer (mobil çekmece açık kalır).
      drillsDown && mod ? () => setOverride(mod.key) : onNavigate,
    );
  };

  const switchButtonClass =
    "flex w-full items-center gap-2 rounded-lg border border-default-200/80 bg-default-50 px-3 py-2 text-small font-medium text-default-600 transition-colors hover:bg-default-100 hover:text-foreground";

  const returnModule = !shownModule && routeModuleKey ? modules.find((m) => m.key === routeModuleKey) : undefined;

  return (
    <div className="grid overflow-x-hidden">
      {/* Ana menü */}
      <nav
        aria-label={tSidebar.has("mainMenu") ? tSidebar("mainMenu") : "Ana menü"}
        aria-hidden={shownModule ? true : undefined}
        inert={shownModule ? true : undefined}
        className={cn(
          "col-start-1 row-start-1 flex flex-col gap-5 px-3 py-4 transition-[translate,opacity] duration-200 ease-out",
          shownModule ? "pointer-events-none -translate-x-full opacity-0" : "translate-x-0 opacity-100",
        )}
      >
        {returnModule ? (
          <button type="button" className={switchButtonClass} onClick={() => setOverride(null)}>
            <span className="truncate">
              {tSidebar.has("backToModule")
                ? tSidebar("backToModule", { module: moduleLabel(returnModule) })
                : moduleLabel(returnModule)}
            </span>
            <ChevronRight className="ml-auto h-4 w-4 shrink-0" aria-hidden />
          </button>
        ) : null}
        <div className="flex flex-col gap-1">{mainItems.map(renderMainItem)}</div>
        {settingsItems.length > 0 ? (
          <div className="flex flex-col gap-1 pt-2">
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-default-400">
              {tSidebar.has("settings") ? tSidebar("settings") : "Ayarlar"}
            </p>
            {settingsItems.map(renderMainItem)}
          </div>
        ) : null}
      </nav>

      {/* Modül menüsü */}
      <nav
        aria-label={shownModule ? moduleLabel(shownModule) : undefined}
        aria-hidden={shownModule ? undefined : true}
        inert={shownModule ? undefined : true}
        className={cn(
          "col-start-1 row-start-1 flex flex-col gap-4 px-3 py-4 transition-[translate,opacity] duration-200 ease-out",
          shownModule ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-full opacity-0",
        )}
      >
        {shownModule ? (
          <>
            <button type="button" className={switchButtonClass} onClick={() => setOverride("main")}>
              <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">{tSidebar.has("backToMain") ? tSidebar("backToMain") : "Ana menü"}</span>
            </button>
            <div className="flex items-center gap-2 px-3">
              {(() => {
                const ModuleIcon = moduleHome(shownModule)?.icon;
                return ModuleIcon ? <ModuleIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden /> : null;
              })()}
              <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-default-500">
                {moduleLabel(shownModule)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {moduleLinks.map((link) => renderLink(link, link.key === activeModuleLink, onNavigate))}
            </div>
          </>
        ) : null}
      </nav>
    </div>
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
  const tRoles = useTranslations("roles");
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
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
              {tRoles(role)}
            </Chip>
          </button>
        </DropdownTrigger>
        <DropdownMenu aria-label={tSidebar.has("userActions") ? tSidebar("userActions") : "Kullanıcı işlemleri"}>
          <DropdownItem key="identity" isReadOnly showDivider>
            <div className="flex flex-col gap-1 py-1">
              <p className="text-small font-semibold text-foreground">{name}</p>
              <p className="text-tiny text-default-500">{email}</p>
              <Chip color={ROLE_COLORS[role]} size="sm" variant="flat" className="mt-1 self-start">
                {tRoles(role)}
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
            {tCommon("signOut")}
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

/** Mobil (<1024px) üst şerit: yalnızca menü butonu ve marka. Masaüstünde üst bar yoktur. */
function MobileHeader() {
  const tSidebar = useTranslations("sidebar");
  return (
    <header className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b border-default-200/80 bg-background/85 px-3 backdrop-blur-md lg:hidden">
      <SidebarTrigger />
      <Building2 className="h-4 w-4 text-primary" aria-hidden />
      <span className="truncate text-small font-semibold text-foreground">
        Dernek ERP{tSidebar.has("brand") ? ` · ${tSidebar("brand")}` : ""}
      </span>
    </header>
  );
}

/** Mobil üst şeritteki menü butonu. */
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

export { SidebarProvider, DesktopSidebar, MobileSidebar, MobileHeader };
