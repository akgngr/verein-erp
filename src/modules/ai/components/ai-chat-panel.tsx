"use client";
import {
  toast,
  Button,
  Spinner,
  Link as ActionLink,
  buttonVariants,
  Tooltip,
  TextField,
  TextArea,
  Dropdown,
  Label,
  Description,
} from "@heroui/react";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import {
  History,
  ListPlus,
  Lock,
  MessageSquarePlus,
  PanelRight,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  FileDown,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import { announceSidePanel } from "@/shared/components/side-panel-events";
import { cn } from "@/shared/utils";

import { AiExportJob } from "./export-job";
import { acceptAiConsentAction } from "../actions/consent-actions";
import { executeAiProposalAction } from "../actions/execute-proposal";
import {
  deleteAiConversationAction,
  getAiConversationAction,
  listAiConversationsAction,
} from "../actions/history-actions";
import {
  AI_PANEL_COOKIE,
  AI_PANEL_MAX_WIDTH,
  AI_PANEL_MIN_WIDTH,
  encodePanelState,
  type AiPanelState,
} from "../panel-state";
import { toInternalMarkdownHref } from "@/shared/markdown/links";
import { parseMarkdown } from "@/shared/markdown/parse";
import type { AiFile, AiProposal } from "../types";

type Turn = {
  role: "user" | "assistant";
  content: string;
  proposals?: AiProposal[];
  files?: AiFile[];
  /** Geçmişten yüklendi: öneri kartları yeniden uygulanamaz (çift kayıt önlenir). */
  restored?: boolean;
};

/** Satır içi biçim: **kalın** ve yalnızca uygulama içi [metin](/yol) bağlantıları (dış bağlantı çizilmez). */
function inline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((\/[^)\s]*)\)|`([^`]+)`/g;
  // KARAR: "//api/..." tarayıcıda başka bir SUNUCU adresidir; yalnızca uygulama içi tek "/" yolları.
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1]) parts.push(<strong key={match.index}>{match[1]}</strong>);
    else if (match[4])
      parts.push(
        <code key={match.index} className="rounded bg-ink-200 px-1 text-xs">
          {match[4]}
        </code>,
      );
    else
      parts.push(
        <a
          key={match.index}
          href={toInternalMarkdownHref(match[3])}
          target="_blank"
          rel="noopener"
          className="font-medium text-accent underline"
        >
          {match[2]}
        </a>,
      );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function MessageBody({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-2">
      {parseMarkdown(text).map((block, index) => {
        switch (block.type) {
          case "heading":
            return (
              <p key={index} className="font-semibold">
                {inline(block.text)}
              </p>
            );
          case "list": {
            const List = block.ordered ? "ol" : "ul";
            return (
              <List
                key={index}
                className={cn(
                  "flex flex-col gap-0.5 pl-5",
                  block.ordered ? "list-decimal" : "list-disc",
                )}
              >
                {block.items.map((item, position) => (
                  <li key={position}>{inline(item)}</li>
                ))}
              </List>
            );
          }
          case "table":
            return (
              <div
                key={index}
                className="overflow-x-auto rounded-lg border border-ink-200 bg-background"
              >
                <table className="w-full text-xs">
                  <thead className="bg-ink-100">
                    <tr>
                      {block.header.map((cell, column) => (
                        <th
                          key={column}
                          className="px-2 py-1.5 font-semibold"
                          style={{ textAlign: block.align[column] }}
                        >
                          {inline(cell)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-t border-ink-100">
                        {row.map((cell, column) => (
                          <td
                            key={column}
                            className="px-2 py-1.5"
                            style={{ textAlign: block.align[column] }}
                          >
                            {inline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          default:
            return (
              <p key={index} className="whitespace-pre-wrap">
                {inline(block.text)}
              </p>
            );
        }
      })}
    </div>
  );
}

/**
 * Sağ panel sohbet alanı: içerikten bağımsız kayan sütun; genişliği sürüklenerek ayarlanır, açık
 * durumu, genişliği ve etkin sohbet çerezde tutulur (sayfa yenilense de, sayfalar arasında da sabit).
 * Sohbet geçmişi sunucuda kullanıcıya özel ve şifreli saklanır (services/history.ts).
 */
export function AiChatPanel({
  consented,
  provider,
  initialState,
  children,
}: {
  /** Sunucunun çerezden okuduğu panel durumu (yenilemede titreme olmaz). */
  initialState: AiPanelState;
  /** Uygulamanın içerik sütunu; asistan onu sarar. */
  children: ReactNode;
  consented: boolean;
  /** Etkin sağlayıcı (null: yapılandırılmamış). Rıza bu sağlayıcıya verilir. */
  provider: "local" | "mistral" | "anthropic" | "openai" | null;
}) {
  const t = useTranslations("ai.panel");
  const tProvider = useTranslations("ai.providers");
  const tRoot = useTranslations();
  /** Kart metinleri: modül önerilerinde modülün kendi çevirisi (<modül>.ai.<eylem>.kind|confirm|done). */
  // Eski sürümde kaydedilmiş (modül standardı öncesi) öneriler geçmişte yalnızca başlıkla gösterilir.
  const proposalText = (
    proposal: AiProposal,
    part: "kind" | "confirm" | "done",
  ) =>
    proposal.kind === "module"
      ? tRoot(`${proposal.module}.ai.${proposal.action}.${part}`)
      : t("proposal.legacy");
  const router = useRouter();
  const [open, setOpen] = useState(initialState.open);
  const [width, setWidth] = useState(initialState.width);
  const [conversationId, setConversationId] = useState<string | null>(
    initialState.conversationId,
  );
  const [conversations, setConversations] = useState<
    { id: string; title: string; updatedAt: string }[]
  >([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const historyLoading = useRef(false);
  const historyEpoch = useRef(0);
  const requestAttempt = useRef<{
    content: string;
    conversationId: string | null;
    key: string;
  } | null>(null);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [exportJobs, setExportJobs] = useState<Record<string, string>>({});
  const [done, setDone] = useState<Set<string>>(new Set());
  const endRef = useRef<HTMLDivElement>(null);

  // KARAR: efektler hiçbir değer döndürmez — yeni tarayıcılarda scrollIntoView Promise döndürür
  // ve React yalnızca temizlik fonksiyonu kabul eder.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, busy]);
  // Sohbet sütunu açılınca sol menü daralır, kapanınca eski hâline döner.
  // KARAR: bildirim bir kare sonra gönderilir — sayfa yenilendiğinde sol menü dinleyicisi
  // (üst bileşenin efekti) bu efektten sonra bağlanır.
  useEffect(() => {
    const frame = requestAnimationFrame(() => announceSidePanel(open));
    return () => cancelAnimationFrame(frame);
  }, [open]);
  useEffect(() => {
    return () => announceSidePanel(false);
  }, []);
  // Durum çerezde: sunucu bir sonraki sayfa yüklemesinde paneli aynı hâliyle çizer.
  useEffect(() => {
    document.cookie = `${AI_PANEL_COOKIE}=${encodePanelState({ open, width, conversationId })}; path=/; max-age=31536000; samesite=lax`;
  }, [open, width, conversationId]);
  // Kayıtlı sohbet sayfa açılışında sunucudan (şifresi çözülmüş) yüklenir.
  useEffect(() => {
    if (!consented || !provider || !initialState.conversationId) return;
    const epoch = ++historyEpoch.current;
    let cancelled = false;
    void getAiConversationAction({ id: initialState.conversationId }).then(
      (result) => {
        if (cancelled || epoch !== historyEpoch.current) return;
        if (result.ok) {
          setTurns(
            result.data.turns.map((turn) => ({ ...turn, restored: true })),
          );
          setHistoryCursor(result.data.pageInfo.beforeCursor);
        } else setConversationId(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [consented, provider, initialState.conversationId]);

  const refreshConversations = async () => {
    const result = await listAiConversationsAction();
    if (result.ok) setConversations(result.data);
  };
  const openConversation = async (id: string) => {
    if (busy) return;
    const epoch = ++historyEpoch.current;
    const result = await getAiConversationAction({ id });
    if (epoch !== historyEpoch.current) return;
    if (!result.ok) return void toast(result.error, { variant: "danger" });
    requestAttempt.current = null;
    setConversationId(id);
    setHistoryCursor(result.data.pageInfo.beforeCursor);
    setTurns(result.data.turns.map((turn) => ({ ...turn, restored: true })));
    setDone(new Set());
  };
  const newConversation = () => {
    if (busy) return;
    historyEpoch.current++;
    requestAttempt.current = null;
    setConversationId(null);
    setHistoryCursor(null);
    setTurns([]);
    setDone(new Set());
  };
  const loadOlder = async () => {
    if (!conversationId || !historyCursor || historyLoading.current) return;
    const epoch = historyEpoch.current;
    historyLoading.current = true;
    const result = await getAiConversationAction({
      id: conversationId,
      before: historyCursor,
    }).finally(() => {
      historyLoading.current = false;
    });
    if (!result.ok || epoch !== historyEpoch.current) return;
    setTurns((current) => [
      ...result.data.turns.map((turn) => ({ ...turn, restored: true })),
      ...current,
    ]);
    setHistoryCursor(result.data.pageInfo.beforeCursor);
  };
  const removeConversation = async () => {
    if (!conversationId) return newConversation();
    const result = await deleteAiConversationAction({ id: conversationId });
    if (!result.ok) return void toast(result.error, { variant: "danger" });
    toast(t("conversationDeleted"), { variant: "success" });
    newConversation();
  };

  // Sol kenardan sürükleyerek genişlik ayarı (masaüstü).
  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;
    const onMove = (move: PointerEvent) => {
      setWidth(
        Math.min(
          AI_PANEL_MAX_WIDTH,
          Math.max(AI_PANEL_MIN_WIDTH, startWidth + (startX - move.clientX)),
        ),
      );
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.removeProperty("user-select");
    };
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const send = async (text?: string) => {
    const content = (text ?? draft).trim();
    if (!content || busy) return;
    historyEpoch.current++;
    const next = [...turns, { role: "user" as const, content }];
    setTurns(next);
    setDraft("");
    setBusy(true);
    if (
      !requestAttempt.current ||
      requestAttempt.current.content !== content ||
      requestAttempt.current.conversationId !== conversationId
    )
      requestAttempt.current = {
        content,
        conversationId,
        key: crypto.randomUUID(),
      };
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestKey: requestAttempt.current.key,
          conversationId,
          message: content,
        }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        conversationId?: string;
        reply?: string;
        proposals?: AiProposal[];
        files?: AiFile[];
        error?: string;
        code?: string;
      };
      if (data.code !== "turnBusy" && response.status !== 429)
        requestAttempt.current = null;
      if (!data.ok) {
        toast(data.error ?? t("error"), { variant: "danger" });
        if (data.code === "consentRequired") router.refresh();
        setTurns(turns);
        setDraft(content);
        return;
      }
      if (data.conversationId) setConversationId(data.conversationId);
      setTurns([
        ...next,
        {
          role: "assistant",
          content: data.reply || t("empty"),
          proposals: data.proposals,
          files: data.files,
        },
      ]);
    } catch {
      toast(t("error"), { variant: "danger" });
      setTurns(turns);
      setDraft(content);
    } finally {
      setBusy(false);
    }
  };

  const confirmProposal = async (key: string, proposal: AiProposal) => {
    const result = await executeAiProposalAction({
      proposalId: proposal.proposalId,
    });
    if (!result.ok) {
      toast(result.error, { variant: "danger" });
      return;
    }
    if (result.data.jobId)
      setExportJobs((previous) => ({ ...previous, [key]: result.data.jobId! }));
    setDone((previous) => new Set(previous).add(key));
    toast(proposalText(proposal, "done"), { variant: "success" });
  };

  return (
    <>
      <div className="relative flex min-w-0 flex-1 flex-col">
        {children}
        {!open ? (
          // Yüzen giriş çubuğu: içerik alanının altında ortada; gönderince sohbet sütunu açılır.
          <div className="pointer-events-none sticky bottom-4 z-30 flex justify-center px-4">
            <form
              className="pointer-events-auto flex w-full max-w-xl items-center gap-2 rounded-full border border-ink-200 bg-background/95 py-1.5 pl-2 pr-1.5 shadow-lg backdrop-blur"
              onSubmit={(event) => {
                event.preventDefault();
                if (!draft.trim()) return setOpen(true);
                setOpen(true);
                if (consented && provider) void send();
              }}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
              <input
                aria-label={t("input")}
                placeholder={t("barPlaceholder")}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
              <Button
                type="submit"
                isIconOnly
                size="sm"
                aria-label={t("send")}
                isDisabled={!draft.trim()}
                variant={actionVariant("default", "light")}
                className={"rounded-full"}
              >
                <Send className="h-4 w-4" aria-hidden />
              </Button>
              <span className="h-5 w-px bg-ink-200" aria-hidden />
              <Tooltip delay={300}>
                <Button
                  isIconOnly
                  size="sm"
                  aria-label={t("open")}
                  onPress={() => setOpen(true)}
                  variant={actionVariant("default", "light")}
                  className={"rounded-full"}
                >
                  <PanelRight className="h-4 w-4" aria-hidden />
                </Button>
                <Tooltip.Content>{t("open")}</Tooltip.Content>
              </Tooltip>
            </form>
          </div>
        ) : null}
      </div>

      {/* Sohbet sütunu: masaüstünde içeriği sola iten sabit genişlikte sütun, mobilde tam ekran. */}
      {open ? (
        <aside
          aria-label={t("title")}
          style={{ "--ai-panel-width": `${width}px` } as CSSProperties}
          className="fixed inset-0 z-50 flex flex-col bg-background md:sticky md:top-0 md:z-auto md:h-dvh md:w-[var(--ai-panel-width)] md:shrink-0 md:border-l md:border-ink-200"
        >
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={t("resize")}
            title={t("resize")}
            onPointerDown={startResize}
            className="absolute inset-y-0 left-0 z-10 hidden w-1.5 -translate-x-1/2 cursor-col-resize hover:bg-accent/30 md:block"
          />
          <header className="flex items-center justify-between gap-2 border-b border-ink-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" aria-hidden />
              <span className="text-sm font-semibold">{t("title")}</span>
            </div>
            <div className="flex items-center gap-1">
              {consented && provider ? (
                <>
                  <Dropdown
                    onOpenChange={(isOpen) =>
                      isOpen && void refreshConversations()
                    }
                  >
                    <Tooltip delay={300}>
                      <Button
                        isIconOnly
                        size="sm"
                        aria-label={t("history")}
                        variant={actionVariant("default", "light")}
                      >
                        <History className="h-4 w-4" aria-hidden />
                      </Button>
                      <Tooltip.Content>{t("history")}</Tooltip.Content>
                    </Tooltip>

                    <Dropdown.Popover placement="bottom end">
                      <Dropdown.Menu
                        aria-label={t("history")}
                        renderEmptyState={() => t("historyEmpty")}
                        items={conversations}
                        onAction={(key) => void openConversation(String(key))}
                        className="max-h-80 overflow-y-auto"
                      >
                        {(item) => (
                          <Dropdown.Item
                            key={item.id}
                            id={item.id}
                            textValue={item.title}
                          >
                            <Label>
                              <span className="line-clamp-1">{item.title}</span>
                            </Label>
                            <Description>
                              {new Date(item.updatedAt).toLocaleString()}
                            </Description>
                          </Dropdown.Item>
                        )}
                      </Dropdown.Menu>
                    </Dropdown.Popover>
                  </Dropdown>
                  <Tooltip delay={300}>
                    <Button
                      isIconOnly
                      size="sm"
                      aria-label={t("newConversation")}
                      onPress={newConversation}
                      variant={actionVariant("default", "light")}
                    >
                      <MessageSquarePlus className="h-4 w-4" aria-hidden />
                    </Button>
                    <Tooltip.Content>{t("newConversation")}</Tooltip.Content>
                  </Tooltip>
                  {conversationId ? (
                    <Tooltip delay={300}>
                      <Button
                        isIconOnly
                        size="sm"
                        aria-label={t("deleteConversation")}
                        onPress={() => void removeConversation()}
                        variant={actionVariant("danger", "light")}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                      <Tooltip.Content>
                        {t("deleteConversation")}
                      </Tooltip.Content>
                    </Tooltip>
                  ) : null}
                </>
              ) : null}
              <Button
                isIconOnly
                size="sm"
                aria-label={t("close")}
                onPress={() => setOpen(false)}
                variant={actionVariant("default", "light")}
              >
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </header>

          {!provider ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-ink-500">
              <Lock className="h-6 w-6" aria-hidden />
              {t("notConfigured")}
            </div>
          ) : !consented ? (
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 text-sm">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="h-4 w-4 text-success" aria-hidden />
                {t("consent.title")}
              </div>
              <p className="text-ink-600">{t("consent.intro")}</p>
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-ink-600">
                {(
                  [
                    "noPersonal",
                    "masking",
                    "ownRights",
                    "noStorage",
                    "noChanges",
                  ] as const
                ).map((key) => (
                  <li key={key}>{t(`consent.points.${key}`)}</li>
                ))}
                <li>
                  {t("consent.points.provider", {
                    provider: tProvider(`${provider}.name`),
                    where: tProvider(`${provider}.where`),
                  })}
                </li>
                <li>{t("consent.points.revoke")}</li>
              </ul>
              <Button
                onPress={async () => {
                  setAccepting(true);
                  const result = await acceptAiConsentAction();
                  setAccepting(false);
                  if (!result.ok)
                    return void toast(result.error, { variant: "danger" });
                  router.refresh();
                }}
                variant={actionVariant("primary", "solid")}
                isPending={accepting}
              >
                {accepting ? <Spinner size="sm" color="current" /> : null}
                {t("consent.accept")}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 text-sm">
                {turns.length === 0 ? (
                  <div className="flex flex-col gap-2 text-ink-500">
                    <p>{t("welcome")}</p>
                    {(["q1", "q2", "q3", "q4"] as const).map((key) => (
                      <button
                        key={key}
                        type="button"
                        className="rounded-lg border border-ink-200 px-3 py-2 text-left hover:bg-ink-100"
                        onClick={() => setDraft(t(`examples.${key}`))}
                      >
                        {t(`examples.${key}`)}
                      </button>
                    ))}
                  </div>
                ) : null}
                {historyCursor ? (
                  <Button
                    size="sm"
                    onPress={() => void loadOlder()}
                    variant={actionVariant("default", "solid")}
                  >
                    {t("loadOlder")}
                  </Button>
                ) : null}
                {turns.map((turn, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex flex-col gap-2",
                      turn.role === "user" ? "items-end" : "items-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[90%] rounded-xl px-3 py-2",
                        turn.role === "user"
                          ? "bg-accent text-accent-foreground"
                          : "bg-ink-100 text-foreground",
                      )}
                    >
                      {turn.role === "user" ? (
                        <p className="whitespace-pre-wrap">{turn.content}</p>
                      ) : (
                        <MessageBody text={turn.content} />
                      )}
                    </div>
                    {turn.files?.length ? (
                      <div className="flex w-[90%] flex-wrap gap-2">
                        {turn.files.map((file) => (
                          <ActionLink
                            key={file.url}
                            href={file.url}
                            target="_blank"
                            rel="noopener"
                            className={buttonVariants({
                              variant: actionVariant("primary", "flat"),
                              size: "sm",
                            })}
                          >
                            {<FileDown className="h-4 w-4" aria-hidden />}
                            {t("downloadFile", {
                              title: file.title,
                              format: file.format.toUpperCase(),
                            })}
                          </ActionLink>
                        ))}
                      </div>
                    ) : null}
                    {turn.proposals?.map((proposal, position) => {
                      const key = proposal.proposalId ?? `${index}-${position}`;
                      return (
                        <div
                          key={key}
                          className="w-[90%] rounded-lg border border-brand-200 bg-brand-50/50 p-3 dark:border-brand-500/30 dark:bg-brand-500/10"
                        >
                          <p className="text-xs font-semibold uppercase text-accent">
                            {proposalText(proposal, "kind")}
                          </p>
                          <p className="font-medium">{proposal.title}</p>
                          <p className="text-xs text-ink-500">
                            {(proposal.details ?? []).join(" · ")}
                          </p>
                          <Button
                            size="sm"
                            className="mt-2"
                            isDisabled={done.has(key) || turn.restored}
                            onPress={() => confirmProposal(key, proposal)}
                            variant={actionVariant(
                              "primary",
                              done.has(key) || turn.restored ? "flat" : "solid",
                            )}
                          >
                            {<ListPlus className="h-4 w-4" aria-hidden />}
                            {done.has(key)
                              ? t("proposal.applied")
                              : turn.restored
                                ? t("proposal.restored")
                                : proposalText(proposal, "confirm")}
                          </Button>
                          {exportJobs[key] ? (
                            <AiExportJob id={exportJobs[key]} />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ))}
                {busy ? (
                  <p className="animate-pulse text-ink-400">{t("thinking")}</p>
                ) : null}
                <div ref={endRef} />
              </div>
              <form
                className="flex flex-col gap-2 border-t border-ink-200 p-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void send();
                }}
              >
                <TextField
                  aria-label={t("input")}
                  value={draft}
                  onChange={setDraft}
                  className={["w-full"].filter(Boolean).join(" ")}
                >
                  <TextArea
                    placeholder={t("input")}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void send();
                      }
                    }}
                    rows={2}
                    style={{ maxHeight: "calc(6 * 1.5em + 1rem)" }}
                    className={["[field-sizing:content]"]
                      .filter(Boolean)
                      .join(" ")}
                  />
                </TextField>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-ink-400">
                    {t("privacyNote")}
                  </span>
                  <Button
                    type="submit"
                    size="sm"
                    isIconOnly
                    aria-label={t("send")}
                    isDisabled={!draft.trim() || busy}
                    variant={actionVariant("primary", "solid")}
                  >
                    <Send className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </form>
            </>
          )}
        </aside>
      ) : null}
    </>
  );
}
