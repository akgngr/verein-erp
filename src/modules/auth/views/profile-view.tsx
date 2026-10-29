import { getTranslations } from "next-intl/server";

import { requireUser } from "../server";
import { PageHeader } from "@/shared/components/ui/page-header";

import { ProfileContent } from "../components/profile-content";

/** /profil — sunucu tarafı: oturum verisini tazeleyip client içeriğe aktarır. */
export async function ProfileView() {
  const user = await requireUser();
  const t = await getTranslations("auth.profile");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      <ProfileContent user={user} />
    </div>
  );
}
