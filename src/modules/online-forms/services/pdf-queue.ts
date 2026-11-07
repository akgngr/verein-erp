import "server-only";

import { enqueueTask } from "@/modules/automation/automation";
import { getEnv } from "@/shared/env";

import { renderSignedPdfTask } from "../automation";
import { storeEvidencePdf } from "./evidence-pdf";

/**
 * İmzalı PDF'i worker kuyruğuna alır. Otomasyon kapalıysa veya kuyruğa alınamazsa (modül pasif vb.) PDF
 * doğrudan üretilir. Hiçbir durumda imzayı geçersiz kılmaz.
 */
export async function queueSignedPdf(requestId: string): Promise<"queued" | "inline" | "failed"> {
  if (getEnv().AUTOMATION_ENABLED === "true") {
    try {
      await enqueueTask(renderSignedPdfTask, { requestId }, { sourceModule: "online-forms" });
      return "queued";
    } catch {
      // aşağıda doğrudan üretilir
    }
  }
  return storeEvidencePdf(requestId).then(() => "inline" as const, () => "failed" as const);
}
