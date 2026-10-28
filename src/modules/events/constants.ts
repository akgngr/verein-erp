import type { EventType, EventStatus, AttendeeStatus } from "./types";

export const DEFAULT_PAGE_SIZE = 10;

export const EVENT_TYPES: { value: EventType; labelTr: string; labelDe: string }[] = [
  { value: "WORKSHOP", labelTr: "Atölye", labelDe: "Workshop" },
  { value: "SEMINAR", labelTr: "Seminer", labelDe: "Seminar" },
  { value: "SOCIAL", labelTr: "Sosyal Buluşma", labelDe: "Geselligkeit & Treffen" },
  { value: "CULTURAL", labelTr: "Kültürel Etkinlik", labelDe: "Kulturveranstaltung" },
  { value: "SPORTS", labelTr: "Spor Faaliyeti", labelDe: "Sportliche Aktivität" },
  { value: "OTHER", labelTr: "Diğer", labelDe: "Sonstiges" },
];

export const EVENT_STATUSES: {
  value: EventStatus;
  labelTr: string;
  labelDe: string;
  variant: "default" | "primary" | "secondary" | "success" | "warning" | "danger";
}[] = [
  { value: "DRAFT", labelTr: "Taslak", labelDe: "Entwurf", variant: "default" },
  { value: "PUBLISHED", labelTr: "Yayında", labelDe: "Veröffentlicht", variant: "success" },
  { value: "COMPLETED", labelTr: "Tamamlandı", labelDe: "Abgeschlossen", variant: "secondary" },
  { value: "CANCELLED", labelTr: "İptal Edildi", labelDe: "Abgesagt", variant: "danger" },
];

export const ATTENDEE_STATUSES: {
  value: AttendeeStatus;
  labelTr: string;
  labelDe: string;
  variant: "default" | "success" | "danger";
}[] = [
  { value: "REGISTERED", labelTr: "Kayıtlı", labelDe: "Angemeldet", variant: "default" },
  { value: "ATTENDED", labelTr: "Katıldı", labelDe: "Teilgenommen", variant: "success" },
  { value: "CANCELLED", labelTr: "İptal", labelDe: "Abgemeldet", variant: "danger" },
];
