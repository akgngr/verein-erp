"use client";

import { addToast, Button, Chip, Switch, Textarea } from "@heroui/react";
import { CheckCircle2, Play, Rocket, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useState, useTransition } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";

import {
  deleteWorkflowAction,
  publishWorkflowAction,
  saveWorkflowDraftAction,
  startWorkflowAction,
  toggleWorkflowAction,
} from "../actions/workflow-actions";
import type { EditorCatalogProps, NodeLabels } from "../editor/node-types";

const WorkflowEditor = dynamic(() => import("../editor/workflow-editor"), {
  ssr: false,
  loading: () => <div className="h-[72vh] min-h-[520px] animate-pulse rounded-large bg-default-100" />,
});

type Props = {
  id: string;
  name: string;
  draft: { nodes?: unknown[]; edges?: unknown[] };
  catalog: EditorCatalogProps;
  labels: NodeLabels;
  enabled: boolean;
  published: boolean;
  manualTrigger: boolean;
  canEdit: boolean;
  canPublish: boolean;
  canRun: boolean;
  canDelete: boolean;
};

export function WorkflowEditorPanel(props: Props) {
  const t = useTranslations("automation.workflows");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [issues, setIssues] = useState<string[] | null>(null);
  const [runInput, setRunInput] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const onSave = useCallback(async (draft: unknown) => {
    const response = await saveWorkflowDraftAction({ id: props.id, draft });
    if (!response.ok) {
      addToast({ title: response.error, color: "danger" });
      return false;
    }
    setIssues(response.data.issues);
    return true;
  }, [props.id]);

  const publish = () => startTransition(async () => {
    const response = await publishWorkflowAction({ id: props.id });
    if (!response.ok) return void addToast({ title: response.error, color: "danger" });
    if (response.data.issues.length > 0) {
      setIssues(response.data.issues);
      return void addToast({ title: t("publishBlocked"), color: "warning" });
    }
    setIssues([]);
    addToast({ title: t("published", { version: response.data.version }), color: "success" });
    router.refresh();
  });

  const toggle = (enabled: boolean) => startTransition(async () => {
    const response = await toggleWorkflowAction({ id: props.id, enabled });
    if (!response.ok) return void addToast({ title: response.error, color: "danger" });
    router.refresh();
  });

  const run = () => startTransition(async () => {
    const response = await startWorkflowAction({ id: props.id, input: runInput });
    if (!response.ok) return void addToast({ title: response.error, color: "danger" });
    addToast({ title: t("started"), color: "success" });
    router.refresh();
  });

  const remove = async () => {
    const response = await deleteWorkflowAction({ id: props.id });
    if (!response.ok) return void addToast({ title: response.error, color: "danger" });
    router.push("/automation/workflows");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-large border border-default-200 bg-content1 p-3">
        <p className="text-small text-default-500">{t("saveHint")}</p>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          {props.published ? (
            <Switch size="sm" isSelected={props.enabled} isDisabled={!props.canPublish || pending} onValueChange={toggle}>
              {t("enabled")}
            </Switch>
          ) : null}
          {props.canPublish ? (
            <Button color="primary" size="sm" isLoading={pending} startContent={<Rocket className="h-4 w-4" />} onPress={publish}>
              {t("publish")}
            </Button>
          ) : null}
          {props.canDelete ? (
            <Button isIconOnly size="sm" variant="light" color="danger" aria-label={t("delete")} onPress={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      {issues !== null ? (
        issues.length === 0 ? (
          <p className="flex items-center gap-2 text-small text-success"><CheckCircle2 className="h-4 w-4" />{t("valid")}</p>
        ) : (
          <div className="rounded-large border border-warning-200 bg-warning-50 p-3">
            <p className="mb-2 text-small font-semibold text-warning-700">{t("issues")}</p>
            <div className="flex flex-wrap gap-2">
              {issues.map((issue) => <Chip key={issue} size="sm" variant="flat" color="warning">{issue}</Chip>)}
            </div>
          </div>
        )
      ) : null}

      <WorkflowEditor
        name={props.name}
        initialDraft={props.draft}
        catalog={props.catalog}
        labels={props.labels}
        readOnly={!props.canEdit}
        onSave={onSave}
      />

      {props.published && props.manualTrigger && props.canRun ? (
        <div className="flex flex-col gap-2 rounded-large border border-default-200 bg-content1 p-4 sm:flex-row sm:items-end">
          <Textarea label={t("runInput")} description={t("runInputHint")} minRows={2} value={runInput} onValueChange={setRunInput} className="flex-1" />
          <Button color="secondary" isLoading={pending} isDisabled={!props.enabled} startContent={<Play className="h-4 w-4" />} onPress={run}>
            {t("run")}
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("deleteTitle")}
        message={t("deleteDescription")}
        confirmColor="danger"
        confirmLabel={t("delete")}
        onConfirm={remove}
      />
    </div>
  );
}
