import { notFound } from "next/navigation";

import { ForbiddenError, listActiveUserOptions, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { getEnv } from "@/shared/env";

import { documentsPermissions } from "../permissions";
import { getDocumentDetail } from "../queries/get-document";
import { listActiveCategoryOptions } from "../queries/list-categories";
import { listCounterparties } from "../queries/list-counterparties";
import { searchReplyTargets } from "../queries/search-reply-targets";
import { DocumentForm } from "../components/document-form";

/**
 * Düzenleme (8.4): yeni evrak formuyla aynı bileşen; yön/kayıt numarası salt
 * okunur, dosya yönetimi yoktur (detay sayfasında). Eşzamanlılık koruması
 * formun gizli updatedAt alanıyla sağlanır (5. bölüm md. 6).
 */
export async function DocumentEditView({ id }: { id: string }) {
  try {
    await requirePermission(documentsPermissions, "update");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const doc = await getDocumentDetail(id);
  if (!doc) notFound();

  // KARAR: Pasife alınmış kategori/sorumlu, kayıtta hâlâ seçiliyse formda
  // "(pasif)" etiketiyle seçenek listesine eklenir; böylece kayıt, bu alanları
  // değiştirmeden düzenlenebilir (validate-relations'taki karar ile uyumlu).
  const [activeCategories, activeAssignees, counterparties] = await Promise.all([
    listActiveCategoryOptions(),
    listActiveUserOptions(),
    listCounterparties(""),
  ]);

  const categories = [...activeCategories];
  if (doc.categoryId && !categories.some((c) => c.id === doc.categoryId)) {
    categories.push({ id: doc.categoryId, label: `${doc.categoryName ?? "Kategori"} (pasif)` });
  }

  const assignees = [...activeAssignees];
  if (doc.assigneeId && !assignees.some((a) => a.id === doc.assigneeId)) {
    assignees.push({ id: doc.assigneeId, label: `${doc.assigneeLabel ?? "Sorumlu"} (pasif)` });
  }

  // KARAR: Aday gelen evraklar yalnızca giden evrakta sorgulanır; kendi kendine
  // bağlamayı önlemek için evrağın kendi ID'si sonuçlardan çıkarılır. Mevcut
  // yanıtlanan evrak, listede yoksa bile seçiminin görünmesi için eklenir.
  let replyTargets = doc.direction === "OUTGOING" ? await searchReplyTargets("", doc.id) : [];
  if (
    doc.direction === "OUTGOING" &&
    doc.replyTo &&
    !replyTargets.some((target) => target.id === doc.replyTo?.id)
  ) {
    replyTargets = [
      {
        id: doc.replyTo.id,
        registryNumber: doc.replyTo.registryNumber,
        counterparty: doc.replyTo.counterparty,
        subject: doc.replyTo.subject,
        documentDate: doc.documentDate,
      },
      ...replyTargets,
    ];
  }

  return (
    <div>
      <PageHeader
        title="Evrağı düzenle"
        description={`${doc.registryNumber} — yön ve kayıt numarası değiştirilemez.`}
      />
      <DocumentForm
        mode="edit"
        document={{
          id: doc.id,
          direction: doc.direction,
          registryNumber: doc.registryNumber,
          documentDate: doc.documentDate,
          counterparty: doc.counterparty,
          referenceNumber: doc.referenceNumber,
          subject: doc.subject,
          summary: doc.summary,
          deliveryMethod: doc.deliveryMethod,
          status: doc.status,
          dueDate: doc.dueDate,
          categoryId: doc.categoryId,
          assigneeId: doc.assigneeId,
          replyToId: doc.replyTo?.id ?? null,
          updatedAt: doc.updatedAt,
        }}
        categories={categories}
        assignees={assignees}
        counterparties={counterparties.map((c) => c.value)}
        replyTargets={replyTargets}
        maxMb={getEnv().MAX_UPLOAD_MB}
      />
    </div>
  );
}
