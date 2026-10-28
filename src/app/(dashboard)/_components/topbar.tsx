"use client";

import { SidebarTrigger } from "./sidebar";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { LanguageSwitcher } from "./language-switcher";
import type { Role } from "@/shared/roles";
import type { Locale } from "@/i18n/config";
import type { ActionResult } from "@/shared/types/action";

export function Topbar({
  name,
  email,
  role,
  onSignOut,
  onSetLocale,
}: {
  name: string;
  email: string;
  role: Role;
  onSignOut: () => Promise<void>;
  onSetLocale: (input: { locale: Locale }) => Promise<ActionResult<Locale>>;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-default-200/80 bg-background/80 px-4 backdrop-blur-md md:px-6">
      <SidebarTrigger />
      <div className="flex items-center gap-2 sm:gap-3 ml-auto">
        <LanguageSwitcher onSetLocale={onSetLocale} />
        <ThemeToggle />
        <div className="h-4 w-px bg-default-200" aria-hidden />
        <UserMenu name={name} email={email} role={role} onSignOut={onSignOut} />
      </div>
    </header>
  );
}
