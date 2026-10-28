export type EventType =
  | "WORKSHOP"
  | "SEMINAR"
  | "SOCIAL"
  | "CULTURAL"
  | "SPORTS"
  | "OTHER";

export type EventStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "COMPLETED"
  | "CANCELLED";

export type AttendeeStatus =
  | "REGISTERED"
  | "ATTENDED"
  | "CANCELLED";

export interface EventRow {
  id: string;
  title: string;
  description: string | null;
  type: EventType;
  status: EventStatus;
  startDate: Date;
  endDate: Date | null;
  location: string | null;
  isOnline: boolean;
  onlineUrl: string | null;
  capacity: number | null;
  createdAt: Date;
  updatedAt: Date;
  registeredCount: number;
  attendedCount: number;
  isPast?: boolean;
}

export interface EventAttendeeItem {
  id: string;
  eventId: string;
  memberId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  status: AttendeeStatus;
  notes: string | null;
  registeredAt: Date;
  updatedAt: Date;
}

export interface EventDetailData extends EventRow {
  attendees: EventAttendeeItem[];
}

export interface EventStats {
  totalEvents: number;
  upcomingEventsCount: number;
  totalAttendeesMonth: number;
}

export interface EventFilters {
  query?: string;
  type?: EventType | "ALL";
  status?: EventStatus | "ALL";
  timeFilter?: "all" | "upcoming" | "past";
  page?: number;
  pageSize?: number;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
