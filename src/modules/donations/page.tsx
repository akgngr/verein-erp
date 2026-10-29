import { DonationListView } from "./ui";

export const metadata = { title: "Bağışlar" };

export default async function BagislarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <DonationListView searchParams={searchParams} />;
}
