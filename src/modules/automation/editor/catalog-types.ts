/** Serializable catalog handed from the server view to the client editor. */
export type CatalogField = {
  name: string;
  label: string;
  help: string;
  type: "string" | "number" | "boolean" | "enum";
  options?: { value: string; label: string }[];
  multiline: boolean;
  required: boolean;
  hidden: boolean;
  defaultValue: unknown;
};

export type EditorCatalog = {
  tasks: { key: string; module: string; label: string; description: string; fields: CatalogField[] }[];
  events: {
    key: string;
    module: string;
    label: string;
    /** Payload fields; `options` for enum fields (used by condition value lists). */
    fields: { name: string; label: string; type: "string" | "number" | "boolean"; help: string; options?: { value: string; label: string }[] }[];
    /** Record fields usable as {{namespace.field}} in task texts (loaded at send time). */
    variables?: { namespace: string; fields: { name: string; label: string }[] };
  }[];
};
