"use client";

import { Button, Dropdown, Label } from "@heroui/react";
import { ChevronRight, LayoutDashboard, Laptop, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { registry } from "@/registry";
import { useTheme, type Theme } from "@/shared/components/theme-provider";
import { findActiveModule, moduleHome } from "@/shared/navigation/module-nav";

/** Context and a working appearance switch; destinations remain the existing module navigation. */
export function WorkspaceHeader({ dateLabel }: { dateLabel: string }) {
  const pathname = usePathname(),
    searchParams = useSearchParams(),
    t = useTranslations(),
    sidebar = useTranslations("sidebar");
  const activeModule = findActiveModule(registry, pathname, searchParams);
  const home = activeModule ? moduleHome(activeModule) : undefined;
  const moduleLabel = home
    ? home.labelKey && t.has(`nav.${home.labelKey}`)
      ? t(`nav.${home.labelKey}`)
      : home.label
    : null;
  return (
    <header className="workspace-header hidden h-16 shrink-0 items-center justify-between gap-4 border-b border-ink-200/70 px-7 backdrop-blur-md lg:flex">
      <nav
        aria-label={sidebar("mainMenu")}
        className="flex min-w-0 items-center gap-2.5 text-[12px] text-ink-500"
      >
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-2 transition-colors hover:text-foreground"
          aria-current={pathname === "/" ? "page" : undefined}
        >
          <LayoutDashboard className="h-3.5 w-3.5" aria-hidden />
          {t("nav.panel")}
        </Link>
        {moduleLabel && pathname !== "/" ? (
          <>
            <ChevronRight
              className="h-3 w-3 shrink-0 text-ink-300"
              aria-hidden
            />
            <span className="truncate font-medium text-foreground">
              {moduleLabel}
            </span>
          </>
        ) : null}
      </nav>
      <div className="flex shrink-0 items-center gap-4">
        <span className="text-[12px] text-ink-500">{dateLabel}</span>
        <span className="h-4 w-px bg-ink-200" aria-hidden />
        <ThemeMenu />
      </div>
    </header>
  );
}

export function ThemeMenu() {
  const sidebar = useTranslations("sidebar");
  const { theme, resolvedTheme, setTheme } = useTheme();
  const options = [
    { key: "light", label: sidebar("themeLight"), icon: Sun },
    { key: "dark", label: sidebar("themeDark"), icon: Moon },
    { key: "system", label: sidebar("themeSystem"), icon: Laptop },
  ];
  return (
    <Dropdown>
      <Button
        isIconOnly
        size="sm"
        variant="tertiary"
        aria-label={sidebar("theme")}
        className="text-ink-500"
      >
        {resolvedTheme === "dark" ? (
          <Moon className="h-4 w-4" aria-hidden />
        ) : (
          <Sun className="h-4 w-4" aria-hidden />
        )}
      </Button>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu
          aria-label={sidebar("themeOptions")}
          selectionMode="single"
          selectedKeys={new Set([theme])}
          onAction={(key) => setTheme(key as Theme)}
        >
          {options.map(({ key, label, icon: Icon }) => (
            <Dropdown.Item key={key} id={key} textValue={label}>
              <Icon className="h-4 w-4" aria-hidden />
              <Label>{label}</Label>
              <Dropdown.ItemIndicator />
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
