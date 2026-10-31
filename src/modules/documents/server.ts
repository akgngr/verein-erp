import "server-only";

// documents modülü — sunucu public girişi (3.4)
// queries / services / actions / handlers bu dosya üzerinden dışa aktarılır.

export {
  DOCUMENT_SORTABLE_FIELDS,
  DOCUMENT_DEFAULT_SORT,
  type DocumentListFilterKeys,
} from "./queries/list-documents";
export { listDocuments, listDocumentsForExport } from "./queries/list-documents";
export { getDocumentDetail } from "./queries/get-document";
export { getDocumentStats } from "./queries/get-document-stats";
export { listCategories, listActiveCategoryOptions } from "./queries/list-categories";
export { listCounterparties } from "./queries/list-counterparties";
export { searchReplyTargets } from "./queries/search-reply-targets";

// Server action'lar (istemci bileşenler prop yoluyla ya da modül içinden import eder).
export { createDocumentAction } from "./actions/create-document";
export { updateDocumentAction } from "./actions/update-document";
export { changeStatusAction } from "./actions/change-status";
export { deleteDocumentAction } from "./actions/delete-document";
export { addNoteAction } from "./actions/add-note";
export { deleteFileAction } from "./actions/delete-file";
export {
  createCategoryAction,
  updateCategoryAction,
  setCategoryActiveAction,
} from "./actions/category-actions";

// Route handler'lar (src/app/api dosyaları bu fonksiyonları çağıran ince sarmalayıcılardır).
export { uploadFileHandler } from "./handlers/upload-file";
export { downloadFileHandler } from "./handlers/download-file";
export { exportDocumentsHandler } from "./handlers/export-documents";
export { getDocumentFileText } from "./queries/file-text";
