import { CalendarPlus, ListTodo } from "lucide-react";

import { requirePermission, ForbiddenError } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { LinkButton } from "@/shared/components/ui/link-button";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";
import { parseListParams, type RawSearchParams } from "@/shared/list-params";

import { getMeetingStats } from "../queries/get-meeting-stats";
import { MEETING_DEFAULT_SORT, MEETING_SORTABLE_FIELDS, listMeetings } from "../queries/list-meetings";
import { meetingsPermissions } from "../permissions";
import { MEETING_STATUS_FILTER_OPTIONS, MEETING_TYPE_FILTER_OPTIONS } from "../constants";
import { MeetingTable } from "../components/meeting-table";
import { MeetingDateFilter } from "../components/list-filters";
import { StatsCards } from "../components/stats-cards";

/** Toplantı listesi (7.1): istatistik kartları + filtreler + tablo. */
export async function MeetingListView({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  let user;
  try {
    user = await requirePermission(meetingsPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const raw = await searchParams;
  const params = parseListParams(raw, {
    sortableFields: MEETING_SORTABLE_FIELDS,
    defaultSort: MEETING_DEFAULT_SORT,
    defaultDir: "desc",
    filterKeys: ["type", "status", "from", "to"],
  });

  const [list, stats] = await Promise.all([listMeetings(params), getMeetingStats()]);

  const canCreate = can(user.role, meetingsPermissions, "create");
  const canUpdate = can(user.role, meetingsPermissions, "update");
  const canDelete = can(user.role, meetingsPermissions, "delete");

  return (
    <div>
      <PageHeader
        title="Toplantılar"
        description="Toplantı takvimi, gündem, tutanak ve kararların yönetimi."
        actions={
          <>
            {canCreate ? (
              <LinkButton
                href="/toplantilar/yeni"
                color="primary"
                startIcon={<CalendarPlus className="h-4 w-4" />}
              >
                Yeni toplantı
              </LinkButton>
            ) : null}
            <LinkButton
              href="/toplantilar/gorevler"
              color="default"
              variant="bordered"
              startIcon={<ListTodo className="h-4 w-4" />}
            >
              Görevler
            </LinkButton>
          </>
        }
      />

      <StatsCards stats={stats} />

      <MeetingTable
        rows={list.rows}
        total={list.total}
        page={list.page}
        pageSize={list.pageSize}
        sort={params.sort}
        dir={params.dir}
        q={params.q}
        filters={[
          { key: "type", label: "Tür", options: [...MEETING_TYPE_FILTER_OPTIONS] },
          { key: "status", label: "Durum", options: [...MEETING_STATUS_FILTER_OPTIONS] },
        ]}
        dateFilter={<MeetingDateFilter />}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </div>
  );
}
