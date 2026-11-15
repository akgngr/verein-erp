import { heroui } from "@heroui/react";

// Quiet, commerce-inspired work surfaces: graphite, warm neutrals and a restrained forest accent.
const brand = {
  50: "#edf5f0",
  100: "#d9eade",
  200: "#b6d4c0",
  300: "#87b69a",
  400: "#579575",
  500: "#337b58",
  600: "#206541",
  700: "#1d5036",
  800: "#1c402d",
  900: "#173526",
  DEFAULT: "#206541",
  foreground: "#ffffff",
};
const neutral = {
  50: "#f7f8f6",
  100: "#eef0ec",
  200: "#dfe3dc",
  300: "#c4cbc1",
  400: "#929b90",
  500: "#697367",
  600: "#505b4f",
  700: "#3b453b",
  800: "#29322a",
  900: "#1c241e",
  DEFAULT: "#dfe3dc",
  foreground: "#242b26",
};
export default heroui({
  layout: {
    radius: { small: "6px", medium: "8px", large: "12px" },
    boxShadow: {
      small:
        "0 1px 2px rgba(25, 35, 28, 0.04), 0 0 0 1px rgba(25, 35, 28, 0.025)",
      medium:
        "0 4px 16px -4px rgba(25, 35, 28, 0.10), 0 1px 3px rgba(25, 35, 28, 0.04)",
      large:
        "0 20px 48px -12px rgba(12, 24, 17, 0.22), 0 4px 12px rgba(12, 24, 17, 0.06)",
    },
  },
  themes: {
    light: {
      colors: {
        background: "#f4f5f2",
        foreground: "#242b26",
        content1: "#ffffff",
        content2: "#f7f8f5",
        content3: "#edf0ea",
        divider: "#e1e5de",
        default: neutral,
        primary: brand,
        focus: brand[500],
      },
    },
    dark: {
      colors: {
        background: "#111714",
        foreground: "#e9eee9",
        content1: "#1a221d",
        content2: "#212b24",
        content3: "#2b352d",
        divider: "#334137",
        primary: { ...brand, DEFAULT: "#91c5a3", foreground: "#102719" },
        focus: "#91c5a3",
      },
    },
  },
});
