"use client";

import { Tab, Tabs } from "@heroui/react";
import { useTranslations } from "next-intl";

import { WorkflowFlowPreview, type PreviewNode } from "./workflow-flow-preview";

type Graph = { nodes: PreviewNode[]; edges: { from: string; to: string }[] } | null;

export function WorkflowTabs({ active, draft, draftDiffers, versions }: {
  active: Graph;
  draft: Graph;
  draftDiffers: boolean;
  versions: { version: number; date: string; graph: Graph; isActive: boolean }[];
}) {
  const t = useTranslations("automation.workflows");
  return (
    <section className="rounded-large border border-default-200 bg-content1 p-3">
      <Tabs aria-label={t("title")} variant="light">
        <Tab key="active" title={active ? t("activeWorkflow") : t("draftWorkflow")}>
          {(active ?? draft) ? <WorkflowFlowPreview {...(active ?? draft)!} /> : <p className="p-6 text-small text-default-500">{t("emptyFlow")}</p>}
        </Tab>
        {draftDiffers && draft ? (
          <Tab key="draft" title={t("unpublishedDraft")}>
            <WorkflowFlowPreview {...draft} />
          </Tab>
        ) : null}
        <Tab key="versions" title={t("versionHistory")}>
          {versions.length === 0 ? (
            <p className="p-6 text-small text-default-500">{t("noVersions")}</p>
          ) : (
            <div className="flex flex-col gap-4">
              {versions.map((version) => (
                <div key={version.version} className="flex flex-col gap-2">
                  <p className="text-small font-medium">
                    {t("version", { version: version.version })} · {version.date}
                    {version.isActive ? <span className="ms-2 rounded-small bg-success-100 px-1.5 py-0.5 text-tiny text-success-700">{t("active")}</span> : null}
                  </p>
                  {version.graph ? <WorkflowFlowPreview {...version.graph} height={260} /> : null}
                </div>
              ))}
            </div>
          )}
        </Tab>
      </Tabs>
    </section>
  );
}
