import { getTranslations } from "next-intl/server";

import { SurfaceCard } from "@/shared/components/ui/surface-card";

import { InvitationForm } from "../components/invitation-form";
import { findUsableInvitation } from "../services/invitations";

/** Public invitation page: shows only the invitee's own e-mail; invalid/expired/used tokens get one generic message. */
export async function InvitationView({ token }: { token: string }) {
  const t = await getTranslations("users.invite");
  const invitation = await findUsableInvitation(token);
  return (
    <SurfaceCard className="w-full max-w-md rounded-2xl shadow-none" header={<h1 className="text-xl font-bold">{t("pageTitle")}</h1>} headerClassName="px-8 pt-9 pb-2" contentClassName="gap-4 px-8 pb-9 pt-4">
      {invitation ? (
        <>
          <p className="text-sm text-ink-500">{t("pageIntro", { email: invitation.email })}</p>
          <InvitationForm token={token} />
        </>
      ) : (
        <p role="alert" className="text-sm text-danger-600">{t("errors.invalid")}</p>
      )}
    </SurfaceCard>
  );
}
