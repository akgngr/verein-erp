import { ForbiddenError, listActiveUserOptions, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import type { RawSearchParams } from "@/shared/list-params";

import { getEnv } from "@/shared/env";

import { documentsPermissions } from "../permissions";
import { listActiveCategoryOptions } from "../queries/list-categories";
import { listCounterparties } from "../queries/list-counterparties";
import { searchReplyTargets } from "../queries/search-reply-targets";
import { DocumentForm } from "../components/document-form";

/**
 * Yeni evrak (8.2): `yon` parametresi yönü belirler (geçersizse gelen).
 * KARAR: Yönü sayfa sunucusu okur; action'a forma ek bir alan olarak değil,
 * doğrudan yönlendirmeyle taşınır.
 */
export async function DocumentCreateView({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  try {
    await requirePermission(documentsPermissions, "create");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const raw = await searchParams;
  const yon = Array.isArray(raw.yon) ? raw.yon[0] : raw.yon;
  const direction = yon === "giden" ? "OUTGOING" : "INCOMING";

  // KARAR: "Yanıtlanan evrak" yalnızca giden evrakta görünür; aday gelen
  // evraklar yalnızca giden formda sorgulanır.
  const [categories, assignees, counterparties, replyTargets] = await Promise.all([
    listActiveCategoryOptions(),
    listActiveUserOptions(),
    listCounterparties(""),
    direction === "OUTGOING" ? searchReplyTargets("") : Promise.resolve([]),
  ]);

  return (
    <div>
      <PageHeader
        title={direction === "INCOMING" ? "Yeni gelen evrak" : "Yeni giden evrak"}
        description="Kayıt numarası, kayıt sırası ve kayıt tarihi otomatik atanır."
      />
      <DocumentForm
        mode="create"
        direction={direction}
        categories={categories}
        assignees={assignees}
        counterparties={counterparties.map((c) => c.value)}
        replyTargets={replyTargets}
        maxMb={getEnv().MAX_UPLOAD_MB}
      />
    </div>
  );
}
