import type { DeliveryMethod, DocumentDirection, DocumentStatus } from "@prisma/client";

/**
 * Evrak modülü satır/detay tipleri. passwordHash benzeri hassas alan içermez;
 * kullanıcılara yalnızca etiket (anlık görüntü) alanlarıyla referans verilir.
 */

/** Liste satırı (8.1) — dosya sayısı aktif (silinmemiş) dosyaların sayısıdır. */
export type DocumentListItem = {
  id: string;
  direction: DocumentDirection;
  registryNumber: string;
  registeredAt: Date;
  documentDate: Date;
  counterparty: string;
  referenceNumber: string | null;
  subject: string;
  status: DocumentStatus;
  dueDate: Date | null;
  /** Excel dışa aktarımındaki "Teslim Şekli" sütunu için taşınır (10. bölüm). */
  deliveryMethod: DeliveryMethod | null;
  categoryId: string | null;
  categoryName: string | null;
  assigneeId: string | null;
  assigneeLabel: string | null;
  fileCount: number;
  /** Sunucuda hesaplanır: dueDate bugünden önce + durum açık/işlemde (5. bölüm md. 3). */
  isOverdue: boolean;
};

/** Detay sayfası dosya satırı — yalnızca aktif (silinmemiş) dosyalar listelenir. */
export type DocumentFileItem = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedByLabel: string;
  createdAt: Date;
};

/** Detay sayfası işlem notu satırı. */
export type DocumentNoteItem = {
  id: string;
  body: string;
  authorLabel: string;
  createdAt: Date;
};

/** Detay sayfasında "bu evrağa verilen yanıtlar" satırı (yalnızca gelen evrakta). */
export type DocumentReplyItem = {
  id: string;
  registryNumber: string;
  counterparty: string;
  subject: string;
  status: DocumentStatus;
};

/** Detay sayfasında "yanıtlanan evrak" satırı (yalnızca giden evrakta). */
export type DocumentReplyToItem = {
  id: string;
  registryNumber: string;
  counterparty: string;
  subject: string;
};

/** Detay sayfası verisi (8.3) — get-document çıktısı. */
export type DocumentDetail = {
  id: string;
  direction: DocumentDirection;
  registryNumber: string;
  registeredAt: Date;
  documentDate: Date;
  counterparty: string;
  referenceNumber: string | null;
  subject: string;
  summary: string | null;
  deliveryMethod: DeliveryMethod | null;
  status: DocumentStatus;
  dueDate: Date | null;
  categoryId: string | null;
  categoryName: string | null;
  assigneeId: string | null;
  assigneeLabel: string | null;
  replyTo: DocumentReplyToItem | null;
  replies: DocumentReplyItem[];
  createdById: string;
  createdByLabel: string;
  createdAt: Date;
  updatedById: string | null;
  updatedByLabel: string | null;
  updatedAt: Date;
  files: DocumentFileItem[];
  notes: DocumentNoteItem[];
  isOverdue: boolean;
};

/** Kategori listesi satırı (8.5) — documentCount silinmemiş evrak sayısıdır. */
export type CategoryListItem = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  documentCount: number;
};

/** Otomatik tamamlama önerisi (list-counterparties). */
export type CounterpartyOption = { value: string };

/** "Yanıtlanan evrak" arama sonucu (search-reply-targets). */
export type ReplyTargetOption = {
  id: string;
  registryNumber: string;
  counterparty: string;
  subject: string;
  documentDate: Date;
};

/** Panel + liste üstü istatistik kartları (9. bölüm). */
export type DocumentStats = {
  open: number;
  inProgress: number;
  overdue: number;
  incomingThisMonth: number;
  outgoingThisMonth: number;
};

/** Sorumlu seçeneği (auth.listActiveUserOptions çıktısıyla aynı şekil). */
export type AssigneeOption = { id: string; label: string };

/** Kategori seçeneği (form + filtre). */
export type CategoryOption = { id: string; label: string };
