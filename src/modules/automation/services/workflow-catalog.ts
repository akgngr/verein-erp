import "server-only";

import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { taskModuleKey } from "@/shared/automation/define";

import type { CatalogField, EditorCatalog } from "../editor/catalog-types";
import { automationEvents, automationTasks } from "../tasks/registry";

type JsonProp = { type?: string; enum?: unknown[]; format?: string; maxLength?: number; minimum?: number };

/** Translate "<module>.automation.<group>.<name>.<rest>" with a readable fallback. */
async function translatorFor(moduleKey: string) {
  const t = await getTranslations();
  return (path: string, fallback: string) => {
    const key = `${moduleKey}.automation.${path}`;
    return t.has(key as never) ? t(key as never) : fallback;
  };
}

const humanize = (name: string) => name.replace(/[_-]+/g, " ").replace(/^./, (c) => c.toUpperCase());

/**
 * Editor catalog: only workflow-enabled tasks and registered events, with
 * labels from each owning module's messages and field types derived from the
 * task's input schema. Fields whose default is a reference such as {{uuid}}
 * are filled automatically and hidden from the user.
 */
export async function buildEditorCatalog(): Promise<EditorCatalog> {
  const tasks: EditorCatalog["tasks"] = [];
  for (const task of automationTasks) {
    if (!task.workflow) continue;
    const moduleKey = taskModuleKey(task.key);
    const name = task.key.slice(moduleKey.length + 1);
    const tr = await translatorFor(moduleKey);
    const json = z.toJSONSchema(task.inputSchema) as { properties?: Record<string, JsonProp>; required?: string[] };
    const defaults = task.workflow.defaultInput ?? {};
    const fields: CatalogField[] = Object.entries(json.properties ?? {}).map(([field, prop]) => {
      const fallback = defaults[field];
      return {
        name: field,
        label: tr(`tasks.${name}.fields.${field}`, humanize(field)),
        help: tr(`tasks.${name}.help.${field}`, ""),
        type: prop.enum ? "enum" : prop.type === "number" || prop.type === "integer" ? "number" : prop.type === "boolean" ? "boolean" : "string",
        options: prop.enum?.map((value) => ({ value: String(value), label: tr(`tasks.${name}.options.${field}.${String(value)}`, String(value)) })),
        multiline: (prop.maxLength ?? 0) > 500,
        required: (json.required ?? []).includes(field),
        hidden: typeof fallback === "string" && fallback.startsWith("{{"),
        defaultValue: fallback ?? (prop.enum ? String(prop.enum[0]) : prop.type === "number" ? undefined : ""),
      };
    });
    tasks.push({
      key: task.key,
      module: moduleKey,
      label: tr(`tasks.${name}.label`, humanize(name)),
      description: tr(`tasks.${name}.description`, task.description),
      fields,
    });
  }

  const events: EditorCatalog["events"] = [];
  for (const event of automationEvents) {
    const moduleKey = taskModuleKey(event.key);
    const name = event.key.slice(moduleKey.length + 1);
    const tr = await translatorFor(moduleKey);
    const json = z.toJSONSchema(event.payloadSchema) as { properties?: Record<string, JsonProp> };
    events.push({
      key: event.key,
      module: moduleKey,
      label: tr(`events.${name}.label`, humanize(name)),
      fields: Object.entries(json.properties ?? {}).map(([field, prop]) => ({
        name: field,
        label: tr(`events.${name}.fields.${field}`, humanize(field)),
        type: (prop.type === "number" || prop.type === "integer" ? "number" : prop.type === "boolean" ? "boolean" : "string") as "string" | "number" | "boolean",
        help: tr(`events.${name}.help.${field}`, ""),
        options: prop.enum?.map((value) => ({ value: String(value), label: tr(`events.${name}.options.${field}.${String(value)}`, String(value)) })),
      })),
      variables: event.variables
        ? {
          namespace: event.variables.namespace,
          fields: event.variables.fields.map((field) => ({ name: field, label: tr(`events.${name}.variables.${field}`, humanize(field)) })),
        }
        : undefined,
    });
  }
  return { tasks, events };
}
