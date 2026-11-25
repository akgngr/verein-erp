"use client";

import { notify } from "@/shared/components/ui/notify";
import { useDrawerPlacement } from "@/shared/hooks/use-media-query";
import { drawerDialogClass, SheetHandle } from "@/shared/components/forms/form-drawer";
import { Card, Checkbox, Dialog, Input, InputGroup, Label, Select, Sheet, Spinner, StatusChip, Tabs, TextArea, TextField, Button } from "@/shared/components/kit";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";

import { useHydrated } from "@/shared/hooks/use-hydrated";

import {
  addActivityAction,
  addFollowUpAction,
  addPartyAction,
  completeFollowUpAction,
  deleteDealAction,
  getPartyAction,
  moveDealAction,
  removePartyAction,
  saveDealAction,
  searchCandidatesAction,
  updatePartyAction,
} from "../actions/crm-actions";
import { MAX_DEAL_AMOUNT } from "../lib/limits";

const STAGES = ["LEAD", "ACTIVE", "CUSTOMER", "INACTIVE"] as const;
const DEAL_STAGES = ["OPEN", "PROPOSAL", "WON", "LOST"] as const;
const KINDS = ["NOTE", "CALL", "MEETING", "EMAIL", "OTHER"] as const;
const STAGE_COLOR = {
  LEAD: "default",
  ACTIVE: "primary",
  CUSTOMER: "success",
  INACTIVE: "warning",
} as const;

export type PartyRow = {
  id: string;
  source: string;
  stage: (typeof STAGES)[number];
  tags: string[];
  openDeals: number;
  nextFollowUp: string | null;
  name: string;
  detail: string;
  email: string | null;
  phone: string | null;
  missing: boolean;
  /** #582: Rol kaynak modülün kişi verisini göremiyor; ad yerine çevrilmiş "kısıtlı" metni gelir. */
  restricted: boolean;
};
export type DealRow = {
  id: string;
  title: string;
  amountCents: number | null;
  stage: (typeof DEAL_STAGES)[number];
  expectedCloseAt: string | null;
  partyId: string;
  partyName: string;
};
export type FollowUpRow = {
  id: string;
  dueAt: string;
  note: string;
  partyId: string;
  partyName: string;
};
type Stats = {
  deals: Record<string, { count: number; amount: number }>;
  parties: Record<string, number>;
  overdueFollowUps: number;
};
type Detail = Extract<
  Awaited<ReturnType<typeof getPartyAction>>,
  { ok: true }
>["data"];

