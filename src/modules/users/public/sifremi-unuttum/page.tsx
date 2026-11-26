import { getTranslations } from "next-intl/server";

import { PasswordResetRequestView } from "../../views/password-reset-views";

export async function generateMetadata() {
  const t = await getTranslations("users.passwordReset");
  return { title: t("requestTitle"), robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return <PasswordResetRequestView />;
}
