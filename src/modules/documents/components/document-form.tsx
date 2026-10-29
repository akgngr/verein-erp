"use client";

import { useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, CardBody, addToast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";

import { applyActionResult } from "@/shared/components/forms/action-result";
import { FormDatePicker } from "@/shared/components/forms/form-date-picker";
import { FormErrorSummary } from "@/shared/components/forms/form-error-summary";
import { FormInput } from "@/shared/components/forms/form-input";
import { FormSelect } from "@/shared/components/forms/form-select";
import { FormTextarea } from "@/shared/components/forms/form-textarea";
import { SubmitButton } from "@/shared/components/forms/submit-button";

import type { DocumentDirection } from "@prisma/client";

import { createDocumentAction } from "../actions/create-document";
import { updateDocumentAction } from "../actions/update-document";
import { DEFAULT_STATUS_BY_DIRECTION, DELIVERY_METHOD_VALUES, STATUS_VALUES } from "../constants";
import { documentCreateSchema, documentUpdateSchema } from "../schemas/document";
import type { AssigneeOption, CategoryOption, ReplyTargetOption } from "../types";
import { berlinToday } from "../utils";
import { CounterpartyAutocomplete } from "./counterparty-autocomplete";
import { DirectionBadge } from "./direction-badge";
import { FileUploader, type UploadCommand } from "./file-uploader";
import { ReplyToSelect } from "./reply-to-select";

/** Form alanları string taşır; boş string sunucu şemasında null'a çevrilir. */
type DocumentFormValues = {
  /** Yalnızca create: createAction şeması yönü zorunlu kılar; hidden değer olarak taşınır. */
  direction?: "INCOMING" | "OUTGOING";
  documentDate: string;
  counterparty: string;
  referenceNumber: string;
  subject: string;
  summary: string;
  deliveryMethod: string;
  status: string;
  dueDate: string;
  categoryId: string;
  assigneeId: string;
  replyToId: string;
  /** Yalnızca edit: eşzamanlılık koruması (5. bölüm md. 6) — ISO string. */
  updatedAt?: string;
};

export type DocumentEditFormData = {
  id: string;
  direction: DocumentDirection;
  registryNumber: string;
  documentDate: Date;
  counterparty: string;
  referenceNumber: string | null;
  subject: string;
  summary: string | null;
  deliveryMethod: string | null;
  status: string;
  dueDate: Date | null;
  categoryId: string | null;
  assigneeId: string | null;
  replyToId: string | null;
  updatedAt: Date;
};

type DocumentFormProps =
  | {
      mode: "create";
      direction: DocumentDirection;
      categories: CategoryOption[];
      assignees: AssigneeOption[];
      counterparties: string[];
      replyTargets: ReplyTargetOption[];
      maxMb: number;
    }
  | {
      mode: "edit";
      document: DocumentEditFormData;
      categories: CategoryOption[];
      assignees: AssigneeOption[];
      counterparties: string[];
      replyTargets: ReplyTargetOption[];
      maxMb: number;
    };

/**
 * Yeni/düzenleme evrak formu (8.2, 8.4). Yön ve kayıt numarası salt okunurdur;
 * kayıt numarası şemada bulunmadığından API üzerinden gönderilse de yok sayılır.
 */
export function DocumentForm(props: DocumentFormProps) {
  const tDelivery = useTranslations("documents.delivery");
  const tStatus = useTranslations("documents.status");
  const t = useTranslations("documents.form");
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingFileCount, setPendingFileCount] = useState(0);
  const [uploadCommand, setUploadCommand] = useState<UploadCommand | null>(null);

  const isEdit = props.mode === "edit";
  const doc = isEdit ? props.document : null;
  const direction = isEdit ? props.document.direction : props.direction;

  const defaultValues: DocumentFormValues = doc
    ? {
        updatedAt: new Date(doc.updatedAt).toISOString(),
        documentDate: doc.documentDate instanceof Date ? doc.documentDate.toISOString().slice(0, 10) : String(doc.documentDate),
        counterparty: doc.counterparty,
        referenceNumber: doc.referenceNumber ?? "",
        subject: doc.subject,
        summary: doc.summary ?? "",
        deliveryMethod: doc.deliveryMethod ?? "",
        status: doc.status,
        dueDate: doc.dueDate ? (doc.dueDate instanceof Date ? doc.dueDate.toISOString().slice(0, 10) : String(doc.dueDate)) : "",
        categoryId: doc.categoryId ?? "",
        assigneeId: doc.assigneeId ?? "",
        replyToId: doc.replyToId ?? "",
      }
    : {
        direction,
        documentDate: berlinToday().toISOString().slice(0, 10),
        counterparty: "",
        referenceNumber: "",
        subject: "",
        summary: "",
        deliveryMethod: "",
        status: DEFAULT_STATUS_BY_DIRECTION[direction],
        dueDate: "",
        categoryId: "",
        assigneeId: "",
        replyToId: "",
      };

  // KARAR: Şemalar boş string → null dönüşümü (z.preprocess) içerdiği için
  // zodResolver'ın input/generik eşleşmesi doğrudan kurulamaz; resolver burada
  // FormValues'e uyarlanır. Doğrulama yine zod ile (istemci + sunucu) yapılır.
  const form = useForm<DocumentFormValues>({
    resolver: isEdit
      ? (zodResolver(documentUpdateSchema) as unknown as Resolver<DocumentFormValues>)
      : (zodResolver(documentCreateSchema) as unknown as Resolver<DocumentFormValues>),
    defaultValues,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    if (doc) {
      const result = await updateDocumentAction({
        id: doc.id,
        ...values,
      });
      if (!result.ok) {
        setFormError(applyActionResult(result, form.setError));
        return;
      }
      addToast({ title: t("updatedToast", { registryNumber: result.data.registryNumber }), color: "success" });
      router.push(`/evrak/${doc.id}`);
      router.refresh();
      return;
    }

    const result = await createDocumentAction({ ...values, direction });
    if (!result.ok) {
      setFormError(applyActionResult(result, form.setError));
      return;
    }

    const { id, registryNumber } = result.data;

    // Kayıt akışı (8.2): (2) seçilen dosyalar sırayla upload edilir.
    // KARAR: Yükleme komut state ile iletilir (render sırasında ref erişimi
    // yerine); form, uploader'ın onDone çağrısıyla tamamlanmayı bekler.
    let failed = 0;
    if (pendingFileCount > 0) {
      failed = await new Promise<number>((resolve) => {
        setUploadCommand({ documentId: id, nonce: Date.now(), onDone: resolve });
      });
    }

    if (failed === 0) {
      addToast({ title: t("savedToast", { registryNumber }), color: "success" });
    } else {
      addToast({
        title: t("savedWithUploadErrorToast", { count: failed }),
        color: "warning",
      });
    }

    // (3) Başarılıysa detay sayfasına yönlendir.
    router.push(`/evrak/${id}`);
    router.refresh();
  });

  const counterpartyLabel = direction === "INCOMING" ? t("sender") : t("receiver");

  return (
    <Card shadow="sm" className="max-w-3xl">
      <CardBody className="gap-4 p-6">
        {doc ? (
          <div className="flex items-center gap-3 rounded-medium border border-default-200 bg-default-50 px-4 py-3">
            <span className="text-small font-semibold">{doc.registryNumber}</span>
            <DirectionBadge direction={doc.direction} />
            <span className="text-tiny text-default-500">
              {t("readOnlyNote")}
            </span>
          </div>
        ) : null}

        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormDatePicker
              name="documentDate"
              label={t("documentDate")}
              control={form.control}
              isRequired
            />
            <FormDatePicker
              name="dueDate"
              label={t("dueDate")}
              control={form.control}
              description={t("dueDateDescription")}
            />
          </div>

          <CounterpartyAutocomplete
            name="counterparty"
            label={counterpartyLabel}
            control={form.control}
            suggestions={props.counterparties}
            isRequired
          />

          <FormInput
            name="referenceNumber"
            label={t("referenceNumber")}
            control={form.control}
            placeholder={t("referenceNumberPlaceholder")}
          />

          <FormInput name="subject" label={t("subject")} control={form.control} isRequired />

          <FormTextarea
            name="summary"
            label={t("summary")}
            control={form.control}
            rows={3}
            description={t("summaryDescription")}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormSelect
              name="categoryId"
              label={t("category")}
              control={form.control}
              options={[{ value: "", label: t("noCategory") }, ...props.categories.map((c) => ({ value: c.id, label: c.label }))]}
            />
            <FormSelect
              name="deliveryMethod"
              label={t("deliveryMethod")}
              control={form.control}
              options={[
                { value: "", label: t("notSpecified") },
                ...DELIVERY_METHOD_VALUES.map((value) => ({ value, label: tDelivery(value) })),
              ]}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormSelect
              name="status"
              label={t("status")}
              control={form.control}
              options={STATUS_VALUES.map(
                (status) => ({ value: status, label: tStatus(status) }),
              )}
            />
            <FormSelect
              name="assigneeId"
              label={t("assignee")}
              control={form.control}
              options={[
                { value: "", label: t("unassigned") },
                ...props.assignees.map((a) => ({ value: a.id, label: a.label })),
              ]}
            />
          </div>

          {direction === "OUTGOING" ? (
            <ReplyToSelect
              name="replyToId"
              control={form.control}
              options={props.replyTargets}
            />
          ) : null}

          {!isEdit ? (
            <div className="flex flex-col gap-2">
              <p className="text-small font-medium text-foreground">{t("filesSection")}</p>
              <FileUploader
                mode="create"
                maxMb={props.maxMb}
                onPendingCountChange={setPendingFileCount}
                uploadCommand={uploadCommand}
              />
            </div>
          ) : null}

          <FormErrorSummary message={formError} />

          <div className="flex items-center gap-2">
            <SubmitButton isSubmitting={form.formState.isSubmitting}>
              {isEdit ? t("save") : t("saveNew")}
            </SubmitButton>
            <Button
              variant="light"
              onPress={() => router.push(doc ? `/evrak/${doc.id}` : "/evrak")}
            >
              {t("cancel")}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
