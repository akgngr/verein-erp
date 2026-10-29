import { UsersListView } from "./ui";

export const metadata = { title: "Kullanıcılar" };

export default async function KullanicilarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <UsersListView searchParams={searchParams} />;
}
