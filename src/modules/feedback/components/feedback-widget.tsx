"use client";
import {
  toast,
  Button,
  Spinner,
  Modal,
  TextField,
  Label,
  Input,
  TextArea,
} from "@heroui/react";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import {
  Bug,
  Lightbulb,
  MessageSquareWarning,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

const INTRO_KEY = "feedback.introSeen";
const MUTE_KEY = "feedback.muted";

const storage = {
  get: (key: string) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // gizli mod vb. — yok sayılır
    }
  },
};

/** Kısa iki tonlu "bip" (WebAudio; dosya gerekmez). Tarayıcı ilk etkileşimden önce sesi engeller. */
function beep() {
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    [880, 1320].forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = frequency;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + index * 0.14);
      gain.gain.exponentialRampToValueAtTime(
        0.15,
        ctx.currentTime + index * 0.14 + 0.02,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + index * 0.14 + 0.12,
      );
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + index * 0.14);
      osc.stop(ctx.currentTime + index * 0.14 + 0.13);
    });
    window.setTimeout(() => void ctx.close(), 600);
  } catch {
    // ses yoksa sessizce devam
  }
}

/**
 * Sağ altta yüzen geri bildirim butonu. İlk ziyarette tanıtım balonu + bip (ilk tıklamadan
 * sonra; tarayıcılar otomatik sesi engeller). Ses kapatılabilir. Bağlam otomatik eklenir.
 */
