import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/shared/components/ui/page-header";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";

import { FilesTable } from "../components/files-table";
import { FILES_RETENTION_DAYS } from "../constants";
import { deleteGeneratedFileAction } from "../actions/files";
import { exportsPermissions } from "../permissions";
import { listGeneratedFiles } from "../services/files";

/** /dosyalar — kullanıcının oluşturduğu dosyalar (yalnızca kendisininkiler). */
export async function FilesView() {
  let user;
  try {
    user = await requirePermission(exportsPermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const [files, t] = await Promise.all([listGeneratedFiles(user.id), getTranslations("exports")]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description", { days: FILES_RETENTION_DAYS })} />
      <FilesTable
        files={files.map((file) => ({ ...file, createdAt: file.createdAt.toISOString(), expiresAt: file.expiresAt.toISOString() }))}
        deleteAction={deleteGeneratedFileAction}
      />
    </div>
  );
}
