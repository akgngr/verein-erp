"use client";

import { notify } from "@/shared/components/ui/notify";
import { Dropdown, Spinner, Tooltip, Button, buttonClassName, TextLink as ActionLink } from "@/shared/components/kit";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import {
  ArrowUp,
  ArrowUpRight,
  ChevronDown,
  FileDown,
  ListPlus,
  Lock,
  Maximize2,
  Minimize2,
  Paperclip,
  FileText,
  Loader2,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
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
import { groupConversations, type HistoryGroup } from "../lib/history-groups";
import { shouldSubmitOnEnter } from "../lib/ime";
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

/** Masaüstü yerleşimleri: yan sütun (genişlik sürüklenir) ya da tam ekran. */
/** Bir mesaja eklenebilecek en çok dosya (sunucu sınırıyla aynı). */
const ATTACHMENT_LIMIT = 5;
const ATTACHMENT_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.md,.markdown,.csv,.txt";

/** Mesaj kutusu düğmelerinin konumu: kapalıyken dikey ortada, açıkken alt satırda (geçiş animasyonlu). */
const BUTTON_TOP_OPEN = "calc(100% - 2.5rem)";
const BUTTON_TOP_CLOSED = "calc(50% - 1rem)";

const DOCKED_CLASS = "md:sticky md:top-0 md:z-auto md:h-dvh md:w-[var(--ai-panel-width)] md:shrink-0 md:border-l md:border-ink-200";
const EXPANDED_CLASS = "md:fixed md:inset-0 md:z-50";

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

export { isImeCompositionActive, shouldSubmitOnEnter } from "../lib/ime";

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
  /** Genişletilmiş görünüm: masaüstünde sohbet tüm ekranı kaplar, içerik ortada okunur genişlikte. */
  const [expanded, setExpanded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  /** Mesaj kutusu genişletilmiş mi (odak ya da içerik varken dosya düğmesi alt satıra kayar). */
  const [composerFocused, setComposerFocused] = useState(false);
  /** Bu mesaja eklenecek dosyalar: sunucunun döndürdüğü şifreli mühür + gösterim bilgisi. */
  const [attachments, setAttachments] = useState<Array<{ id: string; name: string; token?: string; uploading: boolean }>>([]);

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
    if (!result.ok) return void notify.error(result.error);
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
    if (!result.ok) return void notify.error(result.error);
    notify.success(t("conversationDeleted"));
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
    const ready = attachments.filter((item) => item.token);
    if (attachments.some((item) => item.uploading)) return;
    const content = (text ?? draft).trim() || (ready.length ? t("attachments.analyzeDefault") : "");
    if (!content || busy) return;
    const sentAttachments = ready;
    historyEpoch.current++;
    const shown = sentAttachments.length ? `${content}\n\n📎 ${sentAttachments.map((item) => item.name).join(", ")}` : content;
    const next = [...turns, { role: "user" as const, content: shown }];
    setTurns(next);
    setDraft("");
    setAttachments([]);
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
          attachments: sentAttachments.map((item) => item.token),
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
        notify.error(data.error ?? t("error"));
        if (data.code === "consentRequired") router.refresh();
        setTurns(turns);
        setDraft(content);
        setAttachments(sentAttachments);
        if (data.code === "attachmentExpired") setAttachments([]);
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
      notify.error(t("error"));
      setTurns(turns);
      setDraft(content);
      setAttachments(sentAttachments);
    } finally {
      setBusy(false);
    }
  };

  /** Dosya ekle: sunucu metni çıkarır (gerekirse OCR) ve şifreli mühür döner; dosya saklanmaz. */
  const uploadFiles = async (files: FileList | null) => {
    const list = Array.from(files ?? []).slice(0, Math.max(0, ATTACHMENT_LIMIT - attachments.length));
    if (!list.length) {
      if (files?.length) notify.warning(t("attachments.limit", { count: String(ATTACHMENT_LIMIT) }));
      return;
    }
    const pending = list.map((file) => ({ id: crypto.randomUUID(), name: file.name, uploading: true }));
    setAttachments((current) => [...current, ...pending]);
    await Promise.all(
      list.map(async (file, index) => {
        const id = pending[index].id;
        try {
          const body = new FormData();
          body.append("file", file);
          const response = await fetch("/api/ai/attachments", { method: "POST", body });
          const data = (await response.json().catch(() => null)) as { ok: boolean; error?: string; attachment?: { token: string; name: string } } | null;
          if (!data?.ok || !data.attachment) throw new Error(data?.error ?? t("attachments.failed"));
          const token = data.attachment.token;
          setAttachments((current) => current.map((item) => (item.id === id ? { ...item, token, uploading: false } : item)));
        } catch (error) {
          setAttachments((current) => current.filter((item) => item.id !== id));
          notify.error(error instanceof Error ? error.message : t("attachments.failed"));
        }
      }),
    );
    inputRef.current?.focus();
  };

  const confirmProposal = async (key: string, proposal: AiProposal) => {
    const result = await executeAiProposalAction({
      proposalId: proposal.proposalId,
    });
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    if (result.data.jobId)
      setExportJobs((previous) => ({ ...previous, [key]: result.data.jobId! }));
    setDone((previous) => new Set(previous).add(key));
    notify.success(proposalText(proposal, "done"));
  };

  /** Geçmiş: bugün / dün / son 7 gün / bu ay / daha eski; liste zaten yeniden eskiye sıralı gelir. */
  const historyGroups = groupConversations(conversations);
  const historyTime = (iso: string, group: HistoryGroup) => {
    const date = new Date(iso);
    if (group === "today" || group === "yesterday") return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    return date.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", ...(group === "older" ? { year: "2-digit" } : {}) });
  };
  const conversationTitle =
    conversations.find((item) => item.id === conversationId)?.title ??
    (conversationId ? turns.find((turn) => turn.role === "user")?.content : undefined) ??
    t("newConversation");
  const column = expanded ? "mx-auto w-full max-w-3xl" : "w-full";
  const composerOpen = composerFocused || draft.length > 0 || attachments.length > 0;

  /** Yazdıkça büyüyen giriş kutusu (en çok ~8 satır). */
  const autoGrow = (element: HTMLTextAreaElement | null) => {
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 240)}px`;
  };
  useEffect(() => autoGrow(inputRef.current), [draft, composerOpen]);

  const iconButton = "rounded-full";

  return (
    <>
      <div className="relative flex min-w-0 flex-1 flex-col">
        {children}
        {!open ? (
          // Yüzen giriş çubuğu: içerik alanının altında ortada; gönderince sohbet sütunu açılır.
          <div className="pointer-events-none sticky bottom-4 z-30 flex justify-center px-4">
            <form
              className="pointer-events-auto flex w-full max-w-xl items-center gap-2 rounded-[1.75rem] border border-ink-200 bg-background/95 p-2 pl-3 shadow-lg backdrop-blur transition-colors focus-within:border-accent"
              onSubmit={(event) => {
                event.preventDefault();
                if (!draft.trim()) return setOpen(true);
                setOpen(true);
                if (consented && provider) void send();
              }}
            >
              <button
                type="button"
                aria-label={t("open")}
                title={t("open")}
                onClick={() => setOpen(true)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-ink-100 hover:text-foreground"
              >
                <Sparkles className="h-5 w-5" aria-hidden />
              </button>
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
                aria-label={t("send")}
                isDisabled={!draft.trim()}
                variant={actionVariant("primary", "solid")}
                className="h-9 w-9 min-w-9 rounded-full"
              >
                <ArrowUp className="h-5 w-5" aria-hidden />
              </Button>
            </form>
          </div>
        ) : null}
      </div>

      {/* Sohbet sütunu: masaüstünde içeriği sola iten sütun ya da tam ekran; mobilde tam ekran. */}
      {open ? (
        <aside
          aria-label={t("title")}
          style={{ "--ai-panel-width": `${width}px` } as CSSProperties}
          className={cn("fixed inset-0 z-50 flex flex-col bg-background", expanded ? EXPANDED_CLASS : DOCKED_CLASS)}
        >
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={t("resize")}
            title={t("resize")}
            onPointerDown={startResize}
            className={cn("absolute inset-y-0 left-0 z-10 hidden w-1.5 -translate-x-1/2 cursor-col-resize hover:bg-accent/30", !expanded && "md:block")}
          />
          <header className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
            {consented && provider ? (
              <Dropdown onOpenChange={(isOpen) => isOpen && void refreshConversations()}>
                <Button
                  aria-label={t("history")}
                  variant={actionVariant("default", "ghost")}
                  className="min-w-0 max-w-[60%] justify-start gap-1 px-2 text-sm font-semibold"
                >
                  <span className="truncate">{conversationTitle}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-ink-500" aria-hidden />
                </Button>
                <Dropdown.Popover placement="bottom start">
                  <Dropdown.Menu
                    aria-label={t("history")}
                    onAction={(key) => {
                      if (key === "__new") return newConversation();
                      if (key === "__delete") return void removeConversation();
                      if (key === "__empty") return;
                      void openConversation(String(key));
                    }}
                    className="max-h-[28rem] w-80 overflow-y-auto"
                  >
                    {conversations.length ? (
                      historyGroups.map((group) => (
                        <Dropdown.Section key={group.key} id={group.key}>
                          <Dropdown.SectionHeader className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-ink-400">{t(`historyGroups.${group.key}`)}</Dropdown.SectionHeader>
                          {group.items.map((item) => (
                            <Dropdown.Item key={item.id} id={item.id} textValue={item.title} className={cn(item.id === conversationId && "bg-ink-100")}>
                              <span className="flex w-full min-w-0 items-center gap-3 text-sm">
                                <span className="min-w-0 flex-1 truncate">{item.title}</span>
                                <span className="shrink-0 text-xs tabular-nums text-ink-400">{historyTime(item.updatedAt, group.key)}</span>
                              </span>
                            </Dropdown.Item>
                          ))}
                        </Dropdown.Section>
                      ))
                    ) : (
                      <Dropdown.Item id="__empty" textValue={t("historyEmpty")} isDisabled>
                        <span className="text-sm text-ink-400">{t("historyEmpty")}</span>
                      </Dropdown.Item>
                    )}
                    <Dropdown.Section id="__actions" className="mt-1 border-t border-ink-100 pt-1">
                      <Dropdown.Item id="__new" textValue={t("newConversation")}>
                        <span className="flex items-center gap-2 text-sm">
                          <Plus className="h-4 w-4" aria-hidden />
                          {t("newConversation")}
                        </span>
                      </Dropdown.Item>
                      {conversationId ? (
                        <Dropdown.Item id="__delete" textValue={t("deleteConversation")} tone="danger">
                          <span className="flex items-center gap-2 text-sm">
                            <Trash2 className="h-4 w-4" aria-hidden />
                            {t("deleteConversation")}
                          </span>
                        </Dropdown.Item>
                      ) : null}
                    </Dropdown.Section>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            ) : (
              <span className="px-2 text-sm font-semibold">{t("title")}</span>
            )}
            <div className="flex shrink-0 items-center gap-1">
              <span className="mr-1 rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-medium text-ink-600">{t("beta")}</span>
              {consented && provider ? (
                <Tooltip delay={300}>
                  <Button isIconOnly size="sm" aria-label={t("newConversation")} onPress={newConversation} isDisabled={busy} variant={actionVariant("default", "ghost")} className={iconButton}>
                    <Plus className="h-5 w-5" aria-hidden />
                  </Button>
                  <Tooltip.Content>{t("newConversation")}</Tooltip.Content>
                </Tooltip>
              ) : null}
              <Tooltip delay={300}>
                <Button
                  isIconOnly
                  size="sm"
                  aria-label={expanded ? t("collapse") : t("expand")}
                  onPress={() => setExpanded((value) => !value)}
                  variant={actionVariant("default", "ghost")}
                  className={cn(iconButton, "hidden md:inline-flex")}
                >
                  {expanded ? <Minimize2 className="h-4 w-4" aria-hidden /> : <Maximize2 className="h-4 w-4" aria-hidden />}
                </Button>
                <Tooltip.Content>{expanded ? t("collapse") : t("expand")}</Tooltip.Content>
              </Tooltip>
              <Button
                isIconOnly
                size="sm"
                aria-label={t("close")}
                onPress={() => {
                  setExpanded(false);
                  setOpen(false);
                }}
                variant={actionVariant("default", "ghost")}
                className={iconButton}
              >
                <X className="h-5 w-5" aria-hidden />
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
                    return void notify.error(result.error);
                  router.refresh();
                }}
                variant={actionVariant("primary", "solid")}
                isPending={accepting}
              >
                {accepting ? <Spinner size="sm" tone="current" /> : null}
                {t("consent.accept")}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-1 flex-col overflow-y-auto px-4 text-sm">
                {turns.length === 0 ? (
                  <div className={cn(column, "mt-auto flex flex-col gap-3 pb-4")}>
                    <h2 className="text-base font-semibold text-foreground">{t("emptyTitle")}</h2>
                    <p className="mb-2 text-sm text-ink-500">{t("emptySubtitle")}</p>
                    {(["q1", "q2", "q3", "q4"] as const).map((key) => (
                      <button
                        key={key}
                        type="button"
                        className="group flex items-center justify-between gap-3 rounded-xl border border-ink-200 px-3.5 py-2.5 text-left text-sm transition-colors hover:border-ink-300 hover:bg-ink-100"
                        onClick={() => {
                          setDraft(t(`examples.${key}`));
                          inputRef.current?.focus();
                        }}
                      >
                        <span>{t(`examples.${key}`)}</span>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-400 transition-colors group-hover:text-foreground" aria-hidden />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className={cn(column, "flex flex-col gap-4 py-2")}>
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
                          "text-sm leading-6",
                          turn.role === "user"
                            ? "max-w-[85%] rounded-[1.25rem] bg-ink-100 px-3.5 py-2 text-foreground"
                            : "w-full px-1 text-foreground",
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
                              className={buttonClassName({
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
                )}
              </div>
              <form
                className={cn(column, "px-4 pb-3 pt-2")}
                onSubmit={(event) => {
                  event.preventDefault();
                  void send();
                }}
              >
                <div
                  className={cn(
                    "relative rounded-[1.5rem] border bg-background transition-[border-color,box-shadow] duration-200",
                    composerOpen ? "border-accent ring-2 ring-accent/15" : "border-ink-200",
                  )}
                >
                  {attachments.length ? (
                    <ul className="flex flex-wrap gap-1.5 px-3 pt-3" aria-label={t("attachments.list")}>
                      {attachments.map((item) => (
                        <li key={item.id} className="flex max-w-full items-center gap-1.5 rounded-lg border border-ink-200 bg-ink-50 py-1 pl-2 pr-1 text-xs">
                          {item.uploading ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-ink-400" aria-hidden /> : <FileText className="h-3.5 w-3.5 shrink-0 text-ink-500" aria-hidden />}
                          <span className="truncate">{item.name}</span>
                          <button
                            type="button"
                            aria-label={t("attachments.remove", { name: item.name })}
                            onClick={() => setAttachments((current) => current.filter((entry) => entry.id !== item.id))}
                            className="rounded-full p-0.5 text-ink-400 hover:bg-ink-200 hover:text-foreground"
                          >
                            <X className="h-3 w-3" aria-hidden />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <textarea
                    ref={inputRef}
                    aria-label={t("input")}
                    placeholder={t("composerPlaceholder")}
                    rows={1}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onFocus={() => setComposerFocused(true)}
                    onBlur={() => setComposerFocused(false)}
                    onTransitionEnd={(event) => autoGrow(event.currentTarget)}
                    onKeyDown={(event) => {
                      if (shouldSubmitOnEnter(event)) {
                        event.preventDefault();
                        void send();
                      }
                    }}
                    className={cn(
                      "block max-h-[240px] w-full resize-none bg-transparent text-sm leading-6 outline-none transition-[padding,min-height] duration-200 ease-out placeholder:text-ink-400",
                      composerOpen ? "min-h-[5.5rem] px-4 pb-12 pt-3" : "min-h-11 py-2.5 pl-12 pr-14",
                    )}
                  />
                  {/* Dosya düğmesi: kapalıyken solda, giriş kutusuyla aynı satırda; açılınca alt satıra kayar. */}
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    accept={ATTACHMENT_ACCEPT}
                    className="hidden"
                    onChange={(event) => {
                      void uploadFiles(event.target.files);
                      event.target.value = "";
                    }}
                  />
                  <Tooltip delay={300}>
                    <Button
                      isIconOnly
                      size="sm"
                      aria-label={t("attachments.add")}
                      onPress={() => fileRef.current?.click()}
                      isDisabled={busy || attachments.length >= ATTACHMENT_LIMIT}
                      variant={actionVariant("default", "ghost")}
                      style={{ top: composerOpen ? BUTTON_TOP_OPEN : BUTTON_TOP_CLOSED }}
                      className="absolute left-2 h-8 w-8 min-w-8 rounded-full transition-[top] duration-200 ease-out"
                    >
                      <Paperclip className="h-4 w-4" aria-hidden />
                    </Button>
                    <Tooltip.Content>{t("attachments.hint")}</Tooltip.Content>
                  </Tooltip>
                  <Button
                    type="submit"
                    isIconOnly
                    size="sm"
                    aria-label={t("send")}
                    isDisabled={(!draft.trim() && !attachments.some((item) => item.token)) || busy || attachments.some((item) => item.uploading)}
                    variant={actionVariant("primary", "solid")}
                    style={{ top: composerOpen ? BUTTON_TOP_OPEN : BUTTON_TOP_CLOSED }}
                    className="absolute right-2 h-8 w-8 min-w-8 rounded-full transition-[top] duration-200 ease-out"
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
                <p className="mt-2 text-center text-xs text-ink-400">{t("disclaimer")}</p>
                <p className="text-center text-xs text-ink-400">{t("privacyNote")}</p>
              </form>
            </>
          )}
        </aside>
      ) : null}
    </>
  );
}
