import { getTranslations } from "next-intl/server";

import { PublicOnlineForm } from "../../../components/public-form";
import { loadPublicForm } from "../../../services/requests";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("online-forms.public");
  return { title: t("title"), robots: { index: false, follow: false } };
}

/** OTURUMSUZ: /formular/<belirteç>. Geçersiz/süresi dolmuş/kullanılmış bağlantıda hiçbir kişi verisi gösterilmez. */
export default async function OnlineFormPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const form = /^[A-Za-z0-9_-]{20,100}$/.test(token) ? await loadPublicForm(token) : null;
  if (!form) {
    const t = await getTranslations("online-forms.public");
    return (
      <div className="mx-auto max-w-xl rounded-large bg-content1 p-8 text-center shadow-small">
        <h1 className="text-xl font-semibold">{t("invalidTitle")}</h1>
        <p className="mt-2 text-default-600">{t("invalidText")}</p>
      </div>
    );
  }
  return <PublicOnlineForm token={token} form={form} />;
}
