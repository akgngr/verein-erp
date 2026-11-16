"use client";
import { statusStyle } from "@/shared/components/ui/status-appearance";
import {
  toast,
  Button,
  Chip,
  Spinner,
  Modal,
  Switch,
  Label,
  CheckboxGroup,
  Checkbox,
  TextField,
  Input,
  Select,
  ListBox,
} from "@heroui/react";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";
import { statusTone } from "@/shared/components/ui/status-appearance";

import {
  ArrowDown,
  ArrowUp,
  FilePlus2,
  FileText,
  Pencil,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { useHydrated } from "@/shared/hooks/use-hydrated";
import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

import {
  deleteFormDocumentAction,
  reorderFormDocumentsAction,
  saveFormDocumentAction,
} from "../actions/online-form-actions";
import { RichTextEditor } from "./rich-text-editor";

type Kind = "MEMBER" | "STUDENT" | "GUARDIAN";
type Purpose = "PRIVACY" | "PHOTO" | "OTHER";
export type DocumentRow = {
  id: string;
  title: string;
  purpose: Purpose;
  contentHtml: string;
  requiresConsent: boolean;
  required: boolean;
  appliesTo: Kind[];
  active: boolean;
};
const KINDS: Kind[] = ["MEMBER", "STUDENT", "GUARDIAN"];
const PURPOSES: Purpose[] = ["PRIVACY", "PHOTO", "OTHER"];
const empty: Omit<DocumentRow, "id"> & { id: string | null } = {
  id: null,
  title: "",
  purpose: "OTHER",
  contentHtml: "",
  requiresConsent: true,
  required: false,
  appliesTo: [...KINDS],
  active: true,
};

/** Form belgeleri: liste, sıralama ve Word benzeri editörle düzenleme. */
export function DocumentsManager({ documents }: { documents: DocumentRow[] }) {
  const t = useTranslations("online-forms.documents");
  const tKinds = useTranslations("online-forms.kinds");
  const translate = useTranslateMessage();
  const router = useRouter();
  const hydrated = useHydrated();
  const [editing, setEditing] = useState<typeof empty | null>(null);
  const [pending, start] = useTransition();

  const call = (
    fn: () => Promise<{ ok: boolean; error?: string }>,
    done?: string,
    after?: () => void,
  ) =>
    start(async () => {
      const response = await fn();
      if (!response.ok)
        return void toast(translate(response.error), { variant: "danger" });
      if (done) toast(done, { variant: "success" });
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
        <Button
          onPress={() => setEditing({ ...empty })}
          variant={actionVariant("primary", "solid")}
        >
          {<FilePlus2 className="size-4" />}
          {t("add")}
        </Button>
        <p className="text-xs text-ink-500">{t("versionHint")}</p>
      </div>
      {documents.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-ink-300 p-10 text-center text-ink-500">
          <FileText className="size-8" />
          <p>{t("empty")}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {documents.map((doc, index) => (
            <li
              key={doc.id}
              className={`flex flex-wrap items-center gap-3 rounded-lg border border-ink-200 bg-surface p-3 ${doc.active ? "" : "opacity-60"}`}
            >
              <div className="flex flex-col">
                <Button
                  isIconOnly
                  size="sm"
                  aria-label={t("moveUp")}
                  isDisabled={index === 0 || pending}
                  onPress={() => move(index, -1)}
                  variant={actionVariant("default", "light")}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  isIconOnly
                  size="sm"
                  aria-label={t("moveDown")}
                  isDisabled={index === documents.length - 1 || pending}
                  onPress={() => move(index, 1)}
                  variant={actionVariant("default", "light")}
                >
                  <ArrowDown className="size-4" />
                </Button>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-medium">{doc.title}</span>
                <div className="flex flex-wrap gap-1">
                  <Chip
                    size="sm"
                    color={statusTone(
                      doc.purpose === "PRIVACY"
                        ? "primary"
                        : doc.purpose === "PHOTO"
                          ? "secondary"
                          : "default",
                    )}
                    variant={"soft"}
                    style={statusStyle(
                      doc.purpose === "PRIVACY"
                        ? "primary"
                        : doc.purpose === "PHOTO"
                          ? "secondary"
                          : "default",
                    )}
                  >
                    {t(`purposes.${doc.purpose}`)}
                  </Chip>
                  {doc.requiresConsent ? (
                    <Chip
                      size="sm"
                      color={statusTone(
                        doc.required || doc.purpose === "PRIVACY"
                          ? "danger"
                          : "default",
                      )}
                      variant={"soft"}
                      style={statusStyle(
                        doc.required || doc.purpose === "PRIVACY"
                          ? "danger"
                          : "default",
                      )}
                    >
                      {doc.required || doc.purpose === "PRIVACY"
                        ? t("requiredChip")
                        : t("optionalChip")}
                    </Chip>
                  ) : (
                    <Chip size="sm" variant={"soft"}>
                      {t("infoOnlyChip")}
                    </Chip>
                  )}
                  {doc.appliesTo.map((kind) => (
                    <Chip
                      key={kind}
                      size="sm"
                      variant={"soft"}
                      className={"border border-current"}
                    >
                      {tKinds(kind)}
                    </Chip>
                  ))}
                  {doc.active ? null : (
                    <Chip size="sm" color={"warning"} variant={"soft"}>
                      {t("inactive")}
                    </Chip>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                onPress={() => setEditing({ ...doc })}
                variant={actionVariant("default", "flat")}
              >
                {<Pencil className="size-4" />}
                {t("edit")}
              </Button>
              <Button
                isIconOnly
                size="sm"
                aria-label={t("delete")}
                isDisabled={pending}
                onPress={() =>
                  window.confirm(t("deleteConfirm", { title: doc.title })) &&
                  call(
                    () => deleteFormDocumentAction({ id: doc.id }),
                    t("deleted"),
                  )
                }
                variant={actionVariant("danger", "light")}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <Modal.Backdrop isDismissable={false}>
          <Modal.Container size="full" scroll={"inside"}>
            <Modal.Dialog className={"w-full h-dvh max-w-full "}>
              <DialogDismissButton />

              {editing ? (
                <>
                  <Modal.Header className="flex flex-col gap-3 border-b border-ink-200">
                    <Modal.Heading className="flex items-center gap-2">
                      <span>{editing.id ? t("editTitle") : t("addTitle")}</span>
                    </Modal.Heading>
                    <div className="grid grid-cols-1 gap-3 text-sm font-normal lg:grid-cols-[2fr_1fr_auto]">
                      <TextField
                        value={editing.title}
                        onChange={(title) => setEditing({ ...editing, title })}
                        className={["w-full"].filter(Boolean).join(" ")}
                      >
                        <Label>{t("fields.title")}</Label>
                        <Input placeholder=" " />
                      </TextField>
                      <Select
                        id="document-purpose"
                        value={editing.purpose}
                        onChange={(selectedValue) => {
                          const keys =
                            selectedValue === null
                              ? undefined
                              : String(selectedValue);
                          const purpose = String(
                            keys ?? editing.purpose,
                          ) as Purpose;
                          setEditing({
                            ...editing,
                            purpose,
                            ...(purpose === "PRIVACY"
                              ? { requiresConsent: true, required: true }
                              : {}),
                          });
                        }}
                      >
                        <Label>{t("fields.purpose")}</Label>
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {PURPOSES.map((purpose) => (
                              <ListBox.Item
                                key={purpose}
                                id={purpose}
                                textValue={String(t(`purposes.${purpose}`))}
                              >
                                <Label>{t(`purposes.${purpose}`)}</Label>
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                      <Switch
                        isSelected={editing.active}
                        onChange={(active) =>
                          setEditing({ ...editing, active })
                        }
                        className={"self-end"}
                      >
                        <Switch.Content>
                          <Switch.Control>
                            <Switch.Thumb />
                          </Switch.Control>
                          <Label>{t("fields.active")}</Label>
                        </Switch.Content>
                      </Switch>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-normal">
                      <CheckboxGroup
                        value={editing.appliesTo}
                        onChange={(value) =>
                          setEditing({ ...editing, appliesTo: value as Kind[] })
                        }
                      >
                        <Label>{t("fields.appliesTo")}</Label>
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                          {KINDS.map((kind) => (
                            <Checkbox key={kind} value={kind}>
                              <Checkbox.Content>
                                <Checkbox.Control>
                                  <Checkbox.Indicator />
                                </Checkbox.Control>
                                <Label>{tKinds(kind)}</Label>
                              </Checkbox.Content>
                            </Checkbox>
                          ))}
                        </div>
                      </CheckboxGroup>
                      <Checkbox
                        isSelected={editing.requiresConsent}
                        isDisabled={editing.purpose === "PRIVACY"}
                        onChange={(requiresConsent) =>
                          setEditing({ ...editing, requiresConsent })
                        }
                      >
                        <Checkbox.Content>
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                          <Label>{t("fields.requiresConsent")}</Label>
                        </Checkbox.Content>
                      </Checkbox>
                      <Checkbox
                        isSelected={
                          editing.required || editing.purpose === "PRIVACY"
                        }
                        isDisabled={
                          !editing.requiresConsent ||
                          editing.purpose === "PRIVACY"
                        }
                        onChange={(required) =>
                          setEditing({ ...editing, required })
                        }
                      >
                        <Checkbox.Content>
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                          <Label>{t("fields.required")}</Label>
                        </Checkbox.Content>
                      </Checkbox>
                    </div>
                    <p className="text-xs font-normal text-ink-500">
                      {t(`purposeHelp.${editing.purpose}`)}
                    </p>
                  </Modal.Header>
                  <Modal.Body className="min-h-0 p-3">
                    <RichTextEditor
                      key={editing.id ?? "new"}
                      value={editing.contentHtml}
                      ariaLabel={t("fields.content")}
                      onChange={(contentHtml) =>
                        setEditing((current) =>
                          current ? { ...current, contentHtml } : current,
                        )
                      }
                    />
                  </Modal.Body>
                  <Modal.Footer className="border-t border-ink-200">
                    <Button
                      onPress={() => setEditing(null)}
                      variant={actionVariant("default", "light")}
                    >
                      {t("cancel")}
                    </Button>
                    <Button
                      onPress={() =>
                        call(
                          () => saveFormDocumentAction(editing),
                          t("saved"),
                          () => setEditing(null),
                        )
                      }
                      variant={actionVariant("primary", "solid")}
                      isPending={pending}
                    >
                      {pending ? <Spinner size="sm" color="current" /> : null}
                      {t("save")}
                    </Button>
                  </Modal.Footer>
                </>
              ) : null}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
