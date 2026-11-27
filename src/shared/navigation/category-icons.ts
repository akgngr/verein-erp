import {
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  FileText,
  Folder,
  HeartHandshake,
  Layers,
  Mail,
  ShieldCheck,
  Star,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type CategoryIconKey =
  | "folder"
  | "building"
  | "users"
  | "wallet"
  | "calendar"
  | "book"
  | "file"
  | "mail"
  | "briefcase"
  | "shield"
  | "layers"
  | "star"
  | "heart"
  | "wrench";

export const CATEGORY_ICON_OPTIONS: readonly {
  key: CategoryIconKey;
  icon: LucideIcon;
  labelTr: string;
  labelDe: string;
}[] = [
  { key: "folder", icon: Folder, labelTr: "Klasör", labelDe: "Ordner" },
  { key: "building", icon: Building2, labelTr: "Dernek", labelDe: "Verein" },
  { key: "users", icon: Users, labelTr: "Üyeler", labelDe: "Mitglieder" },
  { key: "wallet", icon: Wallet, labelTr: "Finans", labelDe: "Finanzen" },
  { key: "calendar", icon: Calendar, labelTr: "Takvim", labelDe: "Kalender" },
  { key: "book", icon: BookOpen, labelTr: "Eğitim", labelDe: "Bildung" },
  { key: "file", icon: FileText, labelTr: "Belgeler", labelDe: "Dokumente" },
  { key: "mail", icon: Mail, labelTr: "İletişim", labelDe: "Kommunikation" },
  { key: "briefcase", icon: Briefcase, labelTr: "Yönetim", labelDe: "Verwaltung" },
  { key: "shield", icon: ShieldCheck, labelTr: "Uyum & Güvenlik", labelDe: "Sicherheit" },
  { key: "layers", icon: Layers, labelTr: "Modüller", labelDe: "Module" },
  { key: "star", icon: Star, labelTr: "Favoriler", labelDe: "Favoriten" },
  { key: "heart", icon: HeartHandshake, labelTr: "Bağış & Destek", labelDe: "Spenden" },
  { key: "wrench", icon: Wrench, labelTr: "Araçlar", labelDe: "Werkzeuge" },
];

const ICON_MAP = new Map<string, LucideIcon>(
  CATEGORY_ICON_OPTIONS.map((opt) => [opt.key, opt.icon]),
);

export function getCategoryIcon(iconKey?: string | null): LucideIcon {
  if (!iconKey) return Folder;
  return ICON_MAP.get(iconKey) ?? Folder;
}
