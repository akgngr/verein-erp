"use client";

import {
  addToast,
  Button,
  Card,
  CardBody,
  Checkbox,
  Chip,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  Select,
  SelectItem,
  Spinner,
  Tab,
  Tabs,
  Textarea,
} from "@heroui/react";
import { ArrowRight, BriefcaseBusiness, CalendarClock, Mail, Phone, Plus, Search, Trash2, UserRound } from "lucide-react";
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

const STAGES = ["LEAD", "ACTIVE", "CUSTOMER", "INACTIVE"] as const;
const DEAL_STAGES = ["OPEN", "PROPOSAL", "WON", "LOST"] as const;
const KINDS = ["NOTE", "CALL", "MEETING", "EMAIL", "OTHER"] as const;
const STAGE_COLOR = { LEAD: "default", ACTIVE: "primary", CUSTOMER: "success", INACTIVE: "warning" } as const;

export type PartyRow = { id: string; source: string; stage: (typeof STAGES)[number]; tags: string[]; openDeals: number; nextFollowUp: string | null; name: string; detail: string; email: string | null; phone: string | null; missing: boolean };
export type DealRow = { id: string; title: string; amountCents: number | null; stage: (typeof DEAL_STAGES)[number]; expectedCloseAt: string | null; partyId: string; partyName: string };
export type FollowUpRow = { id: string; dueAt: string; note: string; partyId: string; partyName: string };
type Stats = { deals: Record<string, { count: number; amount: number }>; parties: Record<string, number>; overdueFollowUps: number };
type Detail = Extract<Awaited<ReturnType<typeof getPartyAction>>, { ok: true }>["data"];

