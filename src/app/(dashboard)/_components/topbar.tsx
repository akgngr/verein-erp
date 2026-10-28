"use client";

import { SidebarTrigger } from "./sidebar";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { LanguageSwitcher } from "@/modules/system/ui";
import type { Role } from "@/shared/roles";

export function Topbar({
  name,
  email,
  role,
  onSignOut,
}: {
  name: string;
  email: string;
  role: Role;
  onSignOut: () => Promise<void>;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-default-200/80 bg-background/80 px-4 backdrop-blur-md md:px-6">
      <SidebarTrigger />
      <div className="flex items-center gap-2 sm:gap-3 ml-auto">
        <LanguageSwitcher />
        <ThemeToggle />
        <div className="h-4 w-px bg-default-200" aria-hidden />
        <UserMenu name={name} email={email} role={role} onSignOut={onSignOut} />
      </div>
    </header>
  );
}
