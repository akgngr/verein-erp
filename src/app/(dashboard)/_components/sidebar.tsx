"use client";

import { Button, Drawer, Dropdown, Label, Tooltip } from "@heroui-v3/react";
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
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";

import { registry } from "@/registry";
import { RoleChip } from "@/shared/components/roles/roles-provider";
import type { Role } from "@/shared/roles";
import { can } from "@/shared/permissions/define";
import {
  MODULE_HOME_KEY,
  findActiveKey,
  findActiveModule,
  hasModuleMenu,
  moduleHome,
  moduleMenuItems,
} from "@/shared/navigation/module-nav";
import type {
  ModuleConfig,
  NavItem,
  PermissionRequirement,
} from "@/shared/types/module";
import {
  SIDE_PANEL_EVENT,
  type SidePanelEventDetail,
} from "@/shared/components/side-panel-events";
import { cn } from "@/shared/utils";

import { ThemeMenu } from "./workspace-header";
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
  // Sağ yan panel açılınca menü geçici olarak daralır (çerez yazılmaz), kapanınca eski hâline döner.
  const beforePanel = useRef<boolean | null>(null);
  const collapsedRef = useRef(collapsed);
  useEffect(() => {
    collapsedRef.current = collapsed;
  }, [collapsed]);
  useEffect(() => {
    const onPanel = (event: Event) => {
      const { open } = (event as CustomEvent<SidePanelEventDetail>).detail;
      if (open && beforePanel.current === null) {
        beforePanel.current = collapsedRef.current;
        setCollapsed(true);
      } else if (!open && beforePanel.current !== null) {
        setCollapsed(beforePanel.current);
        beforePanel.current = null;
      }
    };
    window.addEventListener(SIDE_PANEL_EVENT, onPanel);
    return () => window.removeEventListener(SIDE_PANEL_EVENT, onPanel);
  }, []);
  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COLLAPSED_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  };
  return (
    <SidebarContext.Provider
      value={{ mobileOpen, setMobileOpen, collapsed, toggleCollapsed }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("SIDEBAR_PROVIDER_REQUIRED");
  return ctx;
}

/** Ürün adı (marka; çevrilmez). */
const USER_MENU_PLACEMENT = {
  collapsed: "right bottom",
  expanded: "top start",
} as const;
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
      grants: {
        ADMIN: ["view"],
        BOARD: ["view"],
        SECRETARY: ["view"],
        VIEWER: ["view"],
        TREASURER: ["view"],
        AUDITOR: ["view"],
        TEACHER: ["view"],
      },
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
function buildSettingsModule(
  items: NavItem[],
): { module: ModuleConfig; hub: NavItem; items: NavItem[] } | null {
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
  const visibleModules = (
    activeModuleKeys
      ? registry.filter((m) => activeModuleKeys.includes(m.key))
      : registry
  ).filter((mod) => mod.nav.some((item) => allowed(item.permission)));

  // Menü yetkiye göre süzülür ve group + order ile sıralanır (7.4, 8. bölüm).
  const visibleItems = [
    ...visibleModules.flatMap((mod) => mod.nav.filter((item) => !item.hidden)),
    PANEL_ITEM,
  ]
    .filter((item) => allowed(item.permission))
    .sort((a, b) =>
      a.group === b.group ? a.order - b.order : a.group === "main" ? -1 : 1,
    );
  const mainItems = visibleItems.filter((item) => item.group === "main");

  // KARAR: "settings" grubundaki tüm sayfalar ana menüde tek "Ayarlar" girişinde toplanır; girişe
  // tıklanınca panel, modül menüsü gibi ayar sayfalarının menüsüne geçer.
  const settings = buildSettingsModule(
    visibleItems.filter((item) => item.group === "settings"),
  );
  const modules = [
    ...(settings ? [settings.module] : []),
    ...visibleModules.filter(
      (mod) =>
        mod.nav.some((item) => item.group === "main") || hasModuleMenu(mod),
    ),
  ];
  // Herhangi bir ayar sayfasındayken ana menüdeki "Ayarlar" girişi aktiftir.
  const activeMainKey = findActiveKey(
    [...mainItems, ...(settings?.items ?? [])],
    (item) => (item.group === "settings" ? SETTINGS_KEY : item.href),
    pathname,
    searchParams,
  );
  const activeMainHref =
    activeMainKey === SETTINGS_KEY ? settings?.hub.href : activeMainKey;

  const routeModule = findActiveModule(modules, pathname, searchParams);
  const routeModuleKey =
    routeModule && hasModuleMenu(routeModule) ? routeModule.key : null;

  // null: adrese uy; "main": ana menü; diğer: o modülün menüsü (tıklama anında, gezinme bitmeden).
  const [override, setOverride] = useState<string | null>(null);
  const [overridePath, setOverridePath] = useState(pathname);
  if (overridePath !== pathname) {
    setOverridePath(pathname);
    setOverride(null);
  }
  const shownModuleKey =
    override === "main" ? null : (override ?? routeModuleKey);
  const shownModule = shownModuleKey
    ? modules.find((mod) => mod.key === shownModuleKey)
    : undefined;

  const navLabel = (item: NavItem): string => {
    if (item.labelKey && tNav.has(item.labelKey)) return tNav(item.labelKey);
    return item.label;
  };
  const moduleLabel = (mod: ModuleConfig): string => {
    const home = moduleHome(mod);
    return home ? navLabel(home) : mod.label;
  };
  const moduleNavKey = new Map(
    modules.map((mod) => [moduleHome(mod)?.href, mod]),
  );

  const moduleLinks: MenuLink[] = shownModule
    ? moduleMenuItems(shownModule)
        .filter((item) =>
          allowed(item.permission ?? moduleHome(shownModule)!.permission),
        )
        .filter(
          (item) =>
            !item.module ||
            !activeModuleKeys ||
            activeModuleKeys.includes(item.module),
        )
        .map((item) => {
          if (
            shownModule.key === SETTINGS_KEY &&
            item.key !== MODULE_HOME_KEY
          ) {
            return {
              ...item,
              label: navLabel(
                settings!.items.find((nav) => nav.href === item.href)!,
              ),
            };
          }
          const key =
            item.key === MODULE_HOME_KEY
              ? "sidebar.overview"
              : `${shownModule.key}.menu.${item.key}`;
          return { ...item, label: tRoot.has(key) ? tRoot(key) : item.label };
        })
    : [];
  const activeModuleLink = findActiveKey(
    moduleLinks,
    (item) => item.key,
    pathname,
    searchParams,
  );

  const itemClass = (active: boolean) =>
    cn(
      "group relative flex items-center gap-3 rounded-lg py-2.5 text-[13px] font-medium transition-colors duration-150",
      collapsed ? "justify-center px-0" : "px-3.5",
      active
        ? "bg-[#e7f1e9] font-semibold text-[#173e27] shadow-sm"
        : "text-[#b9c9be] hover:bg-white/[0.07] hover:text-white",
    );

  const renderLink = (
    link: MenuLink,
    active: boolean,
    onClick?: () => void,
  ) => {
    const Icon = link.icon;
    const content = (
      <>
        <Icon
          className={cn(
            "h-[18px] w-[18px] shrink-0 transition-colors",
            active
              ? "text-primary-700"
              : "text-white/65 group-hover:text-white",
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
    if (!collapsed) return element;
    return (
      <Tooltip key={link.key} delay={300} closeDelay={0}>
        <Tooltip.Trigger<"a">
          role={undefined}
          className={itemClass(active)}
          render={(props) =>
            link.isDownload ? (
              <a {...props} href={link.href}>
                {content}
              </a>
            ) : (
              <Link
                {...props}
                href={link.href}
                onClick={onClick}
                aria-current={active ? "page" : undefined}
              >
                {content}
              </Link>
            )
          }
        />
        <Tooltip.Content placement="right">{link.label}</Tooltip.Content>
      </Tooltip>
    );
  };

  /** Daraltılmış panelde etiket, öğenin sağında ipucu olarak görünür. */
  const withTooltip = (key: string, label: string, element: ReactNode) =>
    collapsed ? (
      <Tooltip key={key} delay={300} closeDelay={0}>
        {element}
        <Tooltip.Content placement="right">{label}</Tooltip.Content>
      </Tooltip>
    ) : (
      element
    );

  const renderMainItem = (item: NavItem) => {
    const mod = moduleNavKey.get(item.href);
    const drillsDown = mod ? hasModuleMenu(mod) : false;
    return renderLink(
      {
        key: item.href,
        href: item.href,
        label: navLabel(item),
        icon: item.icon,
      },
      item.href === activeMainHref,
      // Alt menüsü olan modülde panel modül menüsüne geçer (mobil çekmece açık kalır).
      drillsDown && mod ? () => setOverride(mod.key) : onNavigate,
    );
  };

  const switchButtonClass = cn(
    "flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-2 text-small font-medium text-white/90 transition-colors hover:bg-white/[0.08] hover:text-white",
    collapsed ? "justify-center px-0" : "px-3",
  );

  const returnModule =
    !shownModule && routeModuleKey
      ? modules.find((m) => m.key === routeModuleKey)
      : undefined;

  return (
    <div className="grid overflow-x-hidden">
      {/* Ana menü */}
      <nav
        aria-label={
          tSidebar.has("mainMenu") ? tSidebar("mainMenu") : "Ana menü"
        }
        aria-hidden={shownModule ? true : undefined}
        inert={shownModule ? true : undefined}
        className={cn(
          "col-start-1 row-start-1 flex flex-col gap-5 py-4 transition-[translate,opacity] duration-200 ease-out",
          collapsed ? "px-2" : "px-3",
          shownModule
            ? "pointer-events-none -translate-x-full opacity-0"
            : "translate-x-0 opacity-100",
        )}
      >
        {returnModule
          ? (() => {
              const label = tSidebar.has("backToModule")
                ? tSidebar("backToModule", {
                    module: moduleLabel(returnModule),
                  })
                : moduleLabel(returnModule);
              return withTooltip(
                "back-to-module",
                label,
                <Button
                  variant="tertiary"
                  className={switchButtonClass}
                  aria-label={collapsed ? label : undefined}
                  onPress={() => setOverride(null)}
                >
                  {collapsed ? null : <span className="truncate">{label}</span>}
                  <ChevronRight
                    className={cn("h-4 w-4 shrink-0", !collapsed && "ml-auto")}
                    aria-hidden
                  />
                </Button>,
              );
            })()
          : null}
        <div className="flex flex-col gap-1">
          {mainItems.map(renderMainItem)}
        </div>
        {settings ? (
          <div className="flex flex-col gap-1 border-t border-white/15 pt-3">
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
          shownModule
            ? "translate-x-0 opacity-100"
            : "pointer-events-none translate-x-full opacity-0",
        )}
      >
        {shownModule ? (
          <>
            {withTooltip(
              "back-to-main",
              tSidebar("backToMain"),
              <Button
                variant="tertiary"
                className={switchButtonClass}
                aria-label={collapsed ? tSidebar("backToMain") : undefined}
                onPress={() => setOverride("main")}
              >
                <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
                {collapsed ? null : (
                  <span className="truncate">{tSidebar("backToMain")}</span>
                )}
              </Button>,
            )}
            {/* Daraltılmışken başlık ikonu ilk bağlantıyla karışır: yerine ayraç (ad ekran okuyucuda kalır). */}
            {collapsed ? (
              <hr className="mx-2 border-white/15" aria-hidden />
            ) : null}
            <div
              className={cn(
                "flex items-center gap-2",
                collapsed ? "sr-only" : "px-3.5",
              )}
            >
              {(() => {
                const ModuleIcon = moduleHome(shownModule)?.icon;
                return ModuleIcon ? (
                  <ModuleIcon
                    className="h-4 w-4 shrink-0 text-white/80"
                    aria-hidden
                  />
                ) : null;
              })()}
              <span
                className={
                  collapsed
                    ? "sr-only"
                    : "truncate text-[11px] font-semibold uppercase tracking-wider text-[#a9bcae]"
                }
              >
                {moduleLabel(shownModule)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {moduleLinks.map((link) =>
                renderLink(link, link.key === activeModuleLink, onNavigate),
              )}
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
        "mx-3 flex items-center gap-3 border-b border-white/10 py-5",
        collapsed ? "justify-center px-0" : "px-2",
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e7f1e9] text-[#285a3c]">
        <Building2 className="h-5 w-5" aria-hidden />
      </div>
      <div className={collapsed ? "sr-only" : "flex flex-col min-w-0"}>
        <span className="text-[15px] font-semibold tracking-tight text-white truncate">
          {BRAND}
        </span>
        <span className="text-[11px] font-medium text-[#a9bcae] leading-none truncate">
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
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const tSidebar = useTranslations("sidebar");
  const initials = name
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");

  return (
    <div
      className={cn(
        "mx-3 border-t border-white/15 shrink-0",
        collapsed ? "p-2" : "p-3",
      )}
    >
      <Dropdown>
        <Dropdown.Trigger
          type="button"
          className={cn(
            "group flex w-full items-center gap-2.5 rounded-xl text-left transition-all duration-150 hover:bg-white/10 cursor-pointer",
            collapsed ? "justify-center p-1" : "p-2",
          )}
          aria-label={
            tSidebar.has("userMenu") ? tSidebar("userMenu") : "Kullanıcı menüsü"
          }
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white ring-1 ring-white/15 font-semibold text-small transition-colors">
            {initials || "?"}
          </div>
          {collapsed ? null : (
            <>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-small font-semibold text-white leading-tight">
                  {name}
                </span>
                <span className="truncate text-tiny text-[#a9bcae] leading-tight">
                  {email}
                </span>
              </div>
              <RoleChip
                role={role}
                className="h-5 shrink-0 bg-white/15 text-[10px] text-white"
              />
            </>
          )}
        </Dropdown.Trigger>
        <Dropdown.Popover
          placement={
            collapsed
              ? USER_MENU_PLACEMENT.collapsed
              : USER_MENU_PLACEMENT.expanded
          }
        >
          <Dropdown.Menu
            aria-label={
              tSidebar.has("userActions")
                ? tSidebar("userActions")
                : "Kullanıcı işlemleri"
            }
          >
            <Dropdown.Item
              id="profile"
              textValue={tNav.has("profil") ? tNav("profil") : "Profil"}
              href="/profil"
              onAction={onNavigate}
            >
              <UserRound className="h-4 w-4 text-default-500" aria-hidden />
              <Label>{tNav.has("profil") ? tNav("profil") : "Profil"}</Label>
            </Dropdown.Item>
            <Dropdown.Item
              id="settings"
              textValue={tNav.has("ayarlar") ? tNav("ayarlar") : "Ayarlar"}
              href="/ayarlar"
              onAction={onNavigate}
            >
              <Settings className="h-4 w-4 text-default-500" aria-hidden />
              <Label>{tNav.has("ayarlar") ? tNav("ayarlar") : "Ayarlar"}</Label>
            </Dropdown.Item>
            <Dropdown.Item
              id="logout"
              textValue={tCommon("signOut")}
              variant="danger"
              className="text-danger"
              onAction={() => void onSignOut()}
            >
              <LogOut className="h-4 w-4" aria-hidden />
              <Label>{tCommon("signOut")}</Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
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
        "sidebar-surface sticky top-0 hidden h-dvh shrink-0 flex-col transition-[width] duration-200 ease-out lg:flex",
        collapsed ? "w-[72px]" : "w-[252px]",
      )}
    >
      <Brand collapsed={collapsed} />
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <SidebarContent
          role={role}
          activeModuleKeys={activeModuleKeys}
          collapsed={collapsed}
        />
      </div>
      <div
        className={cn(
          "flex px-2 pb-2",
          collapsed ? "justify-center" : "justify-end",
        )}
      >
        <Tooltip delay={300} closeDelay={0}>
          <Button
            isIconOnly
            size="sm"
            variant="tertiary"
            className="bg-transparent text-white/70 hover:bg-white/10 data-[hovered]:bg-white/10"
            aria-label={toggleLabel}
            aria-expanded={!collapsed}
            onPress={toggleCollapsed}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4 text-white/70" aria-hidden />
            ) : (
              <PanelLeftClose className="h-4 w-4 text-white/70" aria-hidden />
            )}
          </Button>
          <Tooltip.Content placement="right">{toggleLabel}</Tooltip.Content>
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
    <Drawer>
      <Drawer.Backdrop isOpen={mobileOpen} onOpenChange={setMobileOpen}>
        <Drawer.Content placement="left">
          <Drawer.Dialog
            aria-label={BRAND}
            className="sidebar-surface h-full max-h-dvh w-[min(288px,90vw)] rounded-none p-0"
          >
            {({ close }) => (
              <div className="flex h-full min-h-0 flex-col">
                <Brand />
                <Drawer.Body className="min-h-0 flex-1 overflow-y-auto px-0">
                  <SidebarContent
                    role={role}
                    activeModuleKeys={activeModuleKeys}
                    onNavigate={close}
                  />
                </Drawer.Body>
                {userName && onSignOut ? (
                  <SidebarUserFooter
                    name={userName}
                    email={userEmail ?? ""}
                    role={role}
                    onSignOut={onSignOut}
                    onNavigate={close}
                  />
                ) : null}
              </div>
            )}
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}

/** Mobil (<1024px) üst şerit: yalnızca menü butonu ve marka. Masaüstünde üst bar yoktur. */
function MobileHeader() {
  const tSidebar = useTranslations("sidebar");
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-default-200/80 bg-content1/95 px-3 backdrop-blur-md lg:hidden">
      <SidebarTrigger />
      <Building2 className="h-4 w-4 text-primary" aria-hidden />
      <span className="truncate text-small font-semibold text-foreground">
        {BRAND}
        {tSidebar.has("brand") ? ` · ${tSidebar("brand")}` : ""}
      </span>
      <div className="ml-auto">
        <ThemeMenu />
      </div>
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
      variant="tertiary"
      size="sm"
      aria-label={
        tSidebar.has("openMobile") ? tSidebar("openMobile") : "Menüyü aç"
      }
      className="lg:hidden"
      onPress={() => setMobileOpen(true)}
    >
      <MenuIcon className="h-5 w-5" />
    </Button>
  );
}

export { SidebarProvider, DesktopSidebar, MobileSidebar, MobileHeader };
