import { PortalConfirmView } from "../../../ui";

export default async function MemberPortalConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return <PortalConfirmView token={params.token ?? ""} />;
}
