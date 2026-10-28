import type { EventType, EventStatus, AttendeeStatus } from "./types"

export const DEFAULT_PAGE_SIZE = 10

export const EVENT_TYPES: {
  value: EventType
  labelTr: string
  labelDe: string
}[] = [
  { value: "WORKSHOP", labelTr: "Atölye", labelDe: "Workshop" },
  { value: "SEMINAR", labelTr: "Seminer", labelDe: "Seminar" },
  {
    value: "SOCIAL",
    labelTr: "Sosyal Buluşma",
    labelDe: "Geselligkeit & Treffen",
  },
  {
    value: "CULTURAL",
    labelTr: "Kültürel Etkinlik",
    labelDe: "Kulturveranstaltung",
  },
  {
    value: "SPORTS",
    labelTr: "Spor Faaliyeti",
    labelDe: "Sportliche Aktivität",
  },
  { value: "OTHER", labelTr: "Diğer", labelDe: "Sonstiges" },
]

export const EVENT_STATUSES: {
  value: EventStatus
  labelTr: string
  labelDe: string
  tailwindClass: string
}[] = [
  {
    value: "DRAFT",
    labelTr: "Taslak",
    labelDe: "Entwurf",
    tailwindClass: "bg-default-100 text-default-700 border-default-200",
  },
  {
    value: "PUBLISHED",
    labelTr: "Yayında",
    labelDe: "Veröffentlicht",
    tailwindClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
  },
  {
    value: "COMPLETED",
    labelTr: "Tamamlandı",
    labelDe: "Abgeschlossen",
    tailwindClass:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
  },
  {
    value: "CANCELLED",
    labelTr: "İptal Edildi",
    labelDe: "Abgesagt",
    tailwindClass:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800",
  },
]

export const ATTENDEE_STATUSES: {
  value: AttendeeStatus
  labelTr: string
  labelDe: string
}[] = [
  { value: "REGISTERED", labelTr: "Kayıtlı", labelDe: "Angemeldet" },
  { value: "ATTENDED", labelTr: "Katıldı", labelDe: "Teilgenommen" },
  { value: "CANCELLED", labelTr: "İptal", labelDe: "Abgemeldet" },
]
