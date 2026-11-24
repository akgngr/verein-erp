import { getTranslations } from "next-intl/server";

import { InvitationView } from "@/modules/users/ui";

export async function generateMetadata() {
  const t = await getTranslations("users.invite");
  return { title: t("pageTitle"), robots: { index: false, follow: false } };
}

// Token sayfası: önbelleğe alınmaz, arama motoruna kapalı.
export const dynamic = "force-dynamic";

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InvitationView token={token} />;
}
