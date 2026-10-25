"use client";

import { Chip, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, User } from "@heroui/react";
import { LogOut, UserRound } from "lucide-react";

import { ROLE_COLORS, ROLE_LABELS } from "@/shared/roles";
import type { Role } from "@/shared/roles";

export function UserMenu({
  name,
  email,
  role,
  onSignOut,
}: {
  name: string;
  email: string;
  role: Role;
  /** layout (sunucu) tarafından aktarılan signOutAction referansı. */
  onSignOut: () => Promise<void>;
}) {
  const initials = name
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");

  return (
    <Dropdown placement="bottom-end">
      {/* KARAR: HeroUI User bileşeni as="button" ile doğrudan DropdownTrigger altında
          kullanılır (buton içinde buton hidrasyon hatasını önlemek için sarmalayıcı yok). */}
      <DropdownTrigger>
        <User
          as="button"
          aria-label="Kullanıcı menüsü"
          avatarProps={{
            name: initials || "?",
            color: "primary",
            className: "text-small",
          }}
          name={name}
          description={email}
          className="gap-3"
        />
      </DropdownTrigger>
      <DropdownMenu aria-label="Kullanıcı işlemleri">
        <DropdownItem key="identity" isReadOnly showDivider>
          <div className="flex flex-col gap-1">
            <p className="text-small font-medium">{name}</p>
            <p className="text-tiny text-default-500">{email}</p>
            <Chip color={ROLE_COLORS[role]} size="sm" variant="flat" className="mt-1 self-start">
              {ROLE_LABELS[role]}
            </Chip>
          </div>
        </DropdownItem>
        <DropdownItem
          key="profile"
          startContent={<UserRound className="h-4 w-4" />}
          href="/profil"
        >
          Profil
        </DropdownItem>
        <DropdownItem
          key="logout"
          color="danger"
          startContent={<LogOut className="h-4 w-4" />}
          onPress={() => void onSignOut()}
        >
          Çıkış yap
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
