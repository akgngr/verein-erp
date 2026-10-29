import { redirect } from "next/navigation";

/** Eski adres: yeni evrak formu artık listenin sağ çekmecesinde açılır (`?yeni=gelen|giden`). */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { yon } = await searchParams;
  redirect(`/evrak?yeni=${yon === "giden" ? "giden" : "gelen"}`);
}
