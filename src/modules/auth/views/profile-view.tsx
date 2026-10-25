import { requireUser } from "../server";
import { PageHeader } from "@/shared/components/ui/page-header";

import { ProfileContent } from "../components/profile-content";

/** /profil — sunucu tarafı: oturum verisini tazeleyip client içeriğe aktarır. */
export async function ProfileView() {
  const user = await requireUser();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Profil" description="Hesap bilgileriniz ve parola değişikliği." />
      <ProfileContent user={user} />
    </div>
  );
}
