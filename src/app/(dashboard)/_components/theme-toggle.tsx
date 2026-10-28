"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/shared/components/theme-provider";

import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@heroui/react";

/** Tema değiştirici: açık / koyu / sistem (8. bölüm). */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <Button isIconOnly variant="light" size="sm" aria-label="Tema seçimi">
          {/* KARAR: mounted guard yerine CSS ile ikon değişimi yapılır; böylece
              hidrasyon uyumsuzluğu ve useEffect/setState kalıbı gerekmez. */}
          <Sun className="h-4 w-4 dark:hidden" />
          <Moon className="hidden h-4 w-4 dark:block" />
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Tema seçenekleri"
        selectedKeys={theme ? [theme] : []}
        selectionMode="single"
        disallowEmptySelection
        onAction={(key) => setTheme(String(key) as Theme)}
      >
        <DropdownItem key="light" startContent={<Sun className="h-4 w-4" />}>
          Açık
        </DropdownItem>
        <DropdownItem key="dark" startContent={<Moon className="h-4 w-4" />}>
          Koyu
        </DropdownItem>
        <DropdownItem key="system" startContent={<SunMoonIcon />}>
          Sistem
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}

function SunMoonIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none" />
    </svg>
  );
}
