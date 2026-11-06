"use client";

import { Input, Tab, Tabs } from "@heroui/react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

export type WorkflowRow = {
  id: string;
  name: string;
  status: "active" | "inactive" | "draft";
  lastRun: string | null;
  runs30d: number;
  updated: string;
  updatedBy: string | null;
  trigger: string;
};

const BADGE: Record<WorkflowRow["status"], string> = {
  active: "bg-success-100 text-success-700",
  inactive: "bg-default-100 text-default-600",
  draft: "bg-warning-100 text-warning-700",
};

export function WorkflowsTable({ rows }: { rows: WorkflowRow[] }) {
  const t = useTranslations("automation.workflows");
  const router = useRouter();
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => rows.filter((row) =>
    (tab === "all" || (tab === "active" ? row.status === "active" : row.status !== "active")) &&
    (!query.trim() || row.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))), [rows, tab, query]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs aria-label={t("title")} selectedKey={tab} onSelectionChange={(key) => setTab(String(key))} variant="light">
          <Tab key="all" title={t("filter.all")} />
          <Tab key="active" title={t("filter.active")} />
          <Tab key="inactive" title={t("filter.inactive")} />
        </Tabs>
        <Input size="sm" className="max-w-xs" placeholder={t("search")} startContent={<Search className="h-4 w-4 text-default-400" />} value={query} onValueChange={setQuery} />
      </div>

      <div className="overflow-x-auto rounded-large border border-default-200 bg-content1">
        <table className="w-full text-small">
          <thead className="bg-default-100 text-default-600">
            <tr>
              <th className="px-4 py-2 text-start font-medium">{t("columns.workflow")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("columns.status")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("columns.lastRun")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("columns.runs30d")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("columns.updated")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("columns.trigger")}</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-default-500">{t("empty")}</td></tr>
            ) : visible.map((row) => (
              <tr key={row.id} className="cursor-pointer border-t border-default-100 hover:bg-default-50" onClick={() => router.push(`/automation/workflows/${row.id}`)}>
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3"><span className={`rounded-small px-2 py-0.5 text-tiny font-medium ${BADGE[row.status]}`}>{t(`statusLabel.${row.status}`)}</span></td>
                <td className="px-4 py-3 text-default-600">{row.lastRun ?? t("notRecentlyRun")}</td>
                <td className="px-4 py-3 text-default-600">{row.runs30d}</td>
                <td className="px-4 py-3 text-default-600">{row.updatedBy ? t("editedBy", { name: row.updatedBy, date: row.updated }) : row.updated}</td>
                <td className="px-4 py-3 text-default-600">{row.trigger}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-end text-tiny text-default-500">{t("showing", { shown: visible.length, total: rows.length })}</p>
    </div>
  );
}
