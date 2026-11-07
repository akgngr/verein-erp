import "server-only";

import { listUsableModuleKeys } from "@/modules/system/automation";
import { can } from "@/shared/permissions/define";
import type { Role } from "@/shared/roles";

import { mailingsPermissions } from "../permissions";
import { listSources } from "./campaigns";

/**
 * Diğer modüllerin "Katılımcılara duyur" kısayolu: Kampanyalar etkin, kullanıcı kampanya oluşturabiliyor ve
 * alıcı kaynağını kullanabiliyorsa sihirbazı kaynak + filtreyle açan bağlantı; değilse null.
 */
export async function campaignShortcutHref(role: Role, sourceId: string, filter: Record<string, string>): Promise<string | null> {
  if (!(await listUsableModuleKeys()).includes("mailings")) return null;
  if (!can(role, mailingsPermissions, "create")) return null;
  if (!(await listSources(role)).some((source) => source.id === sourceId)) return null;
  const params = new URLSearchParams({ kaynak: sourceId });
  for (const [key, value] of Object.entries(filter)) params.append("filtre", `${key}=${value}`);
  return `/toplu-eposta?${params}`;
}
