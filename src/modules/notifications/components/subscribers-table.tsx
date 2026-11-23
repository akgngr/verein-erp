"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button, Card, CardContent, Dialog, Input, Label, Select, Spinner, Table, TextField } from "@/shared/components/kit";

import { listNotificationSubscribersAction, removeSubscriberChannelAction } from "../actions/subscribers";
import type { SubscriberRow, SubscriberSummary } from "../services/subscribers";

type Filter = "all" | "telegram" | "web_push" | "email_off";
type Removable = "telegram" | "web_push";
const PAGE_SIZE = 25;

export function SubscribersTable() {
  const t = useTranslations("notifications.ui.subscribers");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<SubscriberRow[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<SubscriberSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [target, setTarget] = useState<{ row: SubscriberRow; channel: Removable } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async (q: string, channel: Filter, currentPage: number) => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await listNotificationSubscribersAction({ q: q.trim(), ...(channel === "all" ? {} : { channel }), page: currentPage, pageSize: PAGE_SIZE });
      if (id !== requestId.current) return;
      if (!result.ok) {
        setError(t("loadError"));
        return;
      }
      if (currentPage > 1 && result.data.total <= (currentPage - 1) * PAGE_SIZE) {
        setPage(currentPage - 1);
        return;
      }
      setRows(result.data.rows);
      setTotal(result.data.total);
      setSummary(result.data.summary);
    } catch {
      if (id === requestId.current) setError(t("loadError"));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const currentRequest = requestId;
    const timer = setTimeout(() => void load(search, filter, page), search ? 300 : 0);
    return () => { clearTimeout(timer); currentRequest.current++; };
  }, [search, filter, page, load]);

  async function remove() {
    if (!target || removing) return;
    setRemoving(true);
    setError(null);
    try {
      const result = await removeSubscriberChannelAction({ userId: target.row.userId, channel: target.channel });
      if (!result.ok) { setError(t("removeError")); return; }
      setTarget(null);
      await load(search, filter, page);
    } catch {
      setError(t("removeError"));
    } finally {
      setRemoving(false);
    }
  }

  const first = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const last = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="flex flex-col gap-5">
      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label={t("summary") }>
          {([
            ["users", summary.users], ["emailOff", summary.emailOff],
            ["telegramLinked", summary.telegramLinked], ["webPushDevices", summary.webPushDevices],
          ] as const).map(([label, value]) => (
            <Card key={label}><CardContent><p className="text-sm text-foreground-muted">{t(label)}</p><p className="text-2xl font-semibold">{value}</p></CardContent></Card>
          ))}
        </div>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <TextField value={search} onChange={(value) => { setSearch(value); setPage(1); }} className="w-full sm:max-w-sm">
          <Label>{t("search")}</Label><Input maxLength={80} />
        </TextField>
        <Select value={filter} onChange={(value) => { setFilter((value ?? "all") as Filter); setPage(1); }} className="w-full sm:max-w-xs">
          <Label>{t("filter")}</Label>
          {(["all", "email_off", "telegram", "web_push"] as const).map((key) => <Select.Item key={key} id={key} textValue={t(key === "email_off" ? "filterEmailOff" : key)}><Label>{t(key === "email_off" ? "filterEmailOff" : key)}</Label></Select.Item>)}
        </Select>
      </div>
      {error ? <p role="alert" className="text-sm text-danger">{error} <Button size="sm" variant="tertiary" onPress={() => void load(search, filter, page)}>{t("retry")}</Button></p> : null}
      <Card>
        <CardContent>
          {loading ? <div className="flex min-h-40 items-center justify-center" role="status"><Spinner aria-label={t("loading")} /></div> : (
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label={t("title") }>
                  <Table.Header>
                    <Table.Column isRowHeader>{t("user")}</Table.Column>
                    <Table.Column>{t("role")}</Table.Column>
                    <Table.Column>{t("email")}</Table.Column>
                    <Table.Column>{t("telegram")}</Table.Column>
                    <Table.Column>{t("webPush")}</Table.Column>
                    <Table.Column>{t("actions")}</Table.Column>
                  </Table.Header>
                  <Table.Body renderEmptyState={() => <p className="p-6 text-sm text-foreground-muted">{t("empty")}</p>}>
                    {rows.map((row) => (
                      <Table.Row key={row.userId} id={row.userId}>
                        <Table.Cell><span className="font-medium">{row.name}</span><span className="block text-xs text-foreground-muted">{row.isActive ? t("active") : t("inactive")}</span></Table.Cell>
                        <Table.Cell>{row.role}</Table.Cell>
                        <Table.Cell><span className="break-all">{row.email}</span><span className="block text-xs text-foreground-muted">{t(`email_${row.channels.email}`)}</span></Table.Cell>
                        <Table.Cell>{t(`telegram_${row.channels.telegram}`)}</Table.Cell>
                        <Table.Cell>{t("devices", { count: row.channels.webPushDevices })}</Table.Cell>
                        <Table.Cell>
                          <div className="flex flex-wrap gap-1">
                            {row.channels.telegram !== "none" ? <Button size="sm" variant="tertiary" aria-label={t("unlinkTelegramFor", { name: row.name })} onPress={() => setTarget({ row, channel: "telegram" })}>{t("unlinkTelegram")}</Button> : null}
                            {row.channels.webPushDevices > 0 ? <Button size="sm" variant="tertiary" aria-label={t("unlinkPushFor", { name: row.name })} onPress={() => setTarget({ row, channel: "web_push" })}>{t("unlinkPush")}</Button> : null}
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          )}
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span role="status">{t("range", { first, last, total })}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" isDisabled={loading || page === 1} onPress={() => setPage((p) => p - 1)}>{t("previous")}</Button>
          <Button variant="outline" size="sm" isDisabled={loading || last >= total} onPress={() => setPage((p) => p + 1)}>{t("next")}</Button>
        </div>
      </div>
      <Dialog isOpen={target !== null} isDismissable={!removing} onOpenChange={(open) => { if (!open && !removing) setTarget(null); }} size="sm">
        {() => <>
          <Dialog.Header><Dialog.Heading>{t("confirmTitle")}</Dialog.Heading></Dialog.Header>
          <Dialog.Body>
            <p className="text-sm">{target ? t("confirmMessage", { name: target.row.name, channel: t(target.channel === "telegram" ? "telegram" : "webPush") }) : null}</p>
            {error ? <p role="alert" className="mt-3 text-sm text-danger">{error}</p> : null}
          </Dialog.Body>
          <Dialog.Footer>
            <Button variant="tertiary" isDisabled={removing} onPress={() => setTarget(null)}>{t("cancel")}</Button>
            <Button variant="danger" isPending={removing} isDisabled={removing} onPress={() => void remove()}>{t("remove")}</Button>
          </Dialog.Footer>
        </>}
      </Dialog>
    </div>
  );
}
