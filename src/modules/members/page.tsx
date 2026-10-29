import { MemberListView } from "./ui";

export const metadata = { title: "Üyeler" };

export default async function UyelerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <MemberListView searchParams={searchParams} />;
}
