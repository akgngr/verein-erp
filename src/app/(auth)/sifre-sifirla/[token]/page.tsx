import { getTranslations } from "next-intl/server";

import { PasswordResetView } from "@/modules/users/ui";

export async function generateMetadata() {
  const t = await getTranslations("users.passwordReset");
  return { title: t("resetTitle"), robots: { index: false, follow: false } };
}

// Token sayfası: önbelleğe alınmaz, arama motoruna kapalı.
export const dynamic = "force-dynamic";

export default async function PasswordResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PasswordResetView token={token} />;
}
