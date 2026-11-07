import { heroui } from "@heroui/react";

// KARAR: Kurumsal, sakin bir lacivert-mavi marka paleti. Sayfa zemini hafif gri, kartlar beyaz;
// böylece içerik kartları zeminden ayrışır. Sidebar marka renginde (koyu) zemin kullanır.
const brand = {
  50: "#eef3ff",
  100: "#dce6fe",
  200: "#bccffd",
  300: "#8fadf9",
  400: "#5f84f2",
  500: "#3d63e6",
  600: "#2b4bd0",
  700: "#253ca8",
  800: "#233587",
  900: "#20306b",
  DEFAULT: "#2b4bd0",
  foreground: "#ffffff",
};

export default heroui({
  layout: {
    radius: { small: "6px", medium: "10px", large: "14px" },
    boxShadow: {
      small: "0 1px 2px rgba(16, 24, 40, 0.05), 0 1px 3px rgba(16, 24, 40, 0.06)",
      medium: "0 4px 12px -2px rgba(16, 24, 40, 0.08), 0 2px 4px -2px rgba(16, 24, 40, 0.05)",
      large: "0 16px 32px -8px rgba(16, 24, 40, 0.14), 0 4px 8px -4px rgba(16, 24, 40, 0.06)",
    },
  },
  themes: {
    light: {
      colors: {
        background: "#f5f7fb",
        content1: "#ffffff",
        primary: brand,
        focus: brand[500],
      },
    },
    dark: {
      colors: {
        background: "#0b1020",
        content1: "#121a2e",
        content2: "#18223a",
        primary: { ...brand, DEFAULT: brand[400], foreground: "#0b1020" },
        focus: brand[400],
      },
    },
  },
});
