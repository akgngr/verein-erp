/**
 * `pnpm module:create` şablonları — saf fonksiyon (dosya yazmaz; testlerde de kullanılır).
 *
 * Üretilen modül ilk andan itibaren ÇALIŞIR ve tüm kurallardan geçer: liste (arama,
 * durum filtresi, sıralama, sayfalama), sağ çekmecede oluşturma/düzenleme formu
 * (`?yeni` / `?duzenle=<id>`), silme onayı, denetim kaydı, TR/DE çeviriler.
 * Kurallar: sunucu dosyalarında HeroUI yok; tüm metinler messages/<dil>.json'dan;
 * zod/ActionError mesajları çeviri anahtarı; "use client" ilk satır.
 */

export type ScaffoldNames = {
  /** URL ve klasör adı: "sponsors" */
  key: string;
  /** Bileşen/tip öneki: "Sponsors" */
  pascal: string;
  /** Prisma model erişimi: "sponsorsItem" */
  model: string;
  labelTr: string;
  labelDe: string;
  descriptionTr: string;
  descriptionDe: string;
};

function toPascalCase(value: string): string {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function scaffoldNames(
  rawKey: string,
  labels: { labelTr?: string; labelDe?: string; descriptionTr?: string; descriptionDe?: string } = {},
): ScaffoldNames {
  const key = rawKey.toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!/^[a-z][a-z0-9-]*$/.test(key)) {
    throw new Error("Geçerli bir modül anahtarı belirtilmelidir (küçük harf, rakam, tire; örn: sponsors).");
  }
  const pascal = toPascalCase(key);
  const labelTr = labels.labelTr || pascal;
  const labelDe = labels.labelDe || labelTr;
  return {
    key,
    pascal,
    model: `${pascal.charAt(0).toLowerCase()}${pascal.slice(1)}Item`,
    labelTr,
    labelDe,
    descriptionTr: labels.descriptionTr || `${labelTr} kayıtlarının yönetimi.`,
    descriptionDe: labels.descriptionDe || `Verwaltung der Einträge: ${labelDe}.`,
  };
}

/** Modül çeviri anahtarlarının TR/DE metinleri (aynı yapı; eksik çeviri derlemede yakalanır). */
function messages(n: ScaffoldNames, locale: "tr" | "de") {
  const tr = locale === "tr";
  const label = tr ? n.labelTr : n.labelDe;
  return {
    nav: { [n.key]: label },
    module: { label, description: tr ? n.descriptionTr : n.descriptionDe },
    meta: { list: label },
    title: label,
    description: tr ? n.descriptionTr : n.descriptionDe,
    newItem: tr ? "Yeni kayıt" : "Neuer Eintrag",
    table: {
      aria: tr ? `${label} listesi` : `${label} – Liste`,
      title: tr ? "Başlık" : "Titel",
      status: tr ? "Durum" : "Status",
      updatedAt: tr ? "Son değişiklik" : "Zuletzt geändert",
      active: tr ? "Aktif" : "Aktiv",
      passive: tr ? "Pasif" : "Inaktiv",
      search: tr ? "Başlık veya açıklama ara..." : "Titel oder Beschreibung suchen...",
      empty: tr ? "Henüz kayıt yok. 'Yeni kayıt' ile ilk kaydı ekleyin." : "Noch keine Einträge. Legen Sie mit „Neuer Eintrag“ den ersten an.",
      edit: tr ? "Düzenle" : "Bearbeiten",
      delete: tr ? "Sil" : "Löschen",
      deleteTitle: tr ? "Kaydı sil" : "Eintrag löschen",
      deleteMessage: tr ? "\"{title}\" kalıcı olarak silinecek. Onaylıyor musunuz?" : "„{title}“ wird dauerhaft gelöscht. Fortfahren?",
      deleted: tr ? "Kayıt silindi." : "Eintrag gelöscht.",
    },
    form: {
      createTitle: tr ? "Yeni kayıt" : "Neuer Eintrag",
      editTitle: tr ? "Kaydı düzenle" : "Eintrag bearbeiten",
      title: tr ? "Başlık" : "Titel",
      description: tr ? "Açıklama" : "Beschreibung",
      isActive: tr ? "Aktif" : "Aktiv",
      save: tr ? "Kaydet" : "Speichern",
      cancel: tr ? "Vazgeç" : "Abbrechen",
      created: tr ? "Kayıt oluşturuldu." : "Eintrag angelegt.",
      updated: tr ? "Kayıt güncellendi." : "Eintrag aktualisiert.",
    },
    errors: {
      notFound: tr ? "Kayıt bulunamadı." : "Eintrag nicht gefunden.",
    },
    validation: {
      titleRequired: tr ? "Başlık zorunludur." : "Titel ist erforderlich.",
      titleMax: tr ? "Başlık en fazla 200 karakter olabilir." : "Der Titel darf höchstens 200 Zeichen lang sein.",
      descriptionMax: tr ? "Açıklama en fazla 2000 karakter olabilir." : "Die Beschreibung darf höchstens 2000 Zeichen lang sein.",
    },
  };
}