/** CRM: özet, kişiler, fırsat panosu, takipler; kişi ayrıntısı sağ çekmecede. */
export function CrmApp({
  parties,
  deals,
  followUps,
  stats,
  can,
}: {
  parties: PartyRow[];
  deals: DealRow[];
  followUps: FollowUpRow[];
  stats: Stats;
  can: { create: boolean; update: boolean; delete: boolean };
}) {
  const t = useTranslations("crm");
  const format = useFormatter();
  const hydrated = useHydrated();
  const router = useRouter();
  const [tab, setTab] = useState("parties");
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<string>("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const money = (cents: number | null) =>
    cents === null
      ? "—"
      : format.number(cents / 100, { style: "currency", currency: "EUR" });
  const date = (iso: string | null) =>
    iso && hydrated
      ? format.dateTime(new Date(iso), { dateStyle: "medium" })
      : "";
  const pipeline = (["OPEN", "PROPOSAL"] as const).reduce(
    (sum, key) => sum + (stats.deals[key]?.amount ?? 0),
    0,
  );
  const visible = parties.filter(
    (row) =>
      (!stage || row.stage === stage) &&
      (!query ||
        `${row.name} ${row.detail} ${row.tags.join(" ")}`
          .toLocaleLowerCase("tr")
          .includes(query.toLocaleLowerCase("tr"))),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t("stats.parties")} value={String(parties.length)} />
        <Stat
          label={t("stats.openDeals")}
          value={String(
            (stats.deals.OPEN?.count ?? 0) + (stats.deals.PROPOSAL?.count ?? 0),
          )}
        />
        <Stat
          label={t("stats.pipeline")}
          value={format.number(pipeline, {
            style: "currency",
            currency: "EUR",
          })}
        />
        <Stat
          label={t("stats.overdue")}
          value={String(stats.overdueFollowUps)}
          danger={stats.overdueFollowUps > 0}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Tabs
          selectedKey={tab}
          onSelectionChange={(key) => setTab(String(key))}
          emphasis="secondary"
        >
            <Tabs.List aria-label={t("title")}>
              <Tabs.Tab id={"parties"} key={"parties"}>
                {t("tabs.parties")}
              </Tabs.Tab>
              <Tabs.Tab id={"deals"} key={"deals"}>
                {t("tabs.deals")}
              </Tabs.Tab>
              <Tabs.Tab id={"followUps"} key={"followUps"}>
                {t("tabs.followUps", { count: followUps.length })}
              </Tabs.Tab>
            </Tabs.List>
        </Tabs>
        {can.create ? (
          <Button
            className="ms-auto"
            onPress={() => setAdding(true)}
            variant={actionVariant("primary", "solid")}
          >
            {<Plus className="h-4 w-4" />}
            {t("addParty")}
          </Button>
        ) : null}
      </div>

      {tab === "parties" ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <TextField
              value={query}
              onChange={setQuery}
              className={["max-w-xs"].filter(Boolean).join(" ")}
            >
              <InputGroup>
                <InputGroup.Prefix>
                  {<Search className="h-4 w-4" />}
                </InputGroup.Prefix>
                <InputGroup.Input
                  placeholder={t("search")}
                  className={["h-9 text-sm"].filter(Boolean).join(" ")}
                />
              </InputGroup>
            </TextField>
            {hydrated ? (
              <Select
                id="crm-stage-filter"
                className="max-w-[200px]"
                aria-label={t("stage")}
                placeholder={t("allStages")}
                value={stage ? stage : null}
                onChange={(selectedValue) => {
                  const keys =
                    selectedValue === null ? undefined : String(selectedValue);
                  return setStage(String(keys ?? ""));
                }} size="sm">
                    {STAGES.map((item) => (
                      <Select.Item
                        key={item}
                        id={item}
                        textValue={String(t(`stages.${item}`))}
                      >
                        <Label>{t(`stages.${item}`)}</Label>
                      </Select.Item>
                    ))}
              </Select>
            ) : null}
          </div>
          {visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-500">
              {t("empty")}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-ink-200 bg-surface">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink-500">
                    <th className="px-3 py-2">{t("columns.name")}</th>
                    <th className="px-3 py-2">{t("columns.source")}</th>
                    <th className="px-3 py-2">{t("stage")}</th>
                    <th className="px-3 py-2">{t("columns.openDeals")}</th>
                    <th className="px-3 py-2">{t("columns.nextFollowUp")}</th>
                    <th className="px-3 py-2">{t("columns.tags")}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-t border-ink-100 hover:bg-ink-50"
                      onClick={() => setOpenId(row.id)}
                    >
                      <td className="px-3 py-2">
                        <div className={row.restricted ? "font-medium italic text-ink-500" : "font-medium"}>{row.name}</div>
                        {row.detail ? (
                          <div className="text-xs text-ink-500">
                            {row.detail}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-ink-600">
                        {t(`sources.${row.source}` as never)}
                      </td>
                      <td className="px-3 py-2">
                        <StatusChip tone={STAGE_COLOR[row.stage]}
                        >
                          {t(`stages.${row.stage}`)}
                        </StatusChip>
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {row.openDeals}
                      </td>
                      <td className="px-3 py-2">
                        {row.nextFollowUp ? date(row.nextFollowUp) : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {row.tags.map((tag) => (
                            <StatusChip
                              key={tag}
                              className={"border border-current"}
                            >
                              {tag}
                            </StatusChip>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {tab === "deals" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {DEAL_STAGES.map((column) => {
            const items = deals.filter((deal) => deal.stage === column);
            return (
              <section
                key={column}
                className="flex min-w-0 flex-col gap-2 rounded-xl bg-ink-50 p-3 dark:bg-ink-100/40"
              >
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  {t(`dealStages.${column}`)}
                  <span className="ms-auto text-xs text-ink-500">
                    {money(
                      items.reduce(
                        (sum, deal) => sum + (deal.amountCents ?? 0),
                        0,
                      ),
                    )}
                  </span>
                </h2>
                {items.length === 0 ? (
                  <p className="py-4 text-center text-xs text-ink-400">
                    {t("noDeals")}
                  </p>
                ) : null}
                {items.map((deal) => (
                  <Card
                    key={deal.id}
                    className={"shadow-sm border border-ink-200/80"}
                  >
                    <Card.Content
                      className={["flex flex-col gap-1"]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span className="font-medium">{deal.title}</span>
                      <button
                        type="button"
                        className="text-start text-xs text-accent hover:underline"
                        onClick={() => setOpenId(deal.partyId)}
                      >
                        {deal.partyName}
                      </button>
                      <span className="text-sm tabular-nums">
                        {money(deal.amountCents)}
                        {deal.expectedCloseAt
                          ? ` · ${date(deal.expectedCloseAt)}`
                          : ""}
                      </span>
                      {can.update ? (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {DEAL_STAGES.filter((next) => next !== column).map(
                            (next) => (
                              <Button
                                key={next}
                                size="sm"
                                onPress={async () => {
                                  const response = await moveDealAction({
                                    id: deal.id,
                                    stage: next,
                                  });
                                  if (!response.ok)
                                    return void notify.error(response.error);
                                  router.refresh();
                                }}
                                variant={actionVariant("default", "light")}
                              >
                                {t(`dealStages.${next}`)}
                                {<ArrowRight className="h-3 w-3" />}
                              </Button>
                            ),
                          )}
                        </div>
                      ) : null}
                    </Card.Content>
                  </Card>
                ))}
              </section>
            );
          })}
        </div>
      ) : null}

      {tab === "followUps" ? (
        followUps.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-500">
            {t("noFollowUps")}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {followUps.map((item) => {
              const overdue = hydrated && new Date(item.dueAt) < new Date();
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border border-ink-200 bg-surface p-3"
                >
                  {can.update ? (
                    <Checkbox
                      aria-label={t("markDone")}
                      onChange={async () => {
                        await completeFollowUpAction({
                          id: item.id,
                          done: true,
                        });
                        router.refresh();
                      }}
                    >
                        <Label></Label>
                    </Checkbox>
                  ) : null}
                  <CalendarClock
                    className={`h-4 w-4 ${overdue ? "text-danger" : "text-ink-500"}`}
                  />
                  <span
                    className={`text-sm tabular-nums ${overdue ? "text-danger" : ""}`}
                  >
                    {date(item.dueAt)}
                  </span>
                  <span className="text-sm">{item.note}</span>
                  <button
                    type="button"
                    className="ms-auto text-sm text-accent hover:underline"
                    onClick={() => setOpenId(item.partyId)}
                  >
                    {item.partyName}
                  </button>
                </li>
              );
            })}
          </ul>
        )
      ) : null}

      <PartyDrawer
        id={openId}
        onClose={() => setOpenId(null)}
        can={can}
        onChanged={() => router.refresh()}
      />
      {adding ? (
        <AddPartyModal
          onClose={() => setAdding(false)}
          onAdded={(id) => {
            setAdding(false);
            router.refresh();
            setOpenId(id);
          }}
        />
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <Card className={"shadow-sm border border-ink-200/80"}>
      <Card.Content className={["gap-1"].filter(Boolean).join(" ")}>
        <span className="text-xs text-ink-500">{label}</span>
        <span
          className={`text-xl font-semibold tabular-nums ${danger ? "text-danger" : ""}`}
        >
          {value}
        </span>
      </Card.Content>
    </Card>
  );
}

function AddPartyModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (id: string) => void;
}) {
  const t = useTranslations("crm");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    {
      source: string;
      id: string;
      name: string;
      detail: string;
      partyId: string | null;
    }[]
  >([]);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const timer = setTimeout(
      () =>
        startTransition(async () => {
          const response = await searchCandidatesAction({ q: query });
          if (response.ok) setResults(response.data);
        }),
      250,
    );
    return () => clearTimeout(timer);
  }, [query]);
  return (
    <Dialog isOpen onOpenChange={(open) => !open && onClose()} size="lg" scroll={"inside"} className={"w-full max-w-lg "}>
            <DialogDismissButton />

            <Dialog.Header>
              <Dialog.Heading className="flex items-center gap-2">
                {t("addParty")}
              </Dialog.Heading>
            </Dialog.Header>
            <Dialog.Body className="pb-6">
              <TextField
                value={query}
                onChange={setQuery}
                className={["w-full"].filter(Boolean).join(" ")}
              >
                <InputGroup>
                  <InputGroup.Prefix>
                    {<Search className="h-4 w-4" />}
                  </InputGroup.Prefix>
                  <InputGroup.Input
                    autoFocus
                    placeholder={t("searchSources")}
                  />
                  <InputGroup.Suffix>
                    {pending ? <Spinner size="sm"></Spinner> : null}
                  </InputGroup.Suffix>
                </InputGroup>
              </TextField>
              <ul className="flex flex-col divide-y divide-ink-100">
                {results.map((row) => (
                  <li
                    key={`${row.source}:${row.id}`}
                    className="flex items-center gap-3 py-2"
                  >
                    {row.source === "members" ? (
                      <UserRound className="h-4 w-4 text-ink-500" />
                    ) : (
                      <BriefcaseBusiness className="h-4 w-4 text-ink-500" />
                    )}
                    <span className="flex flex-col">
                      <span className="text-sm font-medium">{row.name}</span>
                      <span className="text-xs text-ink-500">
                        {t(`sources.${row.source}` as never)} · {row.detail}
                      </span>
                    </span>
                    {row.partyId ? (
                      <Button
                        size="sm"
                        className="ms-auto"
                        onPress={() => onAdded(row.partyId!)}
                        variant={actionVariant("default", "flat")}
                      >
                        {t("open")}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="ms-auto"
                        onPress={async () => {
                          const response = await addPartyAction({
                            source: row.source,
                            sourceId: row.id,
                          });
                          if (!response.ok)
                            return void notify.error(response.error);
                          onAdded(response.data.id);
                        }}
                        variant={actionVariant("primary", "flat")}
                      >
                        {<Plus className="h-3.5 w-3.5" />}
                        {t("add")}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </Dialog.Body>
    </Dialog>
  );
}

function PartyDrawer({
  id,
  onClose,
  can,
  onChanged,
}: {
  id: string | null;
  onClose: () => void;
  can: { update: boolean; delete: boolean };
  onChanged: () => void;
}) {
  const drawerPlacement = useDrawerPlacement();
  const t = useTranslations("crm");
  const format = useFormatter();
  const [loaded, setDetail] = useState<Detail | null>(null);
  const detail = loaded && loaded.id === id ? loaded : null;
  const [kind, setKind] = useState<(typeof KINDS)[number]>("NOTE");
  const [summary, setSummary] = useState("");
  const [deal, setDeal] = useState({ title: "", amount: "", close: "" });
  const [follow, setFollow] = useState({ dueAt: "", note: "" });
  const [tags, setTags] = useState("");

  const load = useCallback(() => {
    if (!id) return Promise.resolve();
    return getPartyAction({ id }).then((response) => {
      if (!response.ok)
        return void notify.error(response.error);
      setDetail(response.data);
      setTags(response.data.tags.join(", "));
    });
  }, [id]);
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void getPartyAction({ id }).then((response) => {
      if (cancelled) return;
      if (!response.ok)
        return void notify.error(response.error);
      setDetail(response.data);
      setTags(response.data.tags.join(", "));
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const run = async (call: () => Promise<{ ok: boolean; error?: string }>) => {
    const response = await call();
    if (!response.ok) return void notify.error(response.error);
    await load();
    onChanged();
  };
  const money = (cents: number | null) =>
    cents === null
      ? "—"
      : format.number(cents / 100, { style: "currency", currency: "EUR" });

  return (
    <Sheet isOpen={Boolean(id)} onOpenChange={(open) => !open && onClose()} placement={drawerPlacement} className={drawerDialogClass(drawerPlacement, "sm:max-w-xl")}>
          {drawerPlacement === "bottom" ? <SheetHandle /> : null}
            <DialogDismissButton drawer />

            <Sheet.Header className="flex flex-col gap-1">
              <Sheet.Heading className="flex items-center gap-2">
                {detail ? (
                  <>
                    <span>{detail.name}</span>
                    <span className="flex flex-wrap gap-3 text-sm font-normal text-ink-500">
                      <span>
                        {t(`sources.${detail.source}` as never)}
                        {detail.detail ? ` · ${detail.detail}` : ""}
                      </span>
                      {detail.email ? (
                        <a
                          className="flex items-center gap-1 hover:underline"
                          href={`mailto:${detail.email}`}
                        >
                          <Mail className="h-3.5 w-3.5" />
                          {detail.email}
                        </a>
                      ) : null}
                      {detail.phone ? (
                        <a
                          className="flex items-center gap-1 hover:underline"
                          href={`tel:${detail.phone}`}
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {detail.phone}
                        </a>
                      ) : null}
                    </span>
                  </>
                ) : (
                  <Spinner size="sm"></Spinner>
                )}
              </Sheet.Heading>
            </Sheet.Header>
            <Sheet.Body className="flex flex-col gap-6 pb-8">
              {detail ? (
                <>
                  <div className="flex flex-wrap items-end gap-2">
                    <Select
                      id="crm-party-stage"
                      className="max-w-[200px]"
                      isDisabled={!can.update}
                      value={detail.stage}
                      onChange={(selectedValue) => {
                        const keys =
                          selectedValue === null
                            ? undefined
                            : String(selectedValue);
                        const value = keys;
                        if (value)
                          void run(() =>
                            updatePartyAction({ id: detail.id, stage: value }),
                          );
                      }} size="sm">
                      <Label>{t("stage")}</Label>
                          {STAGES.map((item) => (
                            <Select.Item
                              key={item}
                              id={item}
                              textValue={String(t(`stages.${item}`))}
                            >
                              <Label>{t(`stages.${item}`)}</Label>
                            </Select.Item>
                          ))}
                    </Select>
                    <TextField
                      value={tags}
                      isDisabled={!can.update}
                      onChange={setTags}
                      className={["max-w-xs"].filter(Boolean).join(" ")}
                    >
                      <Label>{t("columns.tags")}</Label>
                      <Input
                        onBlur={() =>
                          void run(() =>
                            updatePartyAction({
                              id: detail.id,
                              tags: tags
                                .split(",")
                                .map((tag) => tag.trim())
                                .filter(Boolean),
                            }),
                          )
                        }
                        className={["h-9 text-sm"].filter(Boolean).join(" ")}
                      />
                    </TextField>
                    {can.delete ? (
                      <Button
                        size="sm"
                        className="ms-auto"
                        onPress={() =>
                          void run(async () => {
                            const response = await removePartyAction({
                              id: detail.id,
                            });
                            if (response.ok) onClose();
                            return response;
                          })
                        }
                        variant={actionVariant("danger", "light")}
                      >
                        {<Trash2 className="h-4 w-4" />}
                        {t("remove")}
                      </Button>
                    ) : null}
                  </div>

                  <section className="flex flex-col gap-2">
                    <h3 className="font-semibold">{t("tabs.deals")}</h3>
                    {detail.deals.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-ink-200 p-2 text-sm"
                      >
                        <span className="font-medium">{item.title}</span>
                        <span className="tabular-nums">
                          {money(item.amountCents)}
                        </span>
                        <StatusChip>
                          {t(`dealStages.${item.stage}`)}
                        </StatusChip>
                        {can.delete ? (
                          <Button
                            isIconOnly
                            size="sm"
                            className="ms-auto"
                            aria-label={t("remove")}
                            onPress={() =>
                              void run(() => deleteDealAction({ id: item.id }))
                            }
                            variant={actionVariant("danger", "light")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    ))}
                    {can.update ? (
                      <div className="flex flex-wrap items-end gap-2">
                        <TextField
                          value={deal.title}
                          onChange={(title) =>
                            setDeal((current) => ({ ...current, title }))
                          }
                          className={["max-w-xs"].filter(Boolean).join(" ")}
                        >
                          <Label>{t("dealTitle")}</Label>
                          <Input
                            className={["h-9 text-sm"]
                              .filter(Boolean)
                              .join(" ")}
                          />
                        </TextField>
                        <TextField
                          value={deal.amount}
                          onChange={(amount) =>
                            setDeal((current) => ({ ...current, amount }))
                          }
                          className={["max-w-[140px]"]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <Label>{t("amount")}</Label>
                          <Input
                            type="number"
                            min={0}
                            max={MAX_DEAL_AMOUNT}
                            className={["h-9 text-sm"]
                              .filter(Boolean)
                              .join(" ")}
                          />
                        </TextField>
                        <TextField
                          value={deal.close}
                          onChange={(close) =>
                            setDeal((current) => ({ ...current, close }))
                          }
                          className={["max-w-[170px]"]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <Label>{t("expectedClose")}</Label>
                          <Input
                            type="date"
                            placeholder=" "
                            className={["h-9 text-sm"]
                              .filter(Boolean)
                              .join(" ")}
                          />
                        </TextField>
                        <Button
                          size="sm"
                          isDisabled={deal.title.trim().length < 2}
                          onPress={() =>
                            void run(async () => {
                              const response = await saveDealAction({
                                partyId: detail.id,
                                title: deal.title,
                                amount: deal.amount
                                  ? Number(deal.amount)
                                  : null,
                                expectedCloseAt: deal.close || null,
                              });
                              if (response.ok)
                                setDeal({ title: "", amount: "", close: "" });
                              return response;
                            })
                          }
                          variant={actionVariant("primary", "flat")}
                        >
                          {t("addDeal")}
                        </Button>
                      </div>
                    ) : null}
                  </section>

                  <section className="flex flex-col gap-2">
                    <h3 className="font-semibold">
                      {t("tabs.followUps", {
                        count: detail.followUps.filter((item) => !item.done)
                          .length,
                      })}
                    </h3>
                    {detail.followUps.map((item) => (
                      <Checkbox
                        key={item.id}
                        isSelected={item.done}
                        isDisabled={!can.update}
                        onChange={(value) =>
                          void run(() =>
                            completeFollowUpAction({
                              id: item.id,
                              done: value,
                            }),
                          )
                        }
                      >
                          <Label>
                            <span className="text-sm">
                              {format.dateTime(new Date(item.dueAt), {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}{" "}
                              · {item.note}
                            </span>
                          </Label>
                      </Checkbox>
                    ))}
                    {can.update ? (
                      <div className="flex flex-wrap items-end gap-2">
                        <TextField
                          value={follow.dueAt}
                          onChange={(dueAt) =>
                            setFollow((current) => ({ ...current, dueAt }))
                          }
                          className={["max-w-[220px]"]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <Label>{t("dueAt")}</Label>
                          <Input
                            type="datetime-local"
                            placeholder=" "
                            className={["h-9 text-sm"]
                              .filter(Boolean)
                              .join(" ")}
                          />
                        </TextField>
                        <TextField
                          value={follow.note}
                          onChange={(note) =>
                            setFollow((current) => ({ ...current, note }))
                          }
                          className={["max-w-xs"].filter(Boolean).join(" ")}
                        >
                          <Label>{t("followUpNote")}</Label>
                          <Input
                            className={["h-9 text-sm"]
                              .filter(Boolean)
                              .join(" ")}
                          />
                        </TextField>
                        <Button
                          size="sm"
                          isDisabled={
                            !follow.dueAt || follow.note.trim().length < 2
                          }
                          onPress={() =>
                            void run(async () => {
                              const response = await addFollowUpAction({
                                partyId: detail.id,
                                dueAt: new Date(follow.dueAt).toISOString(),
                                note: follow.note,
                              });
                              if (response.ok)
                                setFollow({ dueAt: "", note: "" });
                              return response;
                            })
                          }
                          variant={actionVariant("primary", "flat")}
                        >
                          {t("addFollowUp")}
                        </Button>
                      </div>
                    ) : null}
                  </section>

                  <section className="flex flex-col gap-2">
                    <h3 className="font-semibold">{t("timeline")}</h3>
                    {can.update ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-1">
                          {KINDS.map((item) => (
                            <StatusChip tone={kind === item ? "primary" : "default"}
                              key={item}
                              onClick={() => setKind(item)}
                              className={["cursor-pointer"]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              {t(`kinds.${item}`)}
                            </StatusChip>
                          ))}
                        </div>
                        <TextField
                          value={summary}
                          onChange={setSummary}
                          className={["w-full"].filter(Boolean).join(" ")}
                        >
                          <TextArea
                            placeholder={t("activityPlaceholder")}
                            rows={2}
                            className={["text-sm", "[field-sizing:content]"]
                              .filter(Boolean)
                              .join(" ")}
                          />
                        </TextField>
                        <Button
                          size="sm"
                          className="self-start"
                          isDisabled={summary.trim().length < 2}
                          onPress={() =>
                            void run(async () => {
                              const response = await addActivityAction({
                                partyId: detail.id,
                                kind,
                                summary,
                              });
                              if (response.ok) setSummary("");
                              return response;
                            })
                          }
                          variant={actionVariant("primary", "solid")}
                        >
                          {t("addActivity")}
                        </Button>
                      </div>
                    ) : null}
                    <ol className="flex flex-col gap-3 border-s border-ink-200 ps-4">
                      {detail.activities.map((item) => (
                        <li key={item.id} className="flex flex-col">
                          <span className="text-xs text-ink-500">
                            {format.dateTime(new Date(item.occurredAt), {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}{" "}
                            · {t(`kinds.${item.kind}`)} · {item.by}
                          </span>
                          <span className="whitespace-pre-wrap text-sm">
                            {item.summary}
                          </span>
                        </li>
                      ))}
                      {detail.activities.length === 0 ? (
                        <li className="text-sm text-ink-500">
                          {t("noActivities")}
                        </li>
                      ) : null}
                    </ol>
                  </section>
                </>
              ) : null}
            </Sheet.Body>
    </Sheet>
  );
}
