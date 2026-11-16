"use client";

import { addToast, Button, Dropdown, DropdownItem, DropdownMenu, DropdownSection, DropdownTrigger } from "@heroui/react";
import { ArrowUp, ArrowUpRight, ChevronDown, FileDown, ListPlus, Lock, Maximize2, Minimize2, Plus, ShieldCheck, Sparkles, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

import { announceSidePanel } from "@/shared/components/side-panel-events";
import { cn } from "@/shared/utils";

import { AiExportJob } from "./export-job";
import { acceptAiConsentAction } from "../actions/consent-actions";
import { executeAiProposalAction } from "../actions/execute-proposal";
import { deleteAiConversationAction, getAiConversationAction, listAiConversationsAction } from "../actions/history-actions";
import { AI_PANEL_COOKIE, AI_PANEL_MAX_WIDTH, AI_PANEL_MIN_WIDTH, encodePanelState, type AiPanelState } from "../panel-state";
import { toInternalMarkdownHref } from "@/shared/markdown/links";
import { parseMarkdown } from "@/shared/markdown/parse";
import type { AiFile, AiProposal } from "../types";

/** Masaüstü yerleşimleri: yan sütun (genişlik sürüklenir) ya da tam ekran. */
const DOCKED_CLASS = "md:sticky md:top-0 md:z-auto md:h-dvh md:w-[var(--ai-panel-width)] md:shrink-0 md:border-l md:border-default-200";
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
    else if (match[4]) parts.push(<code key={match.index} className="rounded bg-default-200 px-1 text-tiny">{match[4]}</code>);
    else
      parts.push(
        <a
          key={match.index}
          href={toInternalMarkdownHref(match[3])}
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
  // Eski sürümde kaydedilmiş (modül standardı öncesi) öneriler geçmişte yalnızca başlıkla gösterilir.
  const proposalText = (proposal: AiProposal, part: "kind" | "confirm" | "done") =>
    proposal.kind === "module" ? tRoot(`${proposal.module}.ai.${proposal.action}.${part}`) : t("proposal.legacy");
  const router = useRouter();
  const [open, setOpen] = useState(initialState.open);
  const [width, setWidth] = useState(initialState.width);
  const [conversationId, setConversationId] = useState<string | null>(initialState.conversationId);
  const [conversations, setConversations] = useState<{ id: string; title: string; updatedAt: string }[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const historyLoading=useRef(false);
  const historyEpoch=useRef(0);
  const requestAttempt=useRef<{content:string;conversationId:string|null;key:string}|null>(null);
  const [historyCursor,setHistoryCursor]=useState<string|null>(null);
  const [exportJobs,setExportJobs]=useState<Record<string,string>>({});
  const [done, setDone] = useState<Set<string>>(new Set());
  /** Genişletilmiş görünüm: masaüstünde sohbet tüm ekranı kaplar, içerik ortada okunur genişlikte. */
  const [expanded, setExpanded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
    const epoch=++historyEpoch.current;let cancelled=false;
    void getAiConversationAction({ id: initialState.conversationId }).then((result) => {
      if(cancelled||epoch!==historyEpoch.current)return;
      if (result.ok) {setTurns(result.data.turns.map((turn) => ({ ...turn, restored: true })));setHistoryCursor(result.data.pageInfo.beforeCursor);}
      else setConversationId(null);
    });
    return ()=>{cancelled=true;};
  }, [consented, provider, initialState.conversationId]);

  const refreshConversations = async () => {
    const result = await listAiConversationsAction();
    if (result.ok) setConversations(result.data);
  };
  const openConversation = async (id: string) => {
    if(busy)return;
    const epoch=++historyEpoch.current;
    const result = await getAiConversationAction({ id });
    if(epoch!==historyEpoch.current)return;
    if (!result.ok) return void addToast({ title: result.error, color: "danger" });
    requestAttempt.current=null;
    setConversationId(id);
    setHistoryCursor(result.data.pageInfo.beforeCursor);
    setTurns(result.data.turns.map((turn) => ({ ...turn, restored: true })));
    setDone(new Set());
  };
  const newConversation = () => {
    if(busy)return;
    historyEpoch.current++;requestAttempt.current=null;
    setConversationId(null);
    setHistoryCursor(null);
    setTurns([]);
    setDone(new Set());
  };
  const loadOlder = async () => {
    if(!conversationId||!historyCursor||historyLoading.current)return;
    const epoch=historyEpoch.current;
    historyLoading.current=true;
    const result=await getAiConversationAction({id:conversationId,before:historyCursor}).finally(()=>{historyLoading.current=false;});
    if(!result.ok||epoch!==historyEpoch.current)return;
    setTurns(current=>[...result.data.turns.map(turn=>({...turn,restored:true})),...current]);
    setHistoryCursor(result.data.pageInfo.beforeCursor);
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
    historyEpoch.current++;
    const next = [...turns, { role: "user" as const, content }];
    setTurns(next);
    setDraft("");
    setBusy(true);
    if(!requestAttempt.current||requestAttempt.current.content!==content||requestAttempt.current.conversationId!==conversationId)requestAttempt.current={content,conversationId,key:crypto.randomUUID()};
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestKey:requestAttempt.current.key, conversationId, message: content }),
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
      if(data.code!=="turnBusy"&&response.status!==429)requestAttempt.current=null;
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
          files: data.files,
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
    const result = await executeAiProposalAction({proposalId:proposal.proposalId});
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    if(result.data.jobId)setExportJobs(previous=>({...previous,[key]:result.data.jobId!}));
    setDone(previous=>new Set(previous).add(key));
    addToast({ title: proposalText(proposal, "done"), color: "success" });
  };

  const conversationTitle =
    conversations.find((item) => item.id === conversationId)?.title ??
    (conversationId ? turns.find((turn) => turn.role === "user")?.content : undefined) ??
    t("newConversation");
  const column = expanded ? "mx-auto w-full max-w-3xl" : "w-full";

  /** Yazdıkça büyüyen giriş kutusu (en çok ~8 satır). */
  const autoGrow = (element: HTMLTextAreaElement | null) => {
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 200)}px`;
  };
  useEffect(() => autoGrow(inputRef.current), [draft]);

  return (
    <>
      <div className="relative flex min-w-0 flex-1 flex-col">
        {children}
        {!open ? (
          // Yüzen giriş çubuğu: içerik alanının altında ortada; gönderince sohbet sütunu açılır.
          <div className="pointer-events-none sticky bottom-4 z-30 flex justify-center px-4">
            <form
              className="pointer-events-auto flex w-full max-w-xl items-center gap-2 rounded-[1.75rem] border border-default-200 bg-content1/95 p-2 pl-3 shadow-large backdrop-blur transition-colors focus-within:border-primary"
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
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-default-500 transition-colors hover:bg-default-100 hover:text-foreground"
              >
                <Sparkles className="h-5 w-5" aria-hidden />
              </button>
              <input
                aria-label={t("input")}
                placeholder={t("barPlaceholder")}
                className="min-w-0 flex-1 bg-transparent text-medium outline-none placeholder:text-default-400"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
              <Button type="submit" isIconOnly radius="full" color="primary" aria-label={t("send")} isDisabled={!draft.trim()} className="h-10 w-10 min-w-10">
                <ArrowUp className="h-5 w-5" aria-hidden />
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
          className={cn(
            "fixed inset-0 z-50 flex flex-col bg-background",
            expanded ? EXPANDED_CLASS : DOCKED_CLASS,
          )}
        >
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={t("resize")}
            title={t("resize")}
            onPointerDown={startResize}
            className={cn("absolute inset-y-0 left-0 z-10 hidden w-1.5 -translate-x-1/2 cursor-col-resize hover:bg-primary/30", !expanded && "md:block")}
          />
          <header className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
            {consented && provider ? (
              <Dropdown onOpenChange={(isOpen) => isOpen && void refreshConversations()}>
                <DropdownTrigger>
                  <button
                    type="button"
                    aria-label={t("history")}
                    className="flex min-w-0 items-center gap-1.5 rounded-medium px-2 py-1 text-large font-medium transition-colors hover:bg-default-100"
                  >
                    <span className="truncate">{conversationTitle}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-default-500" aria-hidden />
                  </button>
                </DropdownTrigger>
                <DropdownMenu
                  aria-label={t("history")}
                  onAction={(key) => {
                    if (key === "__new") return newConversation();
                    if (key === "__delete") return void removeConversation();
                    void openConversation(String(key));
                  }}
                  className="max-h-96 w-72 overflow-y-auto"
                >
                  <DropdownSection showDivider title={t("history")}>
                    {conversations.length ? (
                      conversations.map((item) => (
                        <DropdownItem key={item.id} description={new Date(item.updatedAt).toLocaleString()} textValue={item.title}>
                          <span className="line-clamp-1">{item.title}</span>
                        </DropdownItem>
                      ))
                    ) : (
                      <DropdownItem key="__empty" isReadOnly textValue={t("historyEmpty")} className="text-default-400">
                        {t("historyEmpty")}
                      </DropdownItem>
                    )}
                  </DropdownSection>
                  <DropdownSection>
                    <DropdownItem key="__new" startContent={<Plus className="h-4 w-4" aria-hidden />} textValue={t("newConversation")}>
                      {t("newConversation")}
                    </DropdownItem>
                    {conversationId ? (
                      <DropdownItem key="__delete" color="danger" className="text-danger" startContent={<Trash2 className="h-4 w-4" aria-hidden />} textValue={t("deleteConversation")}>
                        {t("deleteConversation")}
                      </DropdownItem>
                    ) : null}
                  </DropdownSection>
                </DropdownMenu>
              </Dropdown>
            ) : (
              <span className="px-2 text-large font-medium">{t("title")}</span>
            )}
            <div className="flex shrink-0 items-center gap-1">
              <span className="mr-1 rounded-full bg-default-100 px-2.5 py-0.5 text-tiny font-medium text-default-600">{t("beta")}</span>
              {consented && provider ? (
                <Button isIconOnly size="sm" variant="light" radius="full" aria-label={t("newConversation")} title={t("newConversation")} onPress={newConversation} isDisabled={busy}>
                  <Plus className="h-5 w-5" aria-hidden />
                </Button>
              ) : null}
              <Button
                isIconOnly
                size="sm"
                variant="light"
                radius="full"
                className="hidden md:inline-flex"
                aria-label={expanded ? t("collapse") : t("expand")}
                title={expanded ? t("collapse") : t("expand")}
                onPress={() => setExpanded((value) => !value)}
              >
                {expanded ? <Minimize2 className="h-4 w-4" aria-hidden /> : <Maximize2 className="h-4 w-4" aria-hidden />}
              </Button>
              <Button isIconOnly size="sm" variant="light" radius="full" aria-label={t("close")} title={t("close")} onPress={() => { setExpanded(false); setOpen(false); }}>
                <X className="h-5 w-5" aria-hidden />
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
              <div className="flex flex-1 flex-col overflow-y-auto px-4 text-small">
                {turns.length === 0 ? (
                  <div className={cn(column, "mt-auto flex flex-col gap-3 pb-4")}>
                    <h2 className="text-xl font-semibold text-foreground">{t("emptyTitle")}</h2>
                    <p className="mb-3 text-medium text-default-500">{t("emptySubtitle")}</p>
                    {(["q1", "q2", "q3", "q4"] as const).map((key) => (
                      <button
                        key={key}
                        type="button"
                        className="group flex items-center justify-between gap-3 rounded-large border border-default-200 px-4 py-3 text-left text-medium transition-colors hover:border-default-300 hover:bg-default-100"
                        onClick={() => {
                          setDraft(t(`examples.${key}`));
                          inputRef.current?.focus();
                        }}
                      >
                        <span>{t(`examples.${key}`)}</span>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-default-400 transition-colors group-hover:text-foreground" aria-hidden />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className={cn(column, "flex flex-col gap-4 py-2")}>
                  {historyCursor?<Button size="sm" onPress={()=>void loadOlder()}>{t("loadOlder")}</Button>:null}
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
                      {turn.files?.length ? (
                        <div className="flex w-[90%] flex-wrap gap-2">
                          {turn.files.map((file) => (
                            <Button
                              key={file.url}
                              as="a"
                              href={file.url}
                              target="_blank"
                              rel="noopener"
                              size="sm"
                              color="primary"
                              variant="flat"
                              startContent={<FileDown className="h-4 w-4" aria-hidden />}
                            >
                              {t("downloadFile", { title: file.title, format: file.format.toUpperCase() })}
                            </Button>
                          ))}
                        </div>
                      ) : null}
                      {turn.proposals?.map((proposal, position) => {
                        const key = proposal.proposalId ?? `${index}-${position}`;
                        return (
                          <div
                            key={key}
                            className="w-[90%] rounded-medium border border-primary-200 bg-primary-50/50 p-3 dark:border-primary-500/30 dark:bg-primary-500/10"
                          >
                            <p className="text-tiny font-semibold uppercase text-primary">
                              {proposalText(proposal, "kind")}
                            </p>
                            <p className="font-medium">{proposal.title}</p>
                            <p className="text-tiny text-default-500">{(proposal.details ?? []).join(" · ")}</p>
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
                            {exportJobs[key]?<AiExportJob id={exportJobs[key]}/>:null}
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
                )}
              </div>
              <form
                className={cn(column, "px-4 pb-3 pt-2")}
                onSubmit={(event) => {
                  event.preventDefault();
                  void send();
                }}
              >
                <div className="rounded-[1.75rem] border border-default-200 bg-content1 p-2 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                  <textarea
                    ref={inputRef}
                    aria-label={t("input")}
                    placeholder={t("composerPlaceholder")}
                    rows={1}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void send();
                      }
                    }}
                    className="block max-h-[200px] w-full resize-none bg-transparent px-3 pb-1 pt-2 text-medium outline-none placeholder:text-default-400"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <Button isIconOnly variant="light" radius="full" aria-label={t("newConversation")} title={t("newConversation")} onPress={newConversation} isDisabled={busy || turns.length === 0}>
                      <Plus className="h-5 w-5" aria-hidden />
                    </Button>
                    <Button type="submit" isIconOnly radius="full" color="primary" aria-label={t("send")} isDisabled={!draft.trim() || busy} className="h-10 w-10 min-w-10">
                      <ArrowUp className="h-5 w-5" aria-hidden />
                    </Button>
                  </div>
                </div>
                <p className="mt-2 text-center text-tiny text-default-400">{t("disclaimer")}</p>
                <p className="text-center text-tiny text-default-400">{t("privacyNote")}</p>
              </form>
            </>
          )}
        </aside>
      ) : null}
    </>
  );
}
