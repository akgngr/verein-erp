import { AlertTriangle, CalendarClock, CalendarDays } from "lucide-react";

import { AlertCardBody, StatCardBody, TableCardBody } from "@/shared/components/dashboard/card-bodies";
import { defineCards } from "@/shared/types/dashboard";
import { formatDate } from "@/shared/utils";

import { meetingsPermissions } from "../permissions";
import { getMeetingStats } from "../queries/get-meeting-stats";
import { listUpcomingMeetings } from "../queries/list-upcoming-meetings";

export const cards = defineCards([
  {
    key: "overview",
    titleKey: "cards.overview.title",
    descriptionKey: "cards.overview.description",
    icon: CalendarDays,
    size: "sm",
    defaultVisible: true,
    href: "/toplantilar",
    permission: { definition: meetingsPermissions, action: "view" },
    render: async ({ t }) => {
      const stats = await getMeetingStats();
      return (
        <StatCardBody
          value={stats.nextMeeting ? formatDate(stats.nextMeeting.meetingDate) : stats.plannedCount}
          label={
            stats.nextMeeting
              ? t("cards.overview.next", { number: stats.nextMeeting.meetingNumber })
              : t("cards.overview.planned")
          }
          details={[
            { label: t("cards.overview.pendingMinutes"), value: stats.draftMinutesCount },
            { label: t("cards.overview.openTasks"), value: stats.openActionItems },
            ...(stats.overdueActionItems > 0
              ? [{ label: t("cards.overview.overdueTasks"), value: stats.overdueActionItems, tone: "danger" as const }]
              : []),
          ]}
        />
      );
    },
  },
  {
    key: "upcoming",
    titleKey: "cards.upcoming.title",
    descriptionKey: "cards.upcoming.description",
    icon: CalendarClock,
    size: "md",
    href: "/toplantilar",
    permission: { definition: meetingsPermissions, action: "view" },
    render: async ({ t }) => {
      const meetings = await listUpcomingMeetings();
      return (
        <TableCardBody
          emptyText={t("cards.upcoming.empty")}
          columns={[
            { key: "title", label: t("cards.upcoming.colTitle") },
            { key: "date", label: t("cards.upcoming.colDate") },
            { key: "location", label: t("cards.upcoming.colLocation") },
          ]}
          rows={meetings.map((meeting) => ({
            id: meeting.id,
            href: `/toplantilar/${meeting.id}`,
            cells: {
              title: `${meeting.meetingNumber} · ${meeting.title}`,
              date: `${formatDate(meeting.meetingDate)}${meeting.startTime ? ` ${meeting.startTime}` : ""}`,
              location: meeting.location ?? "—",
            },
          }))}
        />
      );
    },
  },
  {
    key: "overdueTasks",
    titleKey: "cards.overdueTasks.title",
    descriptionKey: "cards.overdueTasks.description",
    icon: AlertTriangle,
    size: "lg",
    defaultVisible: true,
    permission: { definition: meetingsPermissions, action: "view" },
    render: async ({ t }) => {
      const stats = await getMeetingStats();
      if (stats.overdueActionItems === 0) return null;
      return (
        <AlertCardBody
          message={t("cards.overdueTasks.message", { count: stats.overdueActionItems })}
          actionHref="/toplantilar/gorevler?filter.overdue=1"
          actionLabel={t("cards.overdueTasks.action")}
        />
      );
    },
  },
]);
