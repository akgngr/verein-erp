import { DuesReportView } from "@/modules/members/ui";

export const metadata = { title: "Aidat Raporu" };

export default async function AidatPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <DuesReportView searchParams={searchParams} />;
}
