"use client";
import { Tabs } from "@/shared/components/kit";

import { useTranslations } from "next-intl";

import { WorkflowFlowPreview, type PreviewNode } from "./workflow-flow-preview";

type Graph = {
  nodes: PreviewNode[];
  edges: { from: string; to: string }[];
} | null;

export function WorkflowTabs({
  active,
  draft,
  draftDiffers,
  versions,
}: {
  active: Graph;
  draft: Graph;
  draftDiffers: boolean;
  versions: {
    version: number;
    date: string;
    graph: Graph;
    isActive: boolean;
  }[];
}) {
  const t = useTranslations("automation.workflows");
  return (
    <section className="rounded-xl border border-ink-200 bg-surface p-3">
      <Tabs emphasis="secondary">
          <Tabs.List aria-label={t("title")}>
            <Tabs.Tab id={"active"} key={"active"}>
              {active ? t("activeWorkflow") : t("draftWorkflow")}
            </Tabs.Tab>
            {draftDiffers && draft ? (
              <Tabs.Tab id={"draft"} key={"draft"}>
                {t("unpublishedDraft")}
              </Tabs.Tab>
            ) : null}
            <Tabs.Tab id={"versions"} key={"versions"}>
              {t("versionHistory")}
            </Tabs.Tab>
          </Tabs.List>
        <Tabs.Panel id={"active"} key={"active"}>
          {(active ?? draft) ? (
            <WorkflowFlowPreview {...(active ?? draft)!} />
          ) : (
            <p className="p-6 text-sm text-ink-500">{t("emptyFlow")}</p>
          )}
        </Tabs.Panel>
        {draftDiffers && draft ? (
          <Tabs.Panel id={"draft"} key={"draft"}>
            <WorkflowFlowPreview {...draft} />
          </Tabs.Panel>
        ) : null}
        <Tabs.Panel id={"versions"} key={"versions"}>
          {versions.length === 0 ? (
            <p className="p-6 text-sm text-ink-500">{t("noVersions")}</p>
          ) : (
            <div className="flex flex-col gap-4">
              {versions.map((version) => (
                <div key={version.version} className="flex flex-col gap-2">
                  <p className="text-sm font-medium">
                    {t("version", { version: version.version })} ·{" "}
                    {version.date}
                    {version.isActive ? (
                      <span className="ms-2 rounded-md bg-success-100 px-1.5 py-0.5 text-xs text-success-700">
                        {t("active")}
                      </span>
                    ) : null}
                  </p>
                  {version.graph ? (
                    <WorkflowFlowPreview {...version.graph} height={260} />
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Tabs.Panel>
      </Tabs>
    </section>
  );
}
