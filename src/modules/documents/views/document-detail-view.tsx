import { AlertTriangle, FileText, Link2, Paperclip } from "lucide-react";
import { notFound } from "next/navigation";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";

import { getDocumentDetail } from "../queries/get-document";
import { documentsPermissions } from "../permissions";
import { DELIVERY_METHOD_LABELS } from "../constants";
import { formatDate, formatDateTime } from "@/shared/utils";
import { DocumentDetailActions } from "../components/document-detail-actions";
import { DirectionBadge } from "../components/direction-badge";
import { FileList } from "../components/file-list";
import { FileUploader } from "../components/file-uploader";
import { NotesTimeline } from "../components/notes-timeline";
import { StatusBadge } from "../components/status-badge";
import { getEnv } from "@/shared/env";

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-default-100 py-2 last:border-none">
      <span className="text-tiny font-medium uppercase tracking-wide text-default-400">{label}</span>
      <span className="text-small text-foreground">{children}</span>
    </div>
  );
}

/** Evrak detayı (8.3): bilgi kartı, dosyalar, ilişkili evrak, işlem notları. */
export async function DocumentDetailView({ id }: { id: string }) {
  let user;
  try {
    user = await requirePermission(documentsPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const doc = await getDocumentDetail(id);
  if (!doc) notFound();

  const canUpdate = can(user.role, documentsPermissions, "update");
  const canDelete = can(user.role, documentsPermissions, "delete");

  return (
    <div>
      <PageHeader
        title={doc.registryNumber}
        description={doc.subject}
        actions={
          <DocumentDetailActions
            documentId={doc.id}
            registryNumber={doc.registryNumber}
            status={doc.status}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        }
      />

      {doc.isOverdue ? (
        <div
          role="alert"
          className="mb-4 flex items-center gap-2 rounded-medium border border-danger-200 bg-danger-50 px-4 py-3 text-small text-danger-600 dark:border-danger-100 dark:bg-danger-100/20"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            Bu evrağın son işlem tarihi ({formatDate(doc.dueDate)}) geçmiştir; durumu açık veya
            işlemde olarak görünmeye devam ediyor.
          </span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Bilgi kartı */}
        <div className="rounded-medium border border-default-200 bg-content1 p-5 shadow-sm lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <DirectionBadge direction={doc.direction} />
            <StatusBadge status={doc.status} />
            <span className="text-tiny text-default-400">{doc.registryNumber}</span>
          </div>
          <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            <InfoRow label={doc.direction === "INCOMING" ? "Gönderen" : "Alıcı"}>
              {doc.counterparty}
            </InfoRow>
            <InfoRow label="Karşı tarafın evrak sayısı">{doc.referenceNumber ?? "-"}</InfoRow>
            <InfoRow label="Evrak tarihi">{formatDate(doc.documentDate)}</InfoRow>
            <InfoRow label="Kayıt tarihi">{formatDateTime(doc.registeredAt)}</InfoRow>
            <InfoRow label="Teslim şekli">
              {doc.deliveryMethod ? DELIVERY_METHOD_LABELS[doc.deliveryMethod] : "-"}
            </InfoRow>
            <InfoRow label="Kategori">{doc.categoryName ?? "-"}</InfoRow>
            <InfoRow label="Sorumlu">{doc.assigneeLabel ?? "-"}</InfoRow>
            <InfoRow label="Son işlem tarihi">{formatDate(doc.dueDate)}</InfoRow>
            <InfoRow label="Oluşturan">
              {`${doc.createdByLabel} — ${formatDateTime(doc.createdAt)}`}
            </InfoRow>
            <InfoRow label="Son güncelleyen">
              {doc.updatedByLabel ? `${doc.updatedByLabel} — ${formatDateTime(doc.updatedAt)}` : "-"}
            </InfoRow>
          </div>
          {doc.summary ? (
            <div className="mt-3 rounded-medium bg-default-50 px-4 py-3">
              <p className="text-tiny font-medium uppercase tracking-wide text-default-400">Özet</p>
              <p className="mt-1 whitespace-pre-wrap text-small text-foreground">{doc.summary}</p>
            </div>
          ) : null}
        </div>

        {/* İlişkili evrak */}
        <div className="rounded-medium border border-default-200 bg-content1 p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-small font-semibold">
            <Link2 className="h-4 w-4 text-default-400" aria-hidden />
            İlişkili evrak
          </h2>
          {doc.direction === "OUTGOING" ? (
            <div>
              <p className="text-tiny font-medium uppercase tracking-wide text-default-400">
                Yanıtlanan evrak
              </p>
              {doc.replyTo ? (
                <a
                  href={`/evrak/${doc.replyTo.id}`}
                  className="mt-1 block rounded-small border border-default-200 px-3 py-2 text-small transition-colors hover:border-primary-300 hover:bg-primary-50/40"
                >
                  <span className="font-medium">{doc.replyTo.registryNumber}</span>
                  <span className="block text-tiny text-default-500">
                    {doc.replyTo.counterparty} — {doc.replyTo.subject}
                  </span>
                </a>
              ) : (
                <p className="mt-1 text-small text-default-500">-</p>
              )}
            </div>
          ) : null}
          {doc.direction === "INCOMING" ? (
            <div>
              <p className="text-tiny font-medium uppercase tracking-wide text-default-400">
                Bu evrağa verilen yanıtlar
              </p>
              {doc.replies.length > 0 ? (
                <ul className="mt-1 flex flex-col gap-2">
                  {doc.replies.map((reply) => (
                    <li key={reply.id}>
                      <a
                        href={`/evrak/${reply.id}`}
                        className="block rounded-small border border-default-200 px-3 py-2 text-small transition-colors hover:border-primary-300 hover:bg-primary-50/40"
                      >
                        <span className="font-medium">{reply.registryNumber}</span>
                        <span className="block text-tiny text-default-500">
                          {reply.counterparty} — {reply.subject}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-small text-default-500">Henüz yanıt bağlanmamış.</p>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Dosyalar */}
      <div className="mt-4 rounded-medium border border-default-200 bg-content1 p-5 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-small font-semibold">
          <Paperclip className="h-4 w-4 text-default-400" aria-hidden />
          Dosyalar
        </h2>
        <FileList files={doc.files} canUpdate={canUpdate} />
        {canUpdate ? (
          <div className="mt-4">
            <FileUploader
              mode="detail"
              documentId={doc.id}
              existingCount={doc.files.length}
              maxMb={getEnv().MAX_UPLOAD_MB}
            />
          </div>
        ) : null}
      </div>

      {/* İşlem notları */}
      <div className="mt-4 rounded-medium border border-default-200 bg-content1 p-5 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-small font-semibold">
          <FileText className="h-4 w-4 text-default-400" aria-hidden />
          İşlem notları
        </h2>
        <NotesTimeline documentId={doc.id} notes={doc.notes} canUpdate={canUpdate} />
      </div>
    </div>
  );
}
