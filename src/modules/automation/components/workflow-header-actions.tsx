"use client";

import { notify } from "@/shared/components/ui/notify";
import { Description, Dialog, Dropdown, Label, Spinner, TextArea, TextField, Button } from "@/shared/components/kit";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import {
  ChevronDown,
  Pencil,
  Play,
  Power,
  Rocket,
  Save,
  X,
} from "lucide-react";
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
  loading: () => <div className="h-full animate-pulse bg-ink-100" />,
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
  const [editorOpen, setEditorOpen] = useState(
    () => props.canEdit && searchParams.get("edit") === "1",
  );
  const [runOpen, setRunOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [runInput, setRunInput] = useState("");
  const [issues, setIssues] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);

  const onSave = useCallback(
    async (draft: unknown) => {
      const response = await saveWorkflowDraftAction({ id: props.id, draft });
      if (!response.ok) {
        notify.error(response.error);
        return false;
      }
      setIssues(response.data.issues);
      return true;
    },
    [props.id],
  );

  const publish = (afterSave?: () => Promise<unknown>) =>
    startTransition(async () => {
      if (afterSave) await afterSave();
      const response = await publishWorkflowAction({ id: props.id });
      if (!response.ok)
        return void notify.error(response.error);
      if (response.data.issues.length > 0) {
        setIssues(response.data.issues);
        setEditorOpen(true);
        return void notify.warning(t("publishBlocked"));
      }
      setIssues([]);
      setEditorOpen(false);
      notify.success(t("published", { version: response.data.version }));
      router.refresh();
    });

  const toggle = () =>
    startTransition(async () => {
      const response = await toggleWorkflowAction({
        id: props.id,
        enabled: !props.enabled,
      });
      if (!response.ok)
        return void notify.error(response.error);
      notify.success(props.enabled ? t("turnedOff") : t("turnedOn"));
      router.refresh();
    });

  const run = () =>
    startTransition(async () => {
      const response = await startWorkflowAction({
        id: props.id,
        input: runInput,
      });
      if (!response.ok)
        return void notify.error(response.error);
      setRunOpen(false);
      notify.success(t("started"));
      router.refresh();
    });

  const remove = async () => {
    const response = await deleteWorkflowAction({ id: props.id });
    if (!response.ok) return void notify.error(response.error);
    router.push("/automation/workflows");
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {props.canEdit ? (
        <Button
          onPress={() => setEditorOpen(true)}
          variant={actionVariant("default", "bordered")}
        >
          {<Pencil className="h-4 w-4" />}
          {t("edit")}
        </Button>
      ) : null}

      <Dropdown>
        <Button variant={actionVariant("default", "bordered")}>
          {t("moreActions")}
          {<ChevronDown className="h-4 w-4" />}
        </Button>

        <Dropdown.Popover placement="bottom end">
          <Dropdown.Menu
            aria-label={t("moreActions")}
            disabledKeys={[
              ...(props.published &&
              props.manualTrigger &&
              props.enabled &&
              props.canRun
                ? []
                : ["run"]),
              ...(props.canPublish ? [] : ["publish"]),
              ...(props.canDelete ? [] : ["delete"]),
            ]}
            onAction={(key) => {
              if (key === "run") setRunOpen(true);
              if (key === "publish") publish();
              if (key === "delete") setConfirmDelete(true);
            }}
          >
            <Dropdown.Item key="run" id={"run"} textValue={String(t("run"))}>
              {<Play className="h-4 w-4" />}
              <Label>{t("run")}</Label>
              <Description>
                {props.manualTrigger ? undefined : t("runOnlyManual")}
              </Description>
            </Dropdown.Item>
            <Dropdown.Item
              key="publish"
              id={"publish"}
              textValue={String(t("publish"))}
            >
              {<Rocket className="h-4 w-4" />}
              <Label>{t("publish")}</Label>
            </Dropdown.Item>
            <Dropdown.Item
              key="delete"
              id={"delete"}
              textValue={String(t("delete"))}
              tone={"danger" === "danger" ? "danger" : undefined}
              className={["text-danger"].filter(Boolean).join(" ")}
            >
              <Label>{t("delete")}</Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>

      {props.canPublish ? (
        props.published ? (
          <Button
            onPress={toggle}
            variant={actionVariant(
              props.enabled ? "danger" : "success",
              "solid",
            )}
            isPending={pending}
          >
            {pending ? <Spinner size="sm" tone="current" /> : null}
            {<Power className="h-4 w-4" />}
            {props.enabled ? t("turnOff") : t("turnOn")}
          </Button>
        ) : (
          <Button
            onPress={() => publish()}
            variant={actionVariant("primary", "solid")}
            isPending={pending}
          >
            {pending ? <Spinner size="sm" tone="current" /> : null}
            {<Rocket className="h-4 w-4" />}
            {t("publishAndTurnOn")}
          </Button>
        )
      ) : null}

      <Dialog isOpen={editorOpen} onOpenChange={setEditorOpen} isDismissable={false} size="full" scroll={"inside"} aria-label={props.name}
              className={"w-full h-dvh max-w-full "}>
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
                    <div className="border-b border-ink-200 bg-surface">
                      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{props.name}</p>
                          <p className="text-xs text-ink-500">
                            {t("editorHint")}
                          </p>
                        </div>
                        <div className="ms-auto flex items-center gap-2">
                          <Button
                            onPress={async () => {
                              setSaving(true);
                              await save();
                              setSaving(false);
                            }}
                            variant={actionVariant("default", "bordered")}
                            isPending={saving}
                          >
                            {saving ? (
                              <Spinner size="sm" tone="current" />
                            ) : null}
                            {<Save className="h-4 w-4" />}
                            {t("saveDraft")}
                          </Button>
                          {props.canPublish ? (
                            <Button
                              onPress={() => publish(save)}
                              variant={actionVariant("primary", "solid")}
                              isPending={pending}
                            >
                              {pending ? (
                                <Spinner size="sm" tone="current" />
                              ) : null}
                              {<Rocket className="h-4 w-4" />}
                              {t("saveAndPublish")}
                            </Button>
                          ) : null}
                          <Button
                            isIconOnly
                            aria-label={t("close")}
                            onPress={() => {
                              setEditorOpen(false);
                              router.refresh();
                            }}
                            variant={actionVariant("default", "light")}
                          >
                            <X className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                      {issues !== null ? (
                        issues.length === 0 ? (
                          <p className="border-t border-success-200 bg-success-50 px-4 py-2 text-sm text-success-700">
                            {t("valid")}
                          </p>
                        ) : (
                          <ul className="max-h-32 overflow-auto border-t border-warning-200 bg-warning-50 px-4 py-2 text-sm text-warning-800">
                            {issues.map((issue) => (
                              <li key={issue}>• {issue}</li>
                            ))}
                          </ul>
                        )
                      ) : null}
                    </div>
                  )}
                />
              </div>
      </Dialog>

      <Dialog isOpen={runOpen} onOpenChange={setRunOpen} size="md" className={"w-full max-w-md "}>
              <DialogDismissButton />

              <Dialog.Header>
                <Dialog.Heading className="flex items-center gap-2">
                  {t("run")}
                </Dialog.Heading>
              </Dialog.Header>
              <Dialog.Body>
                <TextField
                  value={runInput}
                  onChange={setRunInput}
                  className={["w-full"].filter(Boolean).join(" ")}
                >
                  <Label>{t("runInput")}</Label>
                  <TextArea
                    rows={3}
                    className={["[field-sizing:content]"]
                      .filter(Boolean)
                      .join(" ")}
                  />
                  <Description>{t("runInputHint")}</Description>
                </TextField>
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  onPress={() => setRunOpen(false)}
                  variant={actionVariant("default", "light")}
                >
                  {t("cancel")}
                </Button>
                <Button
                  onPress={run}
                  variant={actionVariant("primary", "solid")}
                  isPending={pending}
                >
                  {pending ? <Spinner size="sm" tone="current" /> : null}
                  {<Play className="h-4 w-4" />}
                  {t("run")}
                </Button>
              </Dialog.Footer>
      </Dialog>

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
