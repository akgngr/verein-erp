import { getTranslations } from "next-intl/server";

import { SurfaceCard } from "@/shared/components/ui/surface-card";

import { PasswordResetForm, PasswordResetRequestForm } from "../components/password-reset-forms";
import { findUsableInvitation } from "../services/invitations";

const cardProps = {
  className: "w-full max-w-md rounded-2xl shadow-none",
  headerClassName: "px-8 pt-9 pb-2",
  contentClassName: "gap-4 px-8 pb-9 pt-4",
} as const;

/** #603: /sifremi-unuttum — request form (public). */
export async function PasswordResetRequestView() {
  const t = await getTranslations("users.passwordReset");
  return (
    <SurfaceCard {...cardProps} header={<h1 className="text-xl font-bold">{t("requestTitle")}</h1>}>
      <p className="text-sm text-ink-500">{t("requestIntro")}</p>
      <PasswordResetRequestForm />
    </SurfaceCard>
  );
}

/** #603: /sifre-sifirla/[token] — invalid/expired/used links get one generic message. */
export async function PasswordResetView({ token }: { token: string }) {
  const t = await getTranslations("users.passwordReset");
  const link = await findUsableInvitation(token, new Date(), "RESET");
  return (
    <SurfaceCard {...cardProps} header={<h1 className="text-xl font-bold">{t("resetTitle")}</h1>}>
      {link ? (
        <>
          <p className="text-sm text-ink-500">{t("resetIntro", { email: link.email })}</p>
          <PasswordResetForm token={token} />
        </>
      ) : (
        <p role="alert" className="text-sm text-danger-600">{t("errors.invalid")}</p>
      )}
    </SurfaceCard>
  );
}
