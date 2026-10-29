import { UserEditView } from "../../ui";

export const metadata = { title: "Kullanıcıyı Düzenle" };

export default async function KullaniciDuzenlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <UserEditView userId={id} />;
}
