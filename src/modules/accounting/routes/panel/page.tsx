import { AccountingDashboardView } from "../../views/dashboard-view";

export default function AccountingPanelPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AccountingDashboardView searchParams={searchParams} />;
}
