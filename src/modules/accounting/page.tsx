import type { Metadata } from "next";
import { AccountingListView } from "./server";

export const metadata: Metadata = { title: "Muhasebe" };

export default function AccountingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AccountingListView searchParams={searchParams} />;
}
