import type { ReactNode } from "react";

export type DataTableColumn<T> = {
  /** Sıralama alanıyla aynı ada sahip olmalıdır (9.2). */
  key: string;
  label: string;
  sortable?: boolean;
  align?: "start" | "center" | "end";
  /** KARAR: HeroUI/@react-types ColumnSize şablon literal tipi gerektirdiği için sayı kullanılır. */
  width?: number;
  render?: (row: T) => ReactNode;
};

export type DataTableFilter = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
};

export type DataTableRowAction = {
  key: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  onPress?: () => void;
  color?: "default" | "danger";
  /** true ise eylem menüde gösterilmez (yetki bazlı gizleme). */
  hidden?: boolean;
};

export type DataTableProps<T extends { id: string }> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  q?: string;
  searchPlaceholder?: string;
  filters?: DataTableFilter[];
  rowActions?: (row: T) => DataTableRowAction[];
  toolbarExtra?: ReactNode;
  emptyMessage?: string;
  /** Erişilebilirlik için tablo etiketi. */
  ariaLabel?: string;
};

/** Liste araç çubuğu (toolbar) bağlamı — documents DocumentToolbar gibi
 * modül-özel araç çubukları DataTable ile aynı arama draftını paylaşır. */
export type DataTableToolbarContext = {
  idPrefix: string;
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
};
