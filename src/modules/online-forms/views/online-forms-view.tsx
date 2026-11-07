import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { listDirectChannels } from "@/modules/mailings/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { LinkButton } from "@/shared/components/ui/link-button";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";

import { OnlineFormsApp } from "../components/requests-app";
import { KINDS } from "../lib/schemas";
import { onlineFormsPermissions } from "../permissions";
import { listRequests } from "../services/requests";

/** /online-formlar — gönderilen bağlantılar; `?gonder=MEMBER:<id>` gönderim penceresini açar. */
export async function OnlineFormsView({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getTranslations("online-forms");
  let user;
  try {
    user = await requirePermission(onlineFormsPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const raw = (await searchParams).gonder;
  const [kind, subjectId] = typeof raw === "string" ? raw.split(":") : [];
  const send = can(user.role, onlineFormsPermissions, "create") && (KINDS as readonly string[]).includes(kind) && subjectId ? { kind: kind as (typeof KINDS)[number], subjectId: subjectId.slice(0, 64) } : null;
  const rawPerson = (await searchParams).kisi;
  const [personKind, personId] = typeof rawPerson === "string" ? rawPerson.split(":") : [];
  const person = (KINDS as readonly string[]).includes(personKind) && personId ? { kind: personKind as (typeof KINDS)[number], subjectId: personId.slice(0, 64) } : null;
  const [rows, channels] = await Promise.all([listRequests(person), listDirectChannels()]);
  return (
    <div>
      <PageHeader title={t("title")} description={t("description")} actions={can(user.role, onlineFormsPermissions, "approve") ? <LinkButton href="/online-formlar/ayarlar" variant="bordered">{t("settings.title")}</LinkButton> : null} />
      <OnlineFormsApp filtered={Boolean(person)} rows={rows} send={send} channels={channels.filter((key) => ["email", "sms", "whatsapp"].includes(key))} can={{ update: can(user.role, onlineFormsPermissions, "update") }} />
    </div>
  );
}
