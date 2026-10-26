import type { RawSearchParams } from "@/shared/list-params";

import { LoginView } from "@/modules/auth/ui";

export const metadata = { title: "Giriş" };

export default async function GirisPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  return <LoginView passive={params.pasif === "1"} />;
}
