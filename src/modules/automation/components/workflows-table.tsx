"use client";
import { InputGroup, Tabs, TextField } from "@/shared/components/kit";

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
  inactive: "bg-ink-100 text-ink-600",
  draft: "bg-warning-100 text-warning-700",
};

export function WorkflowsTable({ rows }: { rows: WorkflowRow[] }) {
  const t = useTranslations("automation.workflows");
  const router = useRouter();
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");

  const visible = useMemo(
    () =>
      rows.filter(
        (row) =>
          (tab === "all" ||
            (tab === "active"
              ? row.status === "active"
              : row.status !== "active")) &&
          (!query.trim() ||
            row.name
              .toLocaleLowerCase()
              .includes(query.trim().toLocaleLowerCase())),
      ),
    [rows, tab, query],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          selectedKey={tab}
          onSelectionChange={(key) => setTab(String(key))}
          emphasis="secondary"
        >
            <Tabs.List aria-label={t("title")}>
              <Tabs.Tab id={"all"} key={"all"}>
                {t("filter.all")}
              </Tabs.Tab>
              <Tabs.Tab id={"active"} key={"active"}>
                {t("filter.active")}
              </Tabs.Tab>
              <Tabs.Tab id={"inactive"} key={"inactive"}>
                {t("filter.inactive")}
              </Tabs.Tab>
            </Tabs.List>
        </Tabs>
        <TextField
          value={query}
          onChange={setQuery}
          className={["max-w-xs"].filter(Boolean).join(" ")}
        >
          <InputGroup>
            <InputGroup.Prefix>
              {<Search className="h-4 w-4 text-ink-400" />}
            </InputGroup.Prefix>
            <InputGroup.Input
              placeholder={t("search")}
              className={["h-9 text-sm"].filter(Boolean).join(" ")}
            />
          </InputGroup>
        </TextField>
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-200 bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-ink-100 text-ink-600">
            <tr>
              <th className="px-4 py-2 text-start font-medium">
                {t("columns.workflow")}
              </th>
              <th className="px-4 py-2 text-start font-medium">
                {t("columns.status")}
              </th>
              <th className="px-4 py-2 text-start font-medium">
                {t("columns.lastRun")}
              </th>
              <th className="px-4 py-2 text-start font-medium">
                {t("columns.runs30d")}
              </th>
              <th className="px-4 py-2 text-start font-medium">
                {t("columns.updated")}
              </th>
              <th className="px-4 py-2 text-start font-medium">
                {t("columns.trigger")}
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-500">
                  {t("empty")}
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-t border-ink-100 hover:bg-ink-50"
                  onClick={() => router.push(`/automation/workflows/${row.id}`)}
                >
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-medium ${BADGE[row.status]}`}
                    >
                      {t(`statusLabel.${row.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-600">
                    {row.lastRun ?? t("notRecentlyRun")}
                  </td>
                  <td className="px-4 py-3 text-ink-600">{row.runs30d}</td>
                  <td className="px-4 py-3 text-ink-600">
                    {row.updatedBy
                      ? t("editedBy", {
                          name: row.updatedBy,
                          date: row.updated,
                        })
                      : row.updated}
                  </td>
                  <td className="px-4 py-3 text-ink-600">{row.trigger}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-end text-xs text-ink-500">
        {t("showing", { shown: visible.length, total: rows.length })}
      </p>
    </div>
  );
}
