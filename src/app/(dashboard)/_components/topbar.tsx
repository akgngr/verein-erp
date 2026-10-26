"use client";

import { SidebarTrigger } from "./sidebar";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
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
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-default-200 bg-background/80 px-4 py-3 backdrop-blur md:px-6">
      <SidebarTrigger />
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <UserMenu name={name} email={email} role={role} onSignOut={onSignOut} />
      </div>
    </header>
  );
}
