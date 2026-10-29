import { getTranslations } from "next-intl/server";
import { ForbiddenError, listActiveUserOptions, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { FormDrawer } from "@/shared/components/forms/form-drawer";

import { getEnv } from "@/shared/env";

import { documentsPermissions } from "../permissions";
import { listActiveCategoryOptions } from "../queries/list-categories";
import { listCounterparties } from "../queries/list-counterparties";
import { searchReplyTargets } from "../queries/search-reply-targets";
import { DocumentForm } from "../components/document-form";

/**
 * Yeni evrak (8.2; sağ çekmece): yön listedeki `?yeni=gelen|giden` değerinden
 * gelir (geçersizse gelen). KARAR: Yönü sunucu okur; forma alan olarak eklenmez.
 */
export async function DocumentCreateView({ direction }: { direction: "INCOMING" | "OUTGOING" }) {
  const t = await getTranslations("documents.form");
  try {
    await requirePermission(documentsPermissions, "create");
  } catch (error) {
    if (error instanceof ForbiddenError) return <FormDrawer title="">{<AccessDenied />}</FormDrawer>;
    throw error;
  }


  // KARAR: "Yanıtlanan evrak" yalnızca giden evrakta görünür; aday gelen
  // evraklar yalnızca giden formda sorgulanır.
  const [categories, assignees, counterparties, replyTargets] = await Promise.all([
    listActiveCategoryOptions(),
    listActiveUserOptions(),
    listCounterparties(""),
    direction === "OUTGOING" ? searchReplyTargets("") : Promise.resolve([]),
  ]);

  return (
    <FormDrawer title={direction === "INCOMING" ? t("createTitleIncoming") : t("createTitleOutgoing")} description={t("createDescription")}>
      <DocumentForm
        mode="create"
        direction={direction}
        categories={categories}
        assignees={assignees}
        counterparties={counterparties.map((c) => c.value)}
        replyTargets={replyTargets}
        maxMb={getEnv().MAX_UPLOAD_MB}
      />
    </FormDrawer>
  );
}