export function FeedbackWidget() {
  const t = useTranslations("feedback.widget");
  const pathname = usePathname();
  const [intro, setIntro] = useState(false);
  const [muted, setMuted] = useState(false);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"BUG" | "SUGGESTION">("BUG");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const isMuted = storage.get(MUTE_KEY) === "1";
    // localStorage yalnızca istemcide okunur; durum güncellemesi bir sonraki tikte (hidrasyon sonrası).
    const sync = window.setTimeout(() => setMuted(isMuted), 0);
    if (storage.get(INTRO_KEY)) return () => window.clearTimeout(sync);
    const show = window.setTimeout(() => setIntro(true), 1500);
    // Ses ancak bir kullanıcı etkileşiminden sonra çalabilir: ilk tıklamada bir kez bip.
    const onFirstInteraction = () => {
      if (!isMuted) beep();
      window.removeEventListener("pointerdown", onFirstInteraction);
    };
    window.addEventListener("pointerdown", onFirstInteraction, { once: true });
    return () => {
      window.clearTimeout(sync);
      window.clearTimeout(show);
      window.removeEventListener("pointerdown", onFirstInteraction);
    };
  }, []);

  const dismissIntro = () => {
    setIntro(false);
    storage.set(INTRO_KEY, "1");
  };
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    storage.set(MUTE_KEY, next ? "1" : "0");
    if (!next) beep();
  };
  const start = (kind: "BUG" | "SUGGESTION") => {
    dismissIntro();
    setType(kind);
    setOpen(true);
  };

  const submit = async () => {
    setBusy(true);
    try {
      const body = new FormData();
      body.append("type", type);
      body.append("title", title);
      body.append("description", description);
      body.append(
        "pageUrl",
        pathname +
          (window.location.search
            ? window.location.search.replace(
                /([?&])(q|search)=[^&]*/g,
                "$1$2=…",
              )
            : ""),
      );
      body.append("userAgent", navigator.userAgent);
      body.append("viewport", `${window.innerWidth}x${window.innerHeight}`);
      if (file) body.append("screenshot", file);
      const response = await fetch("/api/feedback/create", {
        method: "POST",
        body,
      });
      const result = (await response.json()) as {
        ok: boolean;
        number?: number;
        error?: string;
      };
      if (!result.ok) {
        toast(result.error ?? t("failed"), { variant: "danger" });
        return;
      }
      toast(t("sent", { number: result.number ?? 0 }), { variant: "success" });
      if (!muted) beep();
      setOpen(false);
      setTitle("");
      setDescription("");
      setFile(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-2 md:bottom-6 md:right-6 print:hidden">
        {intro ? (
          <div className="relative max-w-64 animate-[bounce_1s_ease-in-out_2] rounded-xl border border-brand-200 bg-surface p-3 pr-8 text-sm shadow-lg">
            <button
              type="button"
              aria-label={t("close")}
              onClick={dismissIntro}
              className="absolute right-2 top-2 text-ink-400 hover:text-ink-600"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
            <p className="font-semibold">{t("introTitle")}</p>
            <p className="text-ink-600">{t("introText")}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Button
                size="sm"
                onPress={() => start("BUG")}
                variant={actionVariant("danger", "flat")}
              >
                {<Bug className="h-3.5 w-3.5" aria-hidden />}
                {t("bug")}
              </Button>
              <Button
                size="sm"
                onPress={() => start("SUGGESTION")}
                variant={actionVariant("primary", "flat")}
              >
                {<Lightbulb className="h-3.5 w-3.5" aria-hidden />}
                {t("suggestion")}
              </Button>
            </div>
          </div>
        ) : null}
        <div className="flex items-center gap-1.5">
          <Button
            isIconOnly
            size="sm"
            aria-label={muted ? t("unmute") : t("mute")}
            onPress={toggleMute}
            variant={actionVariant("default", "flat")}
            className={["bg-surface shadow-sm", "rounded-full"]
              .filter(Boolean)
              .join(" ")}
          >
            {muted ? (
              <VolumeX className="h-4 w-4" aria-hidden />
            ) : (
              <Volume2 className="h-4 w-4" aria-hidden />
            )}
          </Button>
          <Button
            isIconOnly
            aria-label={t("open")}
            onPress={() => start("BUG")}
            variant={actionVariant("warning", "solid")}
            className={[
              `h-12 w-12 shadow-lg ${intro ? "animate-pulse" : ""}`,
              "rounded-full",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <MessageSquareWarning className="h-5 w-5" aria-hidden />
          </Button>
        </div>
      </div>

      <Modal isOpen={open} onOpenChange={setOpen}>
        <Modal.Backdrop>
          <Modal.Container size="lg">
            <Modal.Dialog className={"w-full max-w-lg "}>
              {({ close: close }) => (
                <>
                  <DialogDismissButton />
                  <Modal.Header>
                    <Modal.Heading className="flex items-center gap-2">
                      {t("title")}
                    </Modal.Heading>
                  </Modal.Header>
                  <Modal.Body className="gap-3">
                    <div className="grid grid-cols-2 gap-2">
                      {(["BUG", "SUGGESTION"] as const).map((kind) => (
                        <button
                          key={kind}
                          type="button"
                          onClick={() => setType(kind)}
                          className={`flex items-center gap-2 rounded-lg border p-3 text-left text-sm ${type === kind ? (kind === "BUG" ? "border-danger bg-danger-50" : "border-accent bg-brand-50") : "border-ink-200"}`}
                        >
                          {kind === "BUG" ? (
                            <Bug className="h-5 w-5 text-danger" aria-hidden />
                          ) : (
                            <Lightbulb
                              className="h-5 w-5 text-accent"
                              aria-hidden
                            />
                          )}
                          <span className="flex flex-col">
                            <span className="font-semibold">
                              {kind === "BUG" ? t("bug") : t("suggestion")}
                            </span>
                            <span className="text-xs text-ink-500">
                              {kind === "BUG"
                                ? t("bugHint")
                                : t("suggestionHint")}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                    <TextField
                      value={title}
                      isRequired
                      onChange={setTitle}
                      className={["w-full"].filter(Boolean).join(" ")}
                    >
                      <Label>{t("fieldTitle")}</Label>
                      <Input maxLength={150} />
                    </TextField>
                    <TextField
                      value={description}
                      isRequired
                      onChange={setDescription}
                      className={["w-full"].filter(Boolean).join(" ")}
                    >
                      <Label>{t("fieldDescription")}</Label>
                      <TextArea
                        placeholder={
                          type === "BUG"
                            ? t("bugPlaceholder")
                            : t("suggestionPlaceholder")
                        }
                        rows={4}
                        className={["[field-sizing:content]"]
                          .filter(Boolean)
                          .join(" ")}
                      />
                    </TextField>
                    <div className="flex flex-col gap-1">
                      <input
                        ref={fileInput}
                        type="file"
                        accept="image/png,image/jpeg"
                        className="hidden"
                        onChange={(event) =>
                          setFile(event.target.files?.[0] ?? null)
                        }
                      />
                      <Button
                        size="sm"
                        className="self-start"
                        onPress={() => fileInput.current?.click()}
                        variant={actionVariant("default", "flat")}
                      >
                        {file ? file.name : t("screenshot")}
                      </Button>
                      <p className="text-xs text-ink-500">
                        {t("screenshotHint")}
                      </p>
                    </div>
                    <p className="rounded-lg bg-ink-100 p-2 text-xs text-ink-600">
                      {t("context", { page: pathname })}
                    </p>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button
                      onPress={close}
                      variant={actionVariant("default", "light")}
                    >
                      {t("cancel")}
                    </Button>
                    <Button
                      isDisabled={
                        title.trim().length < 3 || description.trim().length < 5
                      }
                      onPress={submit}
                      variant={actionVariant(
                        type === "BUG" ? "danger" : "primary",
                        "solid",
                      )}
                      isPending={busy}
                    >
                      {busy ? <Spinner size="sm" color="current" /> : null}
                      {t("send")}
                    </Button>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
