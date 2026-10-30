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
  Tooltip,
} from "@heroui/react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  PanelLeftClose,
  PanelLeftOpen,
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

import { SIDEBAR_COLLAPSED_COOKIE } from "./sidebar-state";

type SidebarContextValue = {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  /** Masaüstü panel ikon şeridine daraltıldı mı (mobil çekmeceyi etkilemez). */
  collapsed: boolean;
  toggleCollapsed: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);


function SidebarProvider({
  children,
  initialCollapsed = false,
}: {
  children: ReactNode;
  initialCollapsed?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COLLAPSED_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  };
  return (
    <SidebarContext.Provider value={{ mobileOpen, setMobileOpen, collapsed, toggleCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar yalnızca SidebarProvider içinde kullanılabilir."); // i18n-ignore (geliştirici hatası; kullanıcıya gösterilmez)
  return ctx;
}

/** Ürün adı (marka; çevrilmez). */
const BRAND = "Dernek ERP"; // i18n-ignore

/** Sidebar'da sabit "Panel" öğesi (yetki gerektirmez). */
const PANEL_ITEM: NavItem = {
  href: "/",
  label: "Panel", // i18n-ignore (yedek; çeviri nav.panel)
  labelKey: "panel",
  icon: LayoutDashboard,
  group: "main",
  order: 0,
  permission: {
    definition: {
      resource: "panel",
      grants: { ADMIN: ["view"], BOARD: ["view"], SECRETARY: ["view"], VIEWER: ["view"], TREASURER: ["view"], AUDITOR: ["view"], TEACHER: ["view"] },
    },
    action: "view",
  },
};

/** Ayar sayfalarını toplayan sanal modülün anahtarı (registry'de yoktur). */
const SETTINGS_KEY = "_settings";

/**
 * "settings" grubundaki nav öğelerinden sanal bir modül kurar: ana sayfası "/ayarlar" (yoksa ilk öğe),
 * menüsü diğer ayar sayfaları. Görünür ayar sayfası yoksa null.
 */
function buildSettingsModule(items: NavItem[]): { module: ModuleConfig; hub: NavItem; items: NavItem[] } | null {
  if (items.length === 0) return null;
  const hub = items.find((item) => item.href === "/ayarlar") ?? items[0];
  const pages = items.filter((item) => item !== hub);
  return {
    hub,
    items,
    module: {
      key: SETTINGS_KEY,
      label: hub.label,
      category: "CORE",
      nav: [hub],
      menu: pages.map((item) => ({
        key: item.href,
        label: item.label,
        href: item.href,
        icon: item.icon,
        permission: item.permission,
      })),
    },
  };
}

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
  collapsed = false,
}: {
  role: Role;
  activeModuleKeys?: string[];
  onNavigate?: () => void;
  /** İkon şeridi: etiketler gizlenir, ipucu (tooltip) olarak gösterilir. */
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tNav = useTranslations("nav");
  const tSidebar = useTranslations("sidebar");
  const tRoot = useTranslations();

  const allowed = (permission: PermissionRequirement) =>
    can(role, permission.definition, permission.action);

  // Yalnızca aktif olan ve kullanıcının görebildiği modüller
  const visibleModules = (activeModuleKeys ? registry.filter((m) => activeModuleKeys.includes(m.key)) : registry).filter(
    (mod) => mod.nav.some((item) => allowed(item.permission)),
  );

  // Menü yetkiye göre süzülür ve group + order ile sıralanır (7.4, 8. bölüm).
  const visibleItems = [...visibleModules.flatMap((mod) => mod.nav), PANEL_ITEM]
    .filter((item) => allowed(item.permission))
    .sort((a, b) => (a.group === b.group ? a.order - b.order : a.group === "main" ? -1 : 1));
  const mainItems = visibleItems.filter((item) => item.group === "main");

  // KARAR: "settings" grubundaki tüm sayfalar ana menüde tek "Ayarlar" girişinde toplanır; girişe
  // tıklanınca panel, modül menüsü gibi ayar sayfalarının menüsüne geçer.
  const settings = buildSettingsModule(visibleItems.filter((item) => item.group === "settings"));
  const modules = [
    ...(settings ? [settings.module] : []),
    ...visibleModules.filter((mod) => mod.nav.some((item) => item.group === "main") || hasModuleMenu(mod)),
  ];
  // Herhangi bir ayar sayfasındayken ana menüdeki "Ayarlar" girişi aktiftir.
  const activeMainKey = findActiveKey(
    [...mainItems, ...(settings?.items ?? [])],
    (item) => (item.group === "settings" ? SETTINGS_KEY : item.href),
    pathname,
    searchParams,
  );
  const activeMainHref = activeMainKey === SETTINGS_KEY ? settings?.hub.href : activeMainKey;

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
          if (shownModule.key === SETTINGS_KEY && item.key !== MODULE_HOME_KEY) {
            return { ...item, label: navLabel(settings!.items.find((nav) => nav.href === item.href)!) };
          }
          const key = item.key === MODULE_HOME_KEY ? "sidebar.overview" : `${shownModule.key}.menu.${item.key}`;
          return { ...item, label: tRoot.has(key) ? tRoot(key) : item.label };
        })
    : [];
  const activeModuleLink = findActiveKey(moduleLinks, (item) => item.key, pathname, searchParams);

  const itemClass = (active: boolean) =>
    cn(
      "group relative flex items-center gap-3 rounded-lg py-2.5 text-small font-medium transition-all duration-150",
      collapsed ? "justify-center px-0" : "px-3",
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
        <span className={collapsed ? "sr-only" : "truncate"}>{link.label}</span>
      </>
    );
    // İndirme bağlantıları API rotasıdır: istemci yönlendirmesi yapılmaz.
    const element = link.isDownload ? (
      <a key={link.key} href={link.href} className={itemClass(false)}>
        {content}
      </a>
    ) : (
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
    return withTooltip(link.key, link.label, element);
  };

  /** Daraltılmış panelde etiket, öğenin sağında ipucu olarak görünür. */
  const withTooltip = (key: string, label: string, element: ReactNode) =>
    collapsed ? (
      <Tooltip key={key} content={label} placement="right" delay={300} closeDelay={0}>
        {element}
      </Tooltip>
    ) : (
      element
    );

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

  const switchButtonClass = cn(
    "flex w-full items-center gap-2 rounded-lg border border-default-200/80 bg-default-50 py-2 text-small font-medium text-default-600 transition-colors hover:bg-default-100 hover:text-foreground",
    collapsed ? "justify-center px-0" : "px-3",
  );

  const returnModule = !shownModule && routeModuleKey ? modules.find((m) => m.key === routeModuleKey) : undefined;

  return (
    <div className="grid overflow-x-hidden">
      {/* Ana menü */}
      <nav
        aria-label={tSidebar.has("mainMenu") ? tSidebar("mainMenu") : "Ana menü"}
        aria-hidden={shownModule ? true : undefined}
        inert={shownModule ? true : undefined}
        className={cn(
          "col-start-1 row-start-1 flex flex-col gap-5 py-4 transition-[translate,opacity] duration-200 ease-out",
          collapsed ? "px-2" : "px-3",
          shownModule ? "pointer-events-none -translate-x-full opacity-0" : "translate-x-0 opacity-100",
        )}
      >
        {returnModule
          ? (() => {
              const label = tSidebar.has("backToModule")
                ? tSidebar("backToModule", { module: moduleLabel(returnModule) })
                : moduleLabel(returnModule);
              return withTooltip(
                "back-to-module",
                label,
                <button
                  type="button"
                  className={switchButtonClass}
                  aria-label={collapsed ? label : undefined}
                  onClick={() => setOverride(null)}
                >
                  {collapsed ? null : <span className="truncate">{label}</span>}
                  <ChevronRight className={cn("h-4 w-4 shrink-0", !collapsed && "ml-auto")} aria-hidden />
                </button>,
              );
            })()
          : null}
        <div className="flex flex-col gap-1">{mainItems.map(renderMainItem)}</div>
        {settings ? (
          <div className="flex flex-col gap-1 border-t border-default-200/80 pt-3">
            {renderMainItem(settings.hub)}
          </div>
        ) : null}
      </nav>

      {/* Modül menüsü */}
      <nav
        aria-label={shownModule ? moduleLabel(shownModule) : undefined}
        aria-hidden={shownModule ? undefined : true}
        inert={shownModule ? undefined : true}
        className={cn(
          "col-start-1 row-start-1 flex flex-col gap-4 py-4 transition-[translate,opacity] duration-200 ease-out",
          collapsed ? "px-2" : "px-3",
          shownModule ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-full opacity-0",
        )}
      >
        {shownModule ? (
          <>
            {withTooltip(
              "back-to-main",
              tSidebar("backToMain"),
              <button
                type="button"
                className={switchButtonClass}
                aria-label={collapsed ? tSidebar("backToMain") : undefined}
                onClick={() => setOverride("main")}
              >
                <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
                {collapsed ? null : <span className="truncate">{tSidebar("backToMain")}</span>}
              </button>,
            )}
            {/* Daraltılmışken başlık ikonu ilk bağlantıyla karışır: yerine ayraç (ad ekran okuyucuda kalır). */}
            {collapsed ? <hr className="mx-2 border-default-200/80" aria-hidden /> : null}
            <div className={cn("flex items-center gap-2", collapsed ? "sr-only" : "px-3")}>
              {(() => {
                const ModuleIcon = moduleHome(shownModule)?.icon;
                return ModuleIcon ? <ModuleIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden /> : null;
              })()}
              <span
                className={
                  collapsed
                    ? "sr-only"
                    : "truncate text-[11px] font-semibold uppercase tracking-wider text-default-500"
                }
              >
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

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  const tSidebar = useTranslations("sidebar");
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-default-200/80 py-4",
        collapsed ? "justify-center px-2" : "px-5",
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
        <Building2 className="h-5 w-5" aria-hidden />
      </div>
      <div className={collapsed ? "sr-only" : "flex flex-col min-w-0"}>
        <span className="text-small font-bold tracking-tight text-foreground truncate">{BRAND}</span>
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
  collapsed = false,
}: {
  name: string;
  email: string;
  role: Role;
  onSignOut: () => Promise<void>;
  onNavigate?: () => void;
  collapsed?: boolean;
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
    <div className={cn("border-t border-default-200/80 bg-default-50/50 shrink-0", collapsed ? "p-2" : "p-3")}>
      <Dropdown placement={collapsed ? "right-end" : "top-start"}>
        <DropdownTrigger>
          <button
            type="button"
            className={cn(
              "group flex w-full items-center gap-2.5 rounded-xl text-left transition-all duration-150 hover:bg-default-100/90 cursor-pointer",
              collapsed ? "justify-center p-1" : "p-2",
            )}
            aria-label={tSidebar.has("userMenu") ? tSidebar("userMenu") : "Kullanıcı menüsü"}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold text-small shadow-xs group-hover:scale-105 transition-transform">
              {initials || "?"}
            </div>
            {collapsed ? null : (
              <>
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
              </>
            )}
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

/** Masaüstü sabit sidebar: 256px; daraltılınca 72px ikon şeridi (tercih çerezde). */
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
  const { collapsed, toggleCollapsed } = useSidebar();
  const tSidebar = useTranslations("sidebar");
  const toggleLabel = collapsed ? tSidebar("expand") : tSidebar("collapse");
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-default-200/80 bg-background/95 backdrop-blur-sm transition-[width] duration-200 ease-out lg:flex",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      <Brand collapsed={collapsed} />
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <SidebarContent role={role} activeModuleKeys={activeModuleKeys} collapsed={collapsed} />
      </div>
      <div className={cn("flex px-2 pb-2", collapsed ? "justify-center" : "justify-end")}>
        <Tooltip content={toggleLabel} placement="right" delay={300} closeDelay={0}>
          <Button
            isIconOnly
            size="sm"
            variant="light"
            aria-label={toggleLabel}
            aria-expanded={!collapsed}
            onPress={toggleCollapsed}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4 text-default-500" aria-hidden />
            ) : (
              <PanelLeftClose className="h-4 w-4 text-default-500" aria-hidden />
            )}
          </Button>
        </Tooltip>
      </div>
      {userName && onSignOut && (
        <SidebarUserFooter
          name={userName}
          email={userEmail ?? ""}
          role={role}
          onSignOut={onSignOut}
          collapsed={collapsed}
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
        {BRAND}{tSidebar.has("brand") ? ` · ${tSidebar("brand")}` : ""}
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
