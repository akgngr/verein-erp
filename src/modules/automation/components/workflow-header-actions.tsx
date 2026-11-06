"use client";

import {
  addToast, Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger,
  Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Textarea,
} from "@heroui/react";
import { ChevronDown, Pencil, Play, Power, Rocket, Save, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState, useTransition } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";

import {
  deleteWorkflowAction,
  publishWorkflowAction,
  saveWorkflowDraftAction,
  startWorkflowAction,
  toggleWorkflowAction,
} from "../actions/workflow-actions";
import type { EditorCatalog } from "../editor/catalog-types";
import type { NodeLabels } from "../editor/node-types";

const WorkflowEditor = dynamic(() => import("../editor/workflow-editor"), {
  ssr: false,
  loading: () => <div className="h-full animate-pulse bg-default-100" />,
});

type Props = {
  id: string;
  name: string;
  draft: { nodes?: unknown[]; edges?: unknown[] };
  catalog: EditorCatalog;
  labels: NodeLabels;
  enabled: boolean;
  published: boolean;
  hasUnpublishedChanges: boolean;
  manualTrigger: boolean;
  canEdit: boolean;
  canPublish: boolean;
  canRun: boolean;
  canDelete: boolean;
};

/** Shopify-Flow-like header actions: Edit (full-screen editor), More actions, Turn on/off. */
export function WorkflowHeaderActions(props: Props) {
  const t = useTranslations("automation.workflows");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const [editorOpen, setEditorOpen] = useState(() => props.canEdit && searchParams.get("edit") === "1");
  const [runOpen, setRunOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [runInput, setRunInput] = useState("");
  const [issues, setIssues] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);

  const onSave = useCallback(async (draft: unknown) => {
    const response = await saveWorkflowDraftAction({ id: props.id, draft });
    if (!response.ok) {
      addToast({ title: response.error, color: "danger" });
      return false;
    }
    setIssues(response.data.issues);
    return true;
  }, [props.id]);

  const publish = (afterSave?: () => Promise<unknown>) => startTransition(async () => {
    if (afterSave) await afterSave();
    const response = await publishWorkflowAction({ id: props.id });
    if (!response.ok) return void addToast({ title: response.error, color: "danger" });
    if (response.data.issues.length > 0) {
      setIssues(response.data.issues);
      setEditorOpen(true);
      return void addToast({ title: t("publishBlocked"), color: "warning" });
    }
    setIssues([]);
    setEditorOpen(false);
    addToast({ title: t("published", { version: response.data.version }), color: "success" });
    router.refresh();
  });

  const toggle = () => startTransition(async () => {
    const response = await toggleWorkflowAction({ id: props.id, enabled: !props.enabled });
    if (!response.ok) return void addToast({ title: response.error, color: "danger" });
    addToast({ title: props.enabled ? t("turnedOff") : t("turnedOn"), color: "success" });
    router.refresh();
  });

  const run = () => startTransition(async () => {
    const response = await startWorkflowAction({ id: props.id, input: runInput });
    if (!response.ok) return void addToast({ title: response.error, color: "danger" });
    setRunOpen(false);
    addToast({ title: t("started"), color: "success" });
    router.refresh();
  });

  const remove = async () => {
    const response = await deleteWorkflowAction({ id: props.id });
    if (!response.ok) return void addToast({ title: response.error, color: "danger" });
    router.push("/automation/workflows");
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {props.canEdit ? (
        <Button variant="bordered" startContent={<Pencil className="h-4 w-4" />} onPress={() => setEditorOpen(true)}>
          {t("edit")}
        </Button>
      ) : null}

      <Dropdown>
        <DropdownTrigger>
          <Button variant="bordered" endContent={<ChevronDown className="h-4 w-4" />}>{t("moreActions")}</Button>
        </DropdownTrigger>
        <DropdownMenu
          aria-label={t("moreActions")}
          disabledKeys={[
            ...(props.published && props.manualTrigger && props.enabled && props.canRun ? [] : ["run"]),
            ...(props.canPublish ? [] : ["publish"]),
            ...(props.canDelete ? [] : ["delete"]),
          ]}
          onAction={(key) => {
            if (key === "run") setRunOpen(true);
            if (key === "publish") publish();
            if (key === "delete") setConfirmDelete(true);
          }}
        >
          <DropdownItem key="run" startContent={<Play className="h-4 w-4" />} description={props.manualTrigger ? undefined : t("runOnlyManual")}>{t("run")}</DropdownItem>
          <DropdownItem key="publish" startContent={<Rocket className="h-4 w-4" />}>{t("publish")}</DropdownItem>
          <DropdownItem key="delete" className="text-danger" color="danger">{t("delete")}</DropdownItem>
        </DropdownMenu>
      </Dropdown>

      {props.canPublish ? (
        props.published ? (
          <Button color={props.enabled ? "danger" : "success"} isLoading={pending} startContent={<Power className="h-4 w-4" />} onPress={toggle}>
            {props.enabled ? t("turnOff") : t("turnOn")}
          </Button>
        ) : (
          <Button color="primary" isLoading={pending} startContent={<Rocket className="h-4 w-4" />} onPress={() => publish()}>
            {t("publishAndTurnOn")}
          </Button>
        )
      ) : null}

      <Modal isOpen={editorOpen} onOpenChange={setEditorOpen} size="full" hideCloseButton isDismissable={false} scrollBehavior="inside">
        <ModalContent>
          <div className="flex h-dvh flex-col">
            <WorkflowEditor
              name={props.name}
              locale={locale}
              initialDraft={props.draft}
              catalog={props.catalog}
              labels={props.labels}
              readOnly={!props.canEdit}
              onSave={onSave}
              toolbar={({ save }) => (
                <div className="border-b border-default-200 bg-content1">
                  <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{props.name}</p>
                      <p className="text-tiny text-default-500">{t("editorHint")}</p>
                    </div>
                    <div className="ms-auto flex items-center gap-2">
                      <Button variant="bordered" isLoading={saving} startContent={<Save className="h-4 w-4" />}
                        onPress={async () => { setSaving(true); await save(); setSaving(false); }}>
                        {t("saveDraft")}
                      </Button>
                      {props.canPublish ? (
                        <Button color="primary" isLoading={pending} startContent={<Rocket className="h-4 w-4" />} onPress={() => publish(save)}>
                          {t("saveAndPublish")}
                        </Button>
                      ) : null}
                      <Button isIconOnly variant="light" aria-label={t("close")} onPress={() => { setEditorOpen(false); router.refresh(); }}>
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                  {issues !== null ? (
                    issues.length === 0 ? (
                      <p className="border-t border-success-200 bg-success-50 px-4 py-2 text-small text-success-700">{t("valid")}</p>
                    ) : (
                      <ul className="max-h-32 overflow-auto border-t border-warning-200 bg-warning-50 px-4 py-2 text-small text-warning-800">
                        {issues.map((issue) => <li key={issue}>• {issue}</li>)}
                      </ul>
                    )
                  ) : null}
                </div>
              )}
            />
          </div>
        </ModalContent>
      </Modal>

      <Modal isOpen={runOpen} onOpenChange={setRunOpen}>
        <ModalContent>
          <ModalHeader>{t("run")}</ModalHeader>
          <ModalBody>
            <Textarea label={t("runInput")} description={t("runInputHint")} minRows={3} value={runInput} onValueChange={setRunInput} />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setRunOpen(false)}>{t("cancel")}</Button>
            <Button color="primary" isLoading={pending} startContent={<Play className="h-4 w-4" />} onPress={run}>{t("run")}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("deleteTitle")}
        message={t("deleteDescription")}
        confirmLabel={t("delete")}
        confirmColor="danger"
        onConfirm={remove}
      />
    </div>
  );
}
