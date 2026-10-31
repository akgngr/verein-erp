"use client";

import { addToast, Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Textarea } from "@heroui/react";
import { History, ListPlus, Lock, MessageSquarePlus, PanelRight, Send, ShieldCheck, Sparkles, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

import { announceSidePanel } from "@/shared/components/side-panel-events";
import { cn } from "@/shared/utils";

import { acceptAiConsentAction } from "../actions/consent-actions";
import { executeAiProposalAction } from "../actions/execute-proposal";
import { deleteAiConversationAction, getAiConversationAction, listAiConversationsAction } from "../actions/history-actions";
import { AI_PANEL_COOKIE, AI_PANEL_MAX_WIDTH, AI_PANEL_MIN_WIDTH, encodePanelState, type AiPanelState } from "../panel-state";
import { parseMarkdown } from "../services/markdown";
import type { AiProposal } from "../types";

type Turn = {
  role: "user" | "assistant";
  content: string;
  proposals?: AiProposal[];
  /** Geçmişten yüklendi: öneri kartları yeniden uygulanamaz (çift kayıt önlenir). */
  restored?: boolean;
};

/** Satır içi biçim: **kalın** ve yalnızca uygulama içi [metin](/yol) bağlantıları (dış bağlantı çizilmez). */
function inline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((\/[^)\s]*)\)|`([^`]+)`/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1]) parts.push(<strong key={match.index}>{match[1]}</strong>);
    else if (match[4]) parts.push(<code key={match.index} className="rounded bg-default-200 px-1 text-tiny">{match[4]}</code>);
    else
      parts.push(
        <a
          key={match.index}
          href={match[3]}
          target="_blank"
          rel="noopener"
          className="font-medium text-primary underline"
        >
          {match[2]}
        </a>,
      );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** Öneri kartındaki kısa ayrıntılar (öncelik, tarih, yer …). */
function proposalDetails(proposal: AiProposal, t: ReturnType<typeof useTranslations>): string[] {
  switch (proposal.kind) {
    case "module":
      return proposal.details;
    case "createEvent":
      return [proposal.startDate.replace("T", " "), proposal.isOnline ? t("proposal.online") : (proposal.location ?? "")].filter(Boolean);
    case "createDocument":
      return [proposal.direction, proposal.documentDate, proposal.counterparty].filter(Boolean);
    case "createMeeting":
      return [proposal.type, [proposal.meetingDate, proposal.startTime].filter(Boolean).join(" "), proposal.location ?? ""].filter(Boolean);
    case "createInventory":
      return [proposal.category, `× ${proposal.quantity}`, proposal.location ?? ""].filter(Boolean);
    case "createCourse":
      return [proposal.courseKind, [proposal.startDate, proposal.endDate].filter(Boolean).join(" – ")].filter(Boolean);
    case "changeDocumentStatus":
    case "changeMeetingStatus":
    case "changeInventoryStatus":
    case "changeCourseStatus":
      return [`${t("proposal.newStatus")}: ${proposal.status}`];
    default:
      return [];
  }
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
              <List key={index} className={cn("flex flex-col gap-0.5 pl-5", block.ordered ? "list-decimal" : "list-disc")}>
                {block.items.map((item, position) => (
                  <li key={position}>{inline(item)}</li>
                ))}
              </List>
            );
          }
          case "table":
            return (
              <div key={index} className="overflow-x-auto rounded-medium border border-default-200 bg-background">
                <table className="w-full text-tiny">
                  <thead className="bg-default-100">
                    <tr>
                      {block.header.map((cell, column) => (
                        <th key={column} className="px-2 py-1.5 font-semibold" style={{ textAlign: block.align[column] }}>
                          {inline(cell)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-t border-default-100">
                        {row.map((cell, column) => (
                          <td key={column} className="px-2 py-1.5" style={{ textAlign: block.align[column] }}>
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
  const proposalText = (proposal: AiProposal, part: "kinds" | "confirm" | "done") =>
    proposal.kind === "module"
      ? tRoot(`${proposal.module}.ai.${proposal.action}.${part === "kinds" ? "kind" : part}`)
      : t(`proposal.${part}.${proposal.kind}`);
  const router = useRouter();
  const [open, setOpen] = useState(initialState.open);
  const [width, setWidth] = useState(initialState.width);
  const [conversationId, setConversationId] = useState<string | null>(initialState.conversationId);
  const [conversations, setConversations] = useState<{ id: string; title: string; updatedAt: string }[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [accepting, setAccepting] = useState(false);
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
    void getAiConversationAction({ id: initialState.conversationId }).then((result) => {
      if (result.ok) setTurns(result.data.turns.map((turn) => ({ ...turn, restored: true })));
      else setConversationId(null);
    });
  }, [consented, provider, initialState.conversationId]);

  const refreshConversations = async () => {
    const result = await listAiConversationsAction();
    if (result.ok) setConversations(result.data);
  };
  const openConversation = async (id: string) => {
    const result = await getAiConversationAction({ id });
    if (!result.ok) return void addToast({ title: result.error, color: "danger" });
    setConversationId(id);
    setTurns(result.data.turns.map((turn) => ({ ...turn, restored: true })));
    setDone(new Set());
  };
  const newConversation = () => {
    setConversationId(null);
    setTurns([]);
    setDone(new Set());
  };
  const removeConversation = async () => {
    if (!conversationId) return newConversation();
    const result = await deleteAiConversationAction({ id: conversationId });
    if (!result.ok) return void addToast({ title: result.error, color: "danger" });
    addToast({ title: t("conversationDeleted"), color: "success" });
    newConversation();
  };

  // Sol kenardan sürükleyerek genişlik ayarı (masaüstü).
  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;
    const onMove = (move: PointerEvent) => {
      setWidth(Math.min(AI_PANEL_MAX_WIDTH, Math.max(AI_PANEL_MIN_WIDTH, startWidth + (startX - move.clientX))));
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
    const next = [...turns, { role: "user" as const, content }];
    setTurns(next);
    setDraft("");
    setBusy(true);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: content }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        conversationId?: string;
        reply?: string;
        proposals?: AiProposal[];
        error?: string;
        code?: string;
      };
      if (!data.ok) {
        addToast({ title: data.error ?? t("error"), color: "danger" });
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
        },
      ]);
    } catch {
      addToast({ title: t("error"), color: "danger" });
      setTurns(turns);
      setDraft(content);
    } finally {
      setBusy(false);
    }
  };

  const confirmProposal = async (key: string, proposal: AiProposal) => {
    const result = await executeAiProposalAction(proposal);
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    setDone(new Set(done).add(key));
    addToast({ title: proposalText(proposal, "done"), color: "success" });
  };

  return (
    <>
      <div className="relative flex min-w-0 flex-1 flex-col">
        {children}
        {!open ? (
          // Yüzen giriş çubuğu: içerik alanının altında ortada; gönderince sohbet sütunu açılır.
          <div className="pointer-events-none sticky bottom-4 z-30 flex justify-center px-4">
            <form
              className="pointer-events-auto flex w-full max-w-xl items-center gap-2 rounded-full border border-default-200 bg-background/95 py-1.5 pl-2 pr-1.5 shadow-lg backdrop-blur"
              onSubmit={(event) => {
                event.preventDefault();
                if (!draft.trim()) return setOpen(true);
                setOpen(true);
                if (consented && provider) void send();
              }}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
              <input
                aria-label={t("input")}
                placeholder={t("barPlaceholder")}
                className="min-w-0 flex-1 bg-transparent text-small outline-none placeholder:text-default-400"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
              <Button
                type="submit"
                isIconOnly
                size="sm"
                variant="light"
                radius="full"
                aria-label={t("send")}
                isDisabled={!draft.trim()}
              >
                <Send className="h-4 w-4" aria-hidden />
              </Button>
              <span className="h-5 w-px bg-default-200" aria-hidden />
              <Button
                isIconOnly
                size="sm"
                variant="light"
                radius="full"
                aria-label={t("open")}
                title={t("open")}
                onPress={() => setOpen(true)}
              >
                <PanelRight className="h-4 w-4" aria-hidden />
              </Button>
            </form>
          </div>
        ) : null}
      </div>

      {/* Sohbet sütunu: masaüstünde içeriği sola iten sabit genişlikte sütun, mobilde tam ekran. */}
      {open ? (
        <aside
          aria-label={t("title")}
          style={{ "--ai-panel-width": `${width}px` } as CSSProperties}
          className="fixed inset-0 z-50 flex flex-col bg-background md:sticky md:top-0 md:z-auto md:h-dvh md:w-[var(--ai-panel-width)] md:shrink-0 md:border-l md:border-default-200"
        >
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={t("resize")}
            title={t("resize")}
            onPointerDown={startResize}
            className="absolute inset-y-0 left-0 z-10 hidden w-1.5 -translate-x-1/2 cursor-col-resize hover:bg-primary/30 md:block"
          />
          <header className="flex items-center justify-between gap-2 border-b border-default-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden />
              <span className="text-small font-semibold">{t("title")}</span>
            </div>
            <div className="flex items-center gap-1">
              {consented && provider ? (
                <>
                  <Dropdown onOpenChange={(isOpen) => isOpen && void refreshConversations()}>
                    <DropdownTrigger>
                      <Button isIconOnly size="sm" variant="light" aria-label={t("history")} title={t("history")}>
                        <History className="h-4 w-4" aria-hidden />
                      </Button>
                    </DropdownTrigger>
                    <DropdownMenu
                      aria-label={t("history")}
                      emptyContent={t("historyEmpty")}
                      items={conversations}
                      onAction={(key) => void openConversation(String(key))}
                      className="max-h-80 overflow-y-auto"
                    >
                      {(item) => (
                        <DropdownItem key={item.id} description={new Date(item.updatedAt).toLocaleString()} textValue={item.title}>
                          <span className="line-clamp-1">{item.title}</span>
                        </DropdownItem>
                      )}
                    </DropdownMenu>
                  </Dropdown>
                  <Button isIconOnly size="sm" variant="light" aria-label={t("newConversation")} title={t("newConversation")} onPress={newConversation}>
                    <MessageSquarePlus className="h-4 w-4" aria-hidden />
                  </Button>
                  {conversationId ? (
                    <Button isIconOnly size="sm" variant="light" color="danger" aria-label={t("deleteConversation")} title={t("deleteConversation")} onPress={() => void removeConversation()}>
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  ) : null}
                </>
              ) : null}
              <Button
                isIconOnly
                size="sm"
                variant="light"
                aria-label={t("close")}
                onPress={() => setOpen(false)}
              >
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </header>

          {!provider ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-small text-default-500">
              <Lock className="h-6 w-6" aria-hidden />
              {t("notConfigured")}
            </div>
          ) : !consented ? (
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 text-small">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="h-4 w-4 text-success" aria-hidden />
                {t("consent.title")}
              </div>
              <p className="text-default-600">{t("consent.intro")}</p>
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-default-600">
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
                color="primary"
                isLoading={accepting}
                onPress={async () => {
                  setAccepting(true);
                  const result = await acceptAiConsentAction();
                  setAccepting(false);
                  if (!result.ok)
                    return void addToast({
                      title: result.error,
                      color: "danger",
                    });
                  router.refresh();
                }}
              >
                {t("consent.accept")}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 text-small">
                {turns.length === 0 ? (
                  <div className="flex flex-col gap-2 text-default-500">
                    <p>{t("welcome")}</p>
                    {(["q1", "q2", "q3", "q4"] as const).map((key) => (
                      <button
                        key={key}
                        type="button"
                        className="rounded-medium border border-default-200 px-3 py-2 text-left hover:bg-default-100"
                        onClick={() => setDraft(t(`examples.${key}`))}
                      >
                        {t(`examples.${key}`)}
                      </button>
                    ))}
                  </div>
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
                        "max-w-[90%] rounded-large px-3 py-2",
                        turn.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-default-100 text-foreground",
                      )}
                    >
                      {turn.role === "user" ? (
                        <p className="whitespace-pre-wrap">{turn.content}</p>
                      ) : (
                        <MessageBody text={turn.content} />
                      )}
                    </div>
                    {turn.proposals?.map((proposal, position) => {
                      const key = `${index}-${position}`;
                      return (
                        <div
                          key={key}
                          className="w-[90%] rounded-medium border border-primary-200 bg-primary-50/50 p-3 dark:border-primary-500/30 dark:bg-primary-500/10"
                        >
                          <p className="text-tiny font-semibold uppercase text-primary">
                            {proposalText(proposal, "kinds")}
                          </p>
                          <p className="font-medium">{proposal.title}</p>
                          {"description" in proposal && proposal.description ? (
                            <p className="text-default-600">{proposal.description}</p>
                          ) : null}
                          <p className="text-tiny text-default-500">{proposalDetails(proposal, t).join(" · ")}</p>
                          <Button
                            size="sm"
                            color="primary"
                            variant={done.has(key) || turn.restored ? "flat" : "solid"}
                            className="mt-2"
                            isDisabled={done.has(key) || turn.restored}
                            startContent={
                              <ListPlus className="h-4 w-4" aria-hidden />
                            }
                            onPress={() => confirmProposal(key, proposal)}
                          >
                            {done.has(key) ? t("proposal.applied") : turn.restored ? t("proposal.restored") : proposalText(proposal, "confirm")}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ))}
                {busy ? (
                  <p className="animate-pulse text-default-400">
                    {t("thinking")}
                  </p>
                ) : null}
                <div ref={endRef} />
              </div>
              <form
                className="flex flex-col gap-2 border-t border-default-200 p-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void send();
                }}
              >
                <Textarea
                  aria-label={t("input")}
                  placeholder={t("input")}
                  minRows={2}
                  maxRows={6}
                  value={draft}
                  onValueChange={setDraft}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void send();
                    }
                  }}
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-tiny text-default-400">
                    {t("privacyNote")}
                  </span>
                  <Button
                    type="submit"
                    size="sm"
                    color="primary"
                    isIconOnly
                    aria-label={t("send")}
                    isDisabled={!draft.trim() || busy}
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