/** Yayınlanan dosyalar: modül klasörüne göre yol → içerik. */
export function moduleFiles(n: ScaffoldNames): Record<string, string> {
  const { key, pascal, model } = n;
  const perm = `${model.replace(/Item$/, "")}Permissions`;
  const files: Record<string, string> = {};

  files["permissions.ts"] = `import { definePermissions } from "@/shared/permissions/define";

export const ${perm} = definePermissions("${key}", {
  ADMIN: ["view", "create", "update", "delete", "approve"],
  BOARD: ["view", "create", "update"],
  SECRETARY: ["view", "create", "update"],
  TREASURER: ["view"],
  AUDITOR: ["view"],
  TEACHER: [],
  VIEWER: ["view"],
});
`;

  files["module.config.ts"] = `import { Package } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";

import { ${perm} } from "./permissions";

/**
 * label/description yalnızca yedek metindir; görünen adlar messages/<dil>.json
 * içindeki nav.${key} ve module.{label,description} anahtarlarından gelir.
 */
export const moduleConfig: ModuleConfig = {
  key: "${key}",
  label: "${n.labelTr}",
  description: "${n.descriptionTr}",
  category: "EXTENSION",
  hasSchema: true,
  nav: [
    {
      href: "/${key}",
      label: "${n.labelTr}",
      labelKey: "${key}",
      icon: Package,
      group: "main",
      order: 50,
      permission: { definition: ${perm}, action: "view" },
    },
  ],
  // Alt sayfa eklendiğinde sol panel menüsü (etiketler messages/<dil>.json → "menu.<key>"):
  // menu: [
  //   { key: "export", label: "Excel'e aktar", href: "/api/${key}/export", icon: Download, isDownload: true },
  // ],
};
`;

  files["schema.prisma"] = `model ${pascal}Item {
  id          String   @id @default(uuid())
  title       String
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([title])
  @@map("${key.replace(/-/g, "_")}_items")
}
`;

  files["types.ts"] = `/** Liste ve form satırı (Prisma modelinden bağımsız, istemciye geçen veri). */
export type ${pascal}Row = {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
`;

  files["schemas/item-schema.ts"] = `import { z } from "zod";

/** Mesajlar çeviri anahtarıdır (messages/<dil>.json → validation); form ve action aynı şemayı kullanır. */
export const ${model}Schema = z.object({
  title: z.string().trim().min(1, "${key}.validation.titleRequired").max(200, "${key}.validation.titleMax"),
  description: z.string().trim().max(2000, "${key}.validation.descriptionMax"),
  isActive: z.boolean(),
});

export const ${model}UpdateSchema = ${model}Schema.extend({ id: z.string().min(1) });
export const ${model}DeleteSchema = z.object({ id: z.string().min(1) });

export type ${pascal}ItemInput = z.infer<typeof ${model}Schema>;
`;

  files["queries/list-items.ts"] = `import "server-only";

import type { Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";
import type { ListParams, ListResult } from "@/shared/list-params";

import type { ${pascal}Row } from "../types";

export const ITEM_SORTABLE_FIELDS = ["title", "updatedAt", "createdAt"] as const;
export const ITEM_DEFAULT_SORT = "updatedAt";

/** Liste sorgusu: arama (başlık/açıklama), durum filtresi, sıralama ve sayfalama. */
export async function list${pascal}Items(params: ListParams<"status">): Promise<ListResult<${pascal}Row>> {
  const where: Prisma.${pascal}ItemWhereInput = {
    ...(params.q
      ? {
          OR: [
            { title: { contains: params.q, mode: "insensitive" } },
            { description: { contains: params.q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(params.filters.status ? { isActive: params.filters.status === "active" } : {}),
  };
  const db = getDb();
  const [rows, total] = await Promise.all([
    db.${model}.findMany({
      where,
      orderBy: { [params.sort]: params.dir },
      skip: params.skip,
      take: params.take,
    }),
    db.${model}.count({ where }),
  ]);
  return { rows, total, page: params.page, pageSize: params.pageSize };
}

export async function get${pascal}Item(id: string): Promise<${pascal}Row | null> {
  return getDb().${model}.findUnique({ where: { id } });
}
`;

  files["actions/item-actions.ts"] = `"use server";

import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { ${perm} } from "../permissions";
import { ${model}DeleteSchema, ${model}Schema, ${model}UpdateSchema } from "../schemas/item-schema";

/** Oluşturma: yetki + şema createAction'da; denetim kaydına yalnızca başlık yazılır. */
export async function create${pascal}ItemAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: ${perm}, action: "create" },
    schema: ${model}Schema,
    handler: async ({ input, audit }) => {
      const created = await getDb().${model}.create({
        data: { title: input.title, description: input.description || null, isActive: input.isActive },
      });
      await audit({ action: "CREATE", entity: "${pascal}Item", entityId: created.id, after: { title: created.title } });
      return { id: created.id };
    },
  });
  return run(input);
}

export async function update${pascal}ItemAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: ${perm}, action: "update" },
    schema: ${model}UpdateSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      const existing = await db.${model}.findUnique({ where: { id: input.id } });
      if (!existing) throw new ActionError("${key}.errors.notFound");
      const updated = await db.${model}.update({
        where: { id: existing.id },
        data: { title: input.title, description: input.description || null, isActive: input.isActive },
      });
      await audit({
        action: "UPDATE",
        entity: "${pascal}Item",
        entityId: updated.id,
        before: { title: existing.title, isActive: existing.isActive },
        after: { title: updated.title, isActive: updated.isActive },
      });
      return { id: updated.id };
    },
  });
  return run(input);
}

export async function delete${pascal}ItemAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: ${perm}, action: "delete" },
    schema: ${model}DeleteSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      const existing = await db.${model}.findUnique({ where: { id: input.id } });
      if (!existing) throw new ActionError("${key}.errors.notFound");
      await db.${model}.delete({ where: { id: existing.id } });
      await audit({ action: "DELETE", entity: "${pascal}Item", entityId: existing.id, before: { title: existing.title } });
      return { id: existing.id };
    },
  });
  return run(input);
}
`;

  files["components/item-form.tsx"] = `"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addToast, Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { applyActionResult } from "@/shared/components/forms/action-result";
import { FormSurface, useFormDrawerClose } from "@/shared/components/forms/form-drawer";
import { FormErrorSummary } from "@/shared/components/forms/form-error-summary";
import { FormInput } from "@/shared/components/forms/form-input";
import { FormSwitch } from "@/shared/components/forms/form-switch";
import { FormTextarea } from "@/shared/components/forms/form-textarea";
import { SubmitButton } from "@/shared/components/forms/submit-button";

import { create${pascal}ItemAction, update${pascal}ItemAction } from "../actions/item-actions";
import { ${model}Schema, type ${pascal}ItemInput } from "../schemas/item-schema";
import type { ${pascal}Row } from "../types";

/** Oluşturma/düzenleme formu; sağ çekmecede açılır (views/item-*-view.tsx). */
export function ${pascal}ItemForm({ item }: { item?: ${pascal}Row }) {
  const t = useTranslations("${key}.form");
  const router = useRouter();
  const closeDrawer = useFormDrawerClose();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<${pascal}ItemInput>({
    resolver: zodResolver(${model}Schema),
    defaultValues: {
      title: item?.title ?? "",
      description: item?.description ?? "",
      isActive: item?.isActive ?? true,
    },
  });

  const close = () => (closeDrawer ? closeDrawer() : router.push("/${key}"));

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const result = item
      ? await update${pascal}ItemAction({ id: item.id, ...values })
      : await create${pascal}ItemAction(values);
    if (!result.ok) {
      setFormError(applyActionResult(result, form.setError));
      return;
    }
    addToast({ title: item ? t("updated") : t("created"), color: "success" });
    close();
  });

  return (
    <FormSurface className="max-w-2xl">
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <FormInput name="title" label={t("title")} control={form.control} isRequired />
        <FormTextarea name="description" label={t("description")} control={form.control} />
        <FormSwitch name="isActive" label={t("isActive")} control={form.control} />
        <FormErrorSummary message={formError} />
        <div className="flex items-center gap-2">
          <SubmitButton isSubmitting={form.formState.isSubmitting}>{t("save")}</SubmitButton>
          <Button variant="light" onPress={close}>
            {t("cancel")}
          </Button>
        </div>
      </form>
    </FormSurface>
  );
}
`;

  files["components/item-table.tsx"] = `"use client";

import { addToast, Chip } from "@heroui/react";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { DataTable } from "@/shared/components/data-table/data-table";
import type { DataTableColumn } from "@/shared/components/data-table/types";
import { useFormDrawerHref } from "@/shared/components/forms/form-drawer";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { formatDateTime } from "@/shared/utils";

import { delete${pascal}ItemAction } from "../actions/item-actions";
import type { ${pascal}Row } from "../types";

export function ${pascal}ItemTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
  q,
  canUpdate,
  canDelete,
}: {
  rows: ${pascal}Row[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  q?: string;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const t = useTranslations("${key}.table");
  const router = useRouter();
  const drawerHref = useFormDrawerHref();
  const [deleting, setDeleting] = useState<${pascal}Row | null>(null);

  const columns: DataTableColumn<${pascal}Row>[] = [
    { key: "title", label: t("title"), sortable: true },
    {
      key: "isActive",
      label: t("status"),
      render: (row) => (
        <Chip size="sm" variant="flat" color={row.isActive ? "success" : "default"}>
          {row.isActive ? t("active") : t("passive")}
        </Chip>
      ),
    },
    { key: "updatedAt", label: t("updatedAt"), sortable: true, render: (row) => formatDateTime(row.updatedAt) },
  ];

  return (
    <>
      <DataTable<${pascal}Row>
        ariaLabel={t("aria")}
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        sort={sort}
        dir={dir}
        q={q}
        searchPlaceholder={t("search")}
        filters={[
          {
            key: "status",
            label: t("status"),
            options: [
              { value: "active", label: t("active") },
              { value: "passive", label: t("passive") },
            ],
          },
        ]}
        emptyMessage={t("empty")}
        rowActions={(row) => [
          {
            key: "edit",
            label: t("edit"),
            icon: <Pencil className="h-4 w-4" />,
            href: drawerHref("duzenle", row.id),
            hidden: !canUpdate,
          },
          {
            key: "delete",
            label: t("delete"),
            icon: <Trash2 className="h-4 w-4" />,
            color: "danger",
            onPress: () => setDeleting(row),
            hidden: !canDelete,
          },
        ]}
      />
      <ConfirmDialog
        isOpen={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={t("deleteTitle")}
        message={deleting ? t("deleteMessage", { title: deleting.title }) : ""}
        confirmLabel={t("delete")}
        confirmColor="danger"
        onConfirm={async () => {
          if (!deleting) return;
          const result = await delete${pascal}ItemAction({ id: deleting.id });
          if (!result.ok) {
            addToast({ title: result.error, color: "danger" });
            return;
          }
          addToast({ title: t("deleted"), color: "success" });
          setDeleting(null);
          router.refresh();
        }}
      />
    </>
  );
}
`;

  files["views/item-create-view.tsx"] = `import { getTranslations } from "next-intl/server";

import { FormDrawer } from "@/shared/components/forms/form-drawer";

import { ${pascal}ItemForm } from "../components/item-form";

/** Yeni kayıt çekmecesi (liste sayfasında \`?yeni\`). Yetki listede denetlenir. */
export async function ${pascal}ItemCreateView() {
  const t = await getTranslations("${key}.form");
  return (
    <FormDrawer title={t("createTitle")}>
      <${pascal}ItemForm />
    </FormDrawer>
  );
}
`;

  files["views/item-edit-view.tsx"] = `import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/shared/components/ui/empty-state";
import { FormDrawer } from "@/shared/components/forms/form-drawer";

import { ${pascal}ItemForm } from "../components/item-form";
import { get${pascal}Item } from "../queries/list-items";

/** Düzenleme çekmecesi (liste sayfasında \`?duzenle=<id>\`). */
export async function ${pascal}ItemEditView({ id }: { id: string }) {
  const t = await getTranslations("${key}");
  const item = await get${pascal}Item(id);
  return (
    <FormDrawer title={t("form.editTitle")} description={item?.title}>
      {item ? <${pascal}ItemForm item={item} /> : <EmptyState title={t("errors.notFound")} />}
    </FormDrawer>
  );
}
`;

  files["views/item-list-view.tsx"] = `import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { FormDrawerButton } from "@/shared/components/forms/form-drawer";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { parseListParams, type RawSearchParams } from "@/shared/list-params";
import { can } from "@/shared/permissions/define";

import { ${pascal}ItemTable } from "../components/item-table";
import { ${perm} } from "../permissions";
import { ITEM_DEFAULT_SORT, ITEM_SORTABLE_FIELDS, list${pascal}Items } from "../queries/list-items";
import { ${pascal}ItemCreateView } from "./item-create-view";
import { ${pascal}ItemEditView } from "./item-edit-view";

/**
 * Sunucu view'ı: HeroUI içe AKTARMAZ (istemci gerektiren her şey components/ altında).
 * Form çekmecesi URL'den açılır: \`?yeni\` → oluşturma, \`?duzenle=<id>\` → düzenleme.
 */
export async function ${pascal}ListView({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  let user;
  try {
    user = await requirePermission(${perm}, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const t = await getTranslations("${key}");
  const raw = await searchParams;
  const params = parseListParams(raw, {
    sortableFields: ITEM_SORTABLE_FIELDS,
    defaultSort: ITEM_DEFAULT_SORT,
    defaultDir: "desc",
    filterKeys: ["status"],
  });
  const list = await list${pascal}Items(params);

  const canCreate = can(user.role, ${perm}, "create");
  const canUpdate = can(user.role, ${perm}, "update");
  const canDelete = can(user.role, ${perm}, "delete");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          canCreate ? (
            <FormDrawerButton param="yeni" startIcon={<Plus className="h-4 w-4" />}>
              {t("newItem")}
            </FormDrawerButton>
          ) : null
        }
      />
      <${pascal}ItemTable
        rows={list.rows}
        total={list.total}
        page={list.page}
        pageSize={list.pageSize}
        sort={params.sort}
        dir={params.dir}
        q={params.q}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
      {canCreate && raw.yeni !== undefined ? <${pascal}ItemCreateView /> : null}
      {canUpdate && typeof raw.duzenle === "string" && raw.duzenle ? <${pascal}ItemEditView id={raw.duzenle} /> : null}
    </div>
  );
}
`;

  files["page.tsx"] = `import { getTranslations } from "next-intl/server";

import { ${pascal}ListView } from "./ui";

export async function generateMetadata() {
  const t = await getTranslations("${key}.meta");
  return { title: t("list") };
}

/** Modül ana sayfası (/${key}) — ince rota; köprüyü \`pnpm module:sync\` üretir. */
export default function ${pascal}Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <${pascal}ListView searchParams={searchParams} />;
}
`;

  files["ui.ts"] = `// ${key} modülü — UI public girişi
export { ${pascal}ListView } from "./views/item-list-view";
`;

  files["server.ts"] = `// ${key} modülü — sunucu public girişi
import "server-only";

export { ${perm} } from "./permissions";
export { list${pascal}Items, get${pascal}Item } from "./queries/list-items";
`;

  files["index.ts"] = `// ${key} modülü — izomorfik public giriş (istemci + sunucu)
export { ${perm} } from "./permissions";
export { moduleConfig } from "./module.config";
`;

  files["messages/tr.json"] = JSON.stringify(messages(n, "tr"), null, 2) + "\n";
  files["messages/de.json"] = JSON.stringify(messages(n, "de"), null, 2) + "\n";
  return files;
}
