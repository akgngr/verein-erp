"use client";

import { BellRing, MailX, MessageCircle, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import {
  Button,
  Card,
  CardContent,
  Dialog,
  Input,
  Label,
  Select,
  Spinner,
  StatusChip,
  Table,
  TextField,
} from "@/shared/components/kit";
import { notify } from "@/shared/components/ui/notify";
import { StatCard } from "@/shared/components/ui/stat-card";

import {
  listNotificationSubscribersAction,
  removeSubscriberChannelAction,
} from "../actions/subscribers";
import type { SubscriberRow, SubscriberSummary } from "../services/subscribers";

type ChannelFilter = "all" | "telegram" | "web_push" | "email_off";
type UnlinkTarget = { userId: string; name: string; channel: "telegram" | "web_push" };

const PAGE_SIZE = 25;

export function SubscribersManager({
  idPrefix = "notifications-subscribers",
}: {
  idPrefix?: string;
}) {
  const t = useTranslations("notifications.ui.subscribers");
  const tChannels = useTranslations("notifications.ui.channel");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState<SubscriberRow[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<SubscriberSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [unlinkTarget, setUnlinkTarget] = useState<UnlinkTarget | null>(null);
  const [removing, setRemoving] = useState(false);

  const [reloadTick, setReloadTick] = useState(0);
  const requestSeq = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = search.trim();
      setDebouncedSearch((prev) => {
        if (prev !== next) {
          setLoading(true);
          setPage(1);
        }
        return next;
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    const seq = ++requestSeq.current;
    void listNotificationSubscribersAction({
      ...(debouncedSearch ? { q: debouncedSearch } : {}),
      ...(channelFilter !== "all" ? { channel: channelFilter } : {}),
      page,
      pageSize: PAGE_SIZE,
    })
      .then((result) => {
        if (!active || seq !== requestSeq.current) return;
        if (!result.ok) {
          setError(t("loadError"));
          return;
        }
        setRows(result.data.rows);
        setTotal(result.data.total);
        setSummary(result.data.summary);
        setError(null);
      })
      .catch(() => {
        if (!active || seq !== requestSeq.current) return;
        setError(t("loadError"));
      })
      .finally(() => {
        if (active && seq === requestSeq.current) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [debouncedSearch, channelFilter, page, reloadTick, t]);

  async function confirmUnlink() {
    if (!unlinkTarget || removing) return;
    setRemoving(true);
    try {
      const result = await removeSubscriberChannelAction({
        userId: unlinkTarget.userId,
        channel: unlinkTarget.channel,
      });
      if (!result.ok) {
        notify.error(t("unlinkError"));
        setUnlinkTarget(null);
        return;
      }
      notify.success(t("unlinkSuccess"));
      setUnlinkTarget(null);
      setLoading(true);
      setReloadTick((n) => n + 1);
    } catch {
      notify.error(t("unlinkError"));
      setUnlinkTarget(null);
    } finally {
      setRemoving(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6" id={idPrefix}>
      <section aria-label={t("title")} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("summaryUsers")}
          value={summary ? summary.users : "—"}
          icon={<Users className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label={t("summaryEmailOff")}
          value={summary ? summary.emailOff : "—"}
          icon={<MailX className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label={t("summaryTelegram")}
          value={summary ? summary.telegramLinked : "—"}
          icon={<MessageCircle className="size-5" aria-hidden="true" />}
        />
        <StatCard
          label={t("summaryWebPush")}
          value={
            summary
              ? t("summaryWebPushDevices", {
                  users: summary.webPushUsers,
                  devices: summary.webPushDevices,
                })
              : "—"
          }
          icon={<BellRing className="size-5" aria-hidden="true" />}
        />
      </section>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <TextField
              id={`${idPrefix}-search`}
              className="flex-1"
              value={search}
              onChange={setSearch}
            >
              <Label>{t("searchLabel")}</Label>
              <Input
                type="search"
                maxLength={80}
                placeholder={t("searchPlaceholder")}
              />
            </TextField>

            <Select
              id={`${idPrefix}-channel`}
              className="w-full sm:w-56"
              value={channelFilter}
              onChange={(selected) => {
                setChannelFilter((selected ? String(selected) : "all") as ChannelFilter);
                setPage(1);
              }}
            >
              <Label>{t("filterChannel")}</Label>
              <Select.Item id="all" textValue={t("filterAll")}>
                {t("filterAll")}
              </Select.Item>
              <Select.Item id="telegram" textValue={t("filterTelegram")}>
                {t("filterTelegram")}
              </Select.Item>
              <Select.Item id="web_push" textValue={t("filterWebPush")}>
                {t("filterWebPush")}
              </Select.Item>
              <Select.Item id="email_off" textValue={t("filterEmailOff")}>
                {t("filterEmailOff")}
              </Select.Item>
            </Select>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}

          <Table className="w-full">
            <Table.ScrollContainer>
              <Table.Content aria-label={t("tableLabel")}>
                <Table.Header>
                  <Table.Column id="user" isRowHeader>
                    {t("colUser")}
                  </Table.Column>
                  <Table.Column id="role">{t("colRole")}</Table.Column>
                  <Table.Column id="email">{t("colEmail")}</Table.Column>
                  <Table.Column id="telegram">{t("colTelegram")}</Table.Column>
                  <Table.Column id="push">{t("colPush")}</Table.Column>
                  <Table.Column id="actions">{t("colActions")}</Table.Column>
                </Table.Header>
                <Table.Body
                  renderEmptyState={() => (
                    <div className="flex items-center justify-center gap-2 py-8 text-sm text-foreground-muted">
                      {loading ? (
                        <>
                          <Spinner size="sm" aria-label={t("loading")} />
                          <span>{t("loading")}</span>
                        </>
                      ) : (
                        <span>{t("empty")}</span>
                      )}
                    </div>
                  )}
                >
                  {rows.map((row) => (
                    <Table.Row key={row.userId} id={`${idPrefix}-row-${row.userId}`}>
                      <Table.Cell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{row.name}</span>
                          {!row.isActive ? (
                            <StatusChip tone="default">{t("inactive")}</StatusChip>
                          ) : null}
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="text-sm text-foreground-muted">{row.role}</span>
                      </Table.Cell>
                      <Table.Cell>
                        <StatusChip
                          tone={
                            row.channels.email === "on"
                              ? "success"
                              : row.channels.email === "off"
                                ? "danger"
                                : "default"
                          }
                        >
                          {row.channels.email === "on"
                            ? t("emailOn")
                            : row.channels.email === "off"
                              ? t("emailOff")
                              : t("emailDefault")}
                        </StatusChip>
                      </Table.Cell>
                      <Table.Cell>
                        <StatusChip
                          tone={
                            row.channels.telegram === "linked"
                              ? "success"
                              : row.channels.telegram === "pending"
                                ? "warning"
                                : "default"
                          }
                        >
                          {row.channels.telegram === "linked"
                            ? t("telegramLinked")
                            : row.channels.telegram === "pending"
                              ? t("telegramPending")
                              : t("telegramNone")}
                        </StatusChip>
                      </Table.Cell>
                      <Table.Cell>
                        <StatusChip tone={row.channels.webPushDevices > 0 ? "success" : "default"}>
                          {row.channels.webPushDevices > 0
                            ? t("pushDevices", { count: row.channels.webPushDevices })
                            : t("pushNone")}
                        </StatusChip>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex flex-wrap items-center gap-2">
                          {row.channels.telegram !== "none" ? (
                            <Button
                              size="sm"
                              variant="danger-soft"
                              isDisabled={removing}
                              onPress={() =>
                                setUnlinkTarget({
                                  userId: row.userId,
                                  name: row.name,
                                  channel: "telegram",
                                })
                              }
                            >
                              {t("unlinkTelegram")}
                            </Button>
                          ) : null}
                          {row.channels.webPushDevices > 0 ? (
                            <Button
                              size="sm"
                              variant="danger-soft"
                              isDisabled={removing}
                              onPress={() =>
                                setUnlinkTarget({
                                  userId: row.userId,
                                  name: row.name,
                                  channel: "web_push",
                                })
                              }
                            >
                              {t("unlinkWebPush")}
                            </Button>
                          ) : null}
                          {row.channels.telegram === "none" && row.channels.webPushDevices === 0 ? (
                            <span className="text-sm text-foreground-muted">{t("noActions")}</span>
                          ) : null}
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>

          {total > PAGE_SIZE ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-200 pt-3">
              <p className="text-sm text-foreground-muted">
                {t("pageInfo", { page, totalPages, total })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  isDisabled={loading || page <= 1}
                  onPress={() => setPage((current) => Math.max(1, current - 1))}
                >
                  {t("prevPage")}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  isDisabled={loading || page >= totalPages}
                  onPress={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  {t("nextPage")}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        isOpen={Boolean(unlinkTarget)}
        onOpenChange={(open) => {
          if (!open && !removing) setUnlinkTarget(null);
        }}
        isDismissable={!removing}
        size="sm"
      >
        {() => (
          <>
            <Dialog.Header>
              <Dialog.Heading>{t("confirmUnlinkTitle")}</Dialog.Heading>
            </Dialog.Header>
            <Dialog.Body>
              {unlinkTarget ? (
                <p className="text-sm text-foreground-muted">
                  {t("confirmUnlinkMessage", {
                    name: unlinkTarget.name,
                    channel: tChannels(unlinkTarget.channel),
                  })}
                </p>
              ) : null}
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                variant="tertiary"
                isDisabled={removing}
                onPress={() => setUnlinkTarget(null)}
              >
                {t("cancel")}
              </Button>
              <Button
                variant="danger"
                isPending={removing}
                isDisabled={removing}
                onPress={() => void confirmUnlink()}
              >
                {t("confirm")}
              </Button>
            </Dialog.Footer>
          </>
        )}
      </Dialog>
    </div>
  );
}