/** CRM: özet, kişiler, fırsat panosu, takipler; kişi ayrıntısı sağ çekmecede. */
export function CrmApp({ parties, deals, followUps, stats, can }: { parties: PartyRow[]; deals: DealRow[]; followUps: FollowUpRow[]; stats: Stats; can: { create: boolean; update: boolean; delete: boolean } }) {
  const t = useTranslations("crm");
  const format = useFormatter();
  const hydrated = useHydrated();
  const router = useRouter();
  const [tab, setTab] = useState("parties");
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<string>("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const money = (cents: number | null) => (cents === null ? "—" : format.number(cents / 100, { style: "currency", currency: "EUR" }));
  const date = (iso: string | null) => (iso && hydrated ? format.dateTime(new Date(iso), { dateStyle: "medium" }) : "");
  const pipeline = (["OPEN", "PROPOSAL"] as const).reduce((sum, key) => sum + (stats.deals[key]?.amount ?? 0), 0);
  const visible = parties.filter((row) => (!stage || row.stage === stage) && (!query || `${row.name} ${row.detail} ${row.tags.join(" ")}`.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr"))));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t("stats.parties")} value={String(parties.length)} />
        <Stat label={t("stats.openDeals")} value={String((stats.deals.OPEN?.count ?? 0) + (stats.deals.PROPOSAL?.count ?? 0))} />
        <Stat label={t("stats.pipeline")} value={format.number(pipeline, { style: "currency", currency: "EUR" })} />
        <Stat label={t("stats.overdue")} value={String(stats.overdueFollowUps)} danger={stats.overdueFollowUps > 0} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(String(key))} aria-label={t("title")}>
          <Tab key="parties" title={t("tabs.parties")} />
          <Tab key="deals" title={t("tabs.deals")} />
          <Tab key="followUps" title={t("tabs.followUps", { count: followUps.length })} />
        </Tabs>
        {can.create ? <Button color="primary" className="ms-auto" startContent={<Plus className="h-4 w-4" />} onPress={() => setAdding(true)}>{t("addParty")}</Button> : null}
      </div>

      {tab === "parties" ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Input size="sm" className="max-w-xs" startContent={<Search className="h-4 w-4" />} placeholder={t("search")} value={query} onValueChange={setQuery} />
            {hydrated ? (
              <Select id="crm-stage-filter" size="sm" className="max-w-[200px]" aria-label={t("stage")} placeholder={t("allStages")} selectedKeys={stage ? [stage] : []} onSelectionChange={(keys) => setStage(String(Array.from(keys)[0] ?? ""))}>
                {STAGES.map((item) => <SelectItem key={item}>{t(`stages.${item}`)}</SelectItem>)}
              </Select>
            ) : null}
          </div>
          {visible.length === 0 ? <p className="py-10 text-center text-small text-default-500">{t("empty")}</p> : (
            <div className="overflow-x-auto rounded-large border border-default-200 bg-content1">
              <table className="w-full text-small">
                <thead><tr className="text-left text-tiny text-default-500">
                  <th className="px-3 py-2">{t("columns.name")}</th><th className="px-3 py-2">{t("columns.source")}</th><th className="px-3 py-2">{t("stage")}</th>
                  <th className="px-3 py-2">{t("columns.openDeals")}</th><th className="px-3 py-2">{t("columns.nextFollowUp")}</th><th className="px-3 py-2">{t("columns.tags")}</th>
                </tr></thead>
                <tbody>
                  {visible.map((row) => (
                    <tr key={row.id} className="cursor-pointer border-t border-default-100 hover:bg-default-50" onClick={() => setOpenId(row.id)}>
                      <td className="px-3 py-2"><div className="font-medium">{row.name}</div>{row.detail ? <div className="text-tiny text-default-500">{row.detail}</div> : null}</td>
                      <td className="px-3 py-2 text-default-600">{t(`sources.${row.source}` as never)}</td>
                      <td className="px-3 py-2"><Chip size="sm" variant="flat" color={STAGE_COLOR[row.stage]}>{t(`stages.${row.stage}`)}</Chip></td>
                      <td className="px-3 py-2 tabular-nums">{row.openDeals}</td>
                      <td className="px-3 py-2">{row.nextFollowUp ? date(row.nextFollowUp) : "—"}</td>
                      <td className="px-3 py-2"><div className="flex flex-wrap gap-1">{row.tags.map((tag) => <Chip key={tag} size="sm" variant="bordered">{tag}</Chip>)}</div></td>
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
              <section key={column} className="flex min-w-0 flex-col gap-2 rounded-large bg-default-50 p-3 dark:bg-default-100/40">
                <h2 className="flex items-center gap-2 text-small font-semibold">{t(`dealStages.${column}`)}<span className="ms-auto text-tiny text-default-500">{money(items.reduce((sum, deal) => sum + (deal.amountCents ?? 0), 0))}</span></h2>
                {items.length === 0 ? <p className="py-4 text-center text-tiny text-default-400">{t("noDeals")}</p> : null}
                {items.map((deal) => (
                  <Card key={deal.id} shadow="sm">
                    <CardBody className="flex flex-col gap-1">
                      <span className="font-medium">{deal.title}</span>
                      <button type="button" className="text-start text-tiny text-primary hover:underline" onClick={() => setOpenId(deal.partyId)}>{deal.partyName}</button>
                      <span className="text-small tabular-nums">{money(deal.amountCents)}{deal.expectedCloseAt ? ` · ${date(deal.expectedCloseAt)}` : ""}</span>
                      {can.update ? (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {DEAL_STAGES.filter((next) => next !== column).map((next) => (
                            <Button key={next} size="sm" variant="light" endContent={<ArrowRight className="h-3 w-3" />}
                              onPress={async () => { const response = await moveDealAction({ id: deal.id, stage: next }); if (!response.ok) return void addToast({ title: response.error, color: "danger" }); router.refresh(); }}>
                              {t(`dealStages.${next}`)}
                            </Button>
                          ))}
                        </div>
                      ) : null}
                    </CardBody>
                  </Card>
                ))}
              </section>
            );
          })}
        </div>
      ) : null}

      {tab === "followUps" ? (
        followUps.length === 0 ? <p className="py-10 text-center text-small text-default-500">{t("noFollowUps")}</p> : (
          <ul className="flex flex-col gap-2">
            {followUps.map((item) => {
              const overdue = hydrated && new Date(item.dueAt) < new Date();
              return (
                <li key={item.id} className="flex items-center gap-3 rounded-medium border border-default-200 bg-content1 p-3">
                  {can.update ? <Checkbox aria-label={t("markDone")} onValueChange={async () => { await completeFollowUpAction({ id: item.id, done: true }); router.refresh(); }} /> : null}
                  <CalendarClock className={`h-4 w-4 ${overdue ? "text-danger" : "text-default-500"}`} />
                  <span className={`text-small tabular-nums ${overdue ? "text-danger" : ""}`}>{date(item.dueAt)}</span>
                  <span className="text-small">{item.note}</span>
                  <button type="button" className="ms-auto text-small text-primary hover:underline" onClick={() => setOpenId(item.partyId)}>{item.partyName}</button>
                </li>
              );
            })}
          </ul>
        )
      ) : null}

      <PartyDrawer id={openId} onClose={() => setOpenId(null)} can={can} onChanged={() => router.refresh()} />
      {adding ? <AddPartyModal onClose={() => setAdding(false)} onAdded={(id) => { setAdding(false); router.refresh(); setOpenId(id); }} /> : null}
    </div>
  );
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <Card shadow="sm"><CardBody className="gap-1">
      <span className="text-tiny text-default-500">{label}</span>
      <span className={`text-xl font-semibold tabular-nums ${danger ? "text-danger" : ""}`}>{value}</span>
    </CardBody></Card>
  );
}

