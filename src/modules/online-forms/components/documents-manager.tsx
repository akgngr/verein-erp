"use client";

import { addToast, Button, Checkbox, CheckboxGroup, Chip, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem, Switch } from "@heroui/react";
import { ArrowDown, ArrowUp, FilePlus2, FileText, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { useHydrated } from "@/shared/hooks/use-hydrated";
import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

import { deleteFormDocumentAction, reorderFormDocumentsAction, saveFormDocumentAction } from "../actions/online-form-actions";
import { RichTextEditor } from "./rich-text-editor";

type Kind = "MEMBER" | "STUDENT" | "GUARDIAN";
type Purpose = "PRIVACY" | "PHOTO" | "OTHER";
export type DocumentRow = { id: string; title: string; purpose: Purpose; contentHtml: string; requiresConsent: boolean; required: boolean; appliesTo: Kind[]; active: boolean };
const KINDS: Kind[] = ["MEMBER", "STUDENT", "GUARDIAN"];
const PURPOSES: Purpose[] = ["PRIVACY", "PHOTO", "OTHER"];
const empty: Omit<DocumentRow, "id"> & { id: string | null } = { id: null, title: "", purpose: "OTHER", contentHtml: "", requiresConsent: true, required: false, appliesTo: [...KINDS], active: true };

/** Form belgeleri: liste, sıralama ve Word benzeri editörle düzenleme. */
export function DocumentsManager({ documents }: { documents: DocumentRow[] }) {
  const t = useTranslations("online-forms.documents");
  const tKinds = useTranslations("online-forms.kinds");
  const translate = useTranslateMessage();
  const router = useRouter();
  const hydrated = useHydrated();
  const [editing, setEditing] = useState<typeof empty | null>(null);
  const [pending, start] = useTransition();

  const call = (fn: () => Promise<{ ok: boolean; error?: string }>, done?: string, after?: () => void) => start(async () => {
    const response = await fn();
    if (!response.ok) return void addToast({ title: translate(response.error), color: "danger" });
    if (done) addToast({ title: done, color: "success" });
    after?.();
    router.refresh();
  });
  const move = (index: number, delta: number) => {
    const ids = documents.map((doc) => doc.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + delta, 0, moved);
    call(() => reorderFormDocumentsAction({ ids }));
  };

  if (!hydrated) return null;
  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button color="primary" startContent={<FilePlus2 className="size-4" />} onPress={() => setEditing({ ...empty })}>{t("add")}</Button>
        <p className="text-tiny text-default-500">{t("versionHint")}</p>
      </div>
      {documents.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-large border border-dashed border-default-300 p-10 text-center text-default-500"><FileText className="size-8" /><p>{t("empty")}</p></div>
      ) : (
        <ul className="flex flex-col gap-2">
          {documents.map((doc, index) => (
            <li key={doc.id} className={`flex flex-wrap items-center gap-3 rounded-medium border border-default-200 bg-content1 p-3 ${doc.active ? "" : "opacity-60"}`}>
              <div className="flex flex-col">
                <Button isIconOnly size="sm" variant="light" aria-label={t("moveUp")} isDisabled={index === 0 || pending} onPress={() => move(index, -1)}><ArrowUp className="size-4" /></Button>
                <Button isIconOnly size="sm" variant="light" aria-label={t("moveDown")} isDisabled={index === documents.length - 1 || pending} onPress={() => move(index, 1)}><ArrowDown className="size-4" /></Button>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-medium">{doc.title}</span>
                <div className="flex flex-wrap gap-1">
                  <Chip size="sm" variant="flat" color={doc.purpose === "PRIVACY" ? "primary" : doc.purpose === "PHOTO" ? "secondary" : "default"}>{t(`purposes.${doc.purpose}`)}</Chip>
                  {doc.requiresConsent ? <Chip size="sm" variant="flat" color={doc.required || doc.purpose === "PRIVACY" ? "danger" : "default"}>{doc.required || doc.purpose === "PRIVACY" ? t("requiredChip") : t("optionalChip")}</Chip> : <Chip size="sm" variant="flat">{t("infoOnlyChip")}</Chip>}
                  {doc.appliesTo.map((kind) => <Chip key={kind} size="sm" variant="bordered">{tKinds(kind)}</Chip>)}
                  {doc.active ? null : <Chip size="sm" variant="flat" color="warning">{t("inactive")}</Chip>}
                </div>
              </div>
              <Button size="sm" variant="flat" startContent={<Pencil className="size-4" />} onPress={() => setEditing({ ...doc })}>{t("edit")}</Button>
              <Button isIconOnly size="sm" variant="light" color="danger" aria-label={t("delete")} isDisabled={pending} onPress={() => window.confirm(t("deleteConfirm", { title: doc.title })) && call(() => deleteFormDocumentAction({ id: doc.id }), t("deleted"))}><Trash2 className="size-4" /></Button>
            </li>
          ))}
        </ul>
      )}

      <Modal isOpen={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)} size="full" scrollBehavior="inside" isDismissable={false}>
        <ModalContent>
          {editing ? (
            <>
              <ModalHeader className="flex flex-col gap-3 border-b border-default-200">
                <span>{editing.id ? t("editTitle") : t("addTitle")}</span>
                <div className="grid grid-cols-1 gap-3 text-small font-normal lg:grid-cols-[2fr_1fr_auto]">
                  <Input label={t("fields.title")} labelPlacement="outside" placeholder=" " value={editing.title} onValueChange={(title) => setEditing({ ...editing, title })} />
                  <Select id="document-purpose" label={t("fields.purpose")} labelPlacement="outside" selectedKeys={[editing.purpose]} onSelectionChange={(keys) => { const purpose = String(Array.from(keys)[0] ?? editing.purpose) as Purpose; setEditing({ ...editing, purpose, ...(purpose === "PRIVACY" ? { requiresConsent: true, required: true } : {}) }); }}>
                    {PURPOSES.map((purpose) => <SelectItem key={purpose}>{t(`purposes.${purpose}`)}</SelectItem>)}
                  </Select>
                  <Switch className="self-end" isSelected={editing.active} onValueChange={(active) => setEditing({ ...editing, active })}>{t("fields.active")}</Switch>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-small font-normal">
                  <CheckboxGroup orientation="horizontal" label={t("fields.appliesTo")} value={editing.appliesTo} onValueChange={(value) => setEditing({ ...editing, appliesTo: value as Kind[] })}>
                    {KINDS.map((kind) => <Checkbox key={kind} value={kind}>{tKinds(kind)}</Checkbox>)}
                  </CheckboxGroup>
                  <Checkbox isSelected={editing.requiresConsent} isDisabled={editing.purpose === "PRIVACY"} onValueChange={(requiresConsent) => setEditing({ ...editing, requiresConsent })}>{t("fields.requiresConsent")}</Checkbox>
                  <Checkbox isSelected={editing.required || editing.purpose === "PRIVACY"} isDisabled={!editing.requiresConsent || editing.purpose === "PRIVACY"} onValueChange={(required) => setEditing({ ...editing, required })}>{t("fields.required")}</Checkbox>
                </div>
                <p className="text-tiny font-normal text-default-500">{t(`purposeHelp.${editing.purpose}`)}</p>
              </ModalHeader>
              <ModalBody className="min-h-0 p-3">
                <RichTextEditor key={editing.id ?? "new"} value={editing.contentHtml} ariaLabel={t("fields.content")} onChange={(contentHtml) => setEditing((current) => (current ? { ...current, contentHtml } : current))} />
              </ModalBody>
              <ModalFooter className="border-t border-default-200">
                <Button variant="light" onPress={() => setEditing(null)}>{t("cancel")}</Button>
                <Button color="primary" isLoading={pending} onPress={() => call(() => saveFormDocumentAction(editing), t("saved"), () => setEditing(null))}>{t("save")}</Button>
              </ModalFooter>
            </>
          ) : null}
        </ModalContent>
      </Modal>
    </div>
  );
}