function AddPartyModal({ onClose, onAdded }: { onClose: () => void; onAdded: (id: string) => void }) {
  const t = useTranslations("crm");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ source: string; id: string; name: string; detail: string; partyId: string | null }[]>([]);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const timer = setTimeout(() => startTransition(async () => {
      const response = await searchCandidatesAction({ q: query });
      if (response.ok) setResults(response.data);
    }), 250);
    return () => clearTimeout(timer);
  }, [query]);
  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()} size="lg" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>{t("addParty")}</ModalHeader>
        <ModalBody className="pb-6">
          <Input autoFocus startContent={<Search className="h-4 w-4" />} placeholder={t("searchSources")} value={query} onValueChange={setQuery} endContent={pending ? <Spinner size="sm" /> : null} />
          <ul className="flex flex-col divide-y divide-default-100">
            {results.map((row) => (
              <li key={`${row.source}:${row.id}`} className="flex items-center gap-3 py-2">
                {row.source === "members" ? <UserRound className="h-4 w-4 text-default-500" /> : <BriefcaseBusiness className="h-4 w-4 text-default-500" />}
                <span className="flex flex-col"><span className="text-small font-medium">{row.name}</span><span className="text-tiny text-default-500">{t(`sources.${row.source}` as never)} · {row.detail}</span></span>
                {row.partyId ? (
                  <Button size="sm" variant="flat" className="ms-auto" onPress={() => onAdded(row.partyId!)}>{t("open")}</Button>
                ) : (
                  <Button size="sm" color="primary" variant="flat" className="ms-auto" startContent={<Plus className="h-3.5 w-3.5" />}
                    onPress={async () => { const response = await addPartyAction({ source: row.source, sourceId: row.id }); if (!response.ok) return void addToast({ title: response.error, color: "danger" }); onAdded(response.data.id); }}>
                    {t("add")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

function PartyDrawer({ id, onClose, can, onChanged }: { id: string | null; onClose: () => void; can: { update: boolean; delete: boolean }; onChanged: () => void }) {
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
      if (!response.ok) return void addToast({ title: response.error, color: "danger" });
      setDetail(response.data);
      setTags(response.data.tags.join(", "));
    });
  }, [id]);
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void getPartyAction({ id }).then((response) => {
      if (cancelled) return;
      if (!response.ok) return void addToast({ title: response.error, color: "danger" });
      setDetail(response.data);
      setTags(response.data.tags.join(", "));
    });
    return () => { cancelled = true; };
  }, [id]);

  const run = async (call: () => Promise<{ ok: boolean; error?: string }>) => {
    const response = await call();
    if (!response.ok) return void addToast({ title: response.error, color: "danger" });
    await load();
    onChanged();
  };
  const money = (cents: number | null) => (cents === null ? "—" : format.number(cents / 100, { style: "currency", currency: "EUR" }));

  return (
    <Drawer isOpen={Boolean(id)} onOpenChange={(open) => !open && onClose()} size="xl">
      <DrawerContent>
        <DrawerHeader className="flex flex-col gap-1">
          {detail ? (
            <>
              <span>{detail.name}</span>
              <span className="flex flex-wrap gap-3 text-small font-normal text-default-500">
                <span>{t(`sources.${detail.source}` as never)}{detail.detail ? ` · ${detail.detail}` : ""}</span>
                {detail.email ? <a className="flex items-center gap-1 hover:underline" href={`mailto:${detail.email}`}><Mail className="h-3.5 w-3.5" />{detail.email}</a> : null}
                {detail.phone ? <a className="flex items-center gap-1 hover:underline" href={`tel:${detail.phone}`}><Phone className="h-3.5 w-3.5" />{detail.phone}</a> : null}
              </span>
            </>
          ) : <Spinner size="sm" />}
        </DrawerHeader>
        <DrawerBody className="flex flex-col gap-6 pb-8">
          {detail ? (
            <>
              <div className="flex flex-wrap items-end gap-2">
                <Select id="crm-party-stage" size="sm" className="max-w-[200px]" label={t("stage")} selectedKeys={[detail.stage]} isDisabled={!can.update}
                  onSelectionChange={(keys) => { const value = Array.from(keys)[0]; if (value) void run(() => updatePartyAction({ id: detail.id, stage: value })); }}>
                  {STAGES.map((item) => <SelectItem key={item}>{t(`stages.${item}`)}</SelectItem>)}
                </Select>
                <Input size="sm" className="max-w-xs" label={t("columns.tags")} value={tags} onValueChange={setTags} isDisabled={!can.update}
                  onBlur={() => void run(() => updatePartyAction({ id: detail.id, tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean) }))} />
                {can.delete ? <Button size="sm" variant="light" color="danger" className="ms-auto" startContent={<Trash2 className="h-4 w-4" />} onPress={() => void run(async () => { const response = await removePartyAction({ id: detail.id }); if (response.ok) onClose(); return response; })}>{t("remove")}</Button> : null}
              </div>

              <section className="flex flex-col gap-2">
                <h3 className="font-semibold">{t("tabs.deals")}</h3>
                {detail.deals.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-medium border border-default-200 p-2 text-small">
                    <span className="font-medium">{item.title}</span><span className="tabular-nums">{money(item.amountCents)}</span>
                    <Chip size="sm" variant="flat">{t(`dealStages.${item.stage}`)}</Chip>
                    {can.delete ? <Button isIconOnly size="sm" variant="light" color="danger" className="ms-auto" aria-label={t("remove")} onPress={() => void run(() => deleteDealAction({ id: item.id }))}><Trash2 className="h-3.5 w-3.5" /></Button> : null}
                  </div>
                ))}
                {can.update ? (
                  <div className="flex flex-wrap items-end gap-2">
                    <Input size="sm" className="max-w-xs" label={t("dealTitle")} value={deal.title} onValueChange={(title) => setDeal((current) => ({ ...current, title }))} />
                    <Input size="sm" className="max-w-[140px]" type="number" label={t("amount")} value={deal.amount} onValueChange={(amount) => setDeal((current) => ({ ...current, amount }))} />
                    <Input size="sm" className="max-w-[170px]" type="date" placeholder=" " label={t("expectedClose")} value={deal.close} onValueChange={(close) => setDeal((current) => ({ ...current, close }))} />
                    <Button size="sm" color="primary" variant="flat" isDisabled={deal.title.trim().length < 2}
                      onPress={() => void run(async () => { const response = await saveDealAction({ partyId: detail.id, title: deal.title, amount: deal.amount ? Number(deal.amount) : null, expectedCloseAt: deal.close || null }); if (response.ok) setDeal({ title: "", amount: "", close: "" }); return response; })}>
                      {t("addDeal")}
                    </Button>
                  </div>
                ) : null}
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="font-semibold">{t("tabs.followUps", { count: detail.followUps.filter((item) => !item.done).length })}</h3>
                {detail.followUps.map((item) => (
                  <Checkbox key={item.id} isSelected={item.done} isDisabled={!can.update} onValueChange={(value) => void run(() => completeFollowUpAction({ id: item.id, done: value }))}>
                    <span className="text-small">{format.dateTime(new Date(item.dueAt), { dateStyle: "medium", timeStyle: "short" })} · {item.note}</span>
                  </Checkbox>
                ))}
                {can.update ? (
                  <div className="flex flex-wrap items-end gap-2">
                    <Input size="sm" className="max-w-[220px]" type="datetime-local" placeholder=" " label={t("dueAt")} value={follow.dueAt} onValueChange={(dueAt) => setFollow((current) => ({ ...current, dueAt }))} />
                    <Input size="sm" className="max-w-xs" label={t("followUpNote")} value={follow.note} onValueChange={(note) => setFollow((current) => ({ ...current, note }))} />
                    <Button size="sm" color="primary" variant="flat" isDisabled={!follow.dueAt || follow.note.trim().length < 2}
                      onPress={() => void run(async () => { const response = await addFollowUpAction({ partyId: detail.id, dueAt: new Date(follow.dueAt).toISOString(), note: follow.note }); if (response.ok) setFollow({ dueAt: "", note: "" }); return response; })}>
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
                      {KINDS.map((item) => <Chip key={item} variant={kind === item ? "solid" : "flat"} color={kind === item ? "primary" : "default"} className="cursor-pointer" onClick={() => setKind(item)}>{t(`kinds.${item}`)}</Chip>)}
                    </div>
                    <Textarea size="sm" minRows={2} placeholder={t("activityPlaceholder")} value={summary} onValueChange={setSummary} />
                    <Button size="sm" color="primary" className="self-start" isDisabled={summary.trim().length < 2}
                      onPress={() => void run(async () => { const response = await addActivityAction({ partyId: detail.id, kind, summary }); if (response.ok) setSummary(""); return response; })}>
                      {t("addActivity")}
                    </Button>
                  </div>
                ) : null}
                <ol className="flex flex-col gap-3 border-s border-default-200 ps-4">
                  {detail.activities.map((item) => (
                    <li key={item.id} className="flex flex-col">
                      <span className="text-tiny text-default-500">{format.dateTime(new Date(item.occurredAt), { dateStyle: "medium", timeStyle: "short" })} · {t(`kinds.${item.kind}`)} · {item.by}</span>
                      <span className="whitespace-pre-wrap text-small">{item.summary}</span>
                    </li>
                  ))}
                  {detail.activities.length === 0 ? <li className="text-small text-default-500">{t("noActivities")}</li> : null}
                </ol>
              </section>
            </>
          ) : null}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
