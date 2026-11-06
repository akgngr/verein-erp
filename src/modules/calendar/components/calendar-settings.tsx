"use client";

import { addToast, Button, Input, Modal, ModalBody, ModalContent, ModalHeader, Snippet } from "@heroui/react";
import { Link2, Plus, RefreshCw, Unlink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { revokeFeedAction, rotateFeedAction, saveSharedCalendarAction, setPersonalColorAction } from "../actions/calendar-actions";
import type { CalendarSourceView } from "../types";

type Props = { isOpen: boolean; onOpenChange: (open: boolean) => void; sources: CalendarSourceView[]; canManageShared: boolean; hasFeed: boolean };

export function CalendarSettings({ isOpen, onOpenChange, sources, canManageShared, hasFeed }: Props) {
  const t = useTranslations("calendar.settings");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedUrl, setFeedUrl] = useState<string | null>(null);
  const [feedActive, setFeedActive] = useState(hasFeed);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#22c55e");
  const personal = sources.find((source) => source.kind === "PERSONAL");
  const shared = sources.filter((source) => source.kind === "SHARED");

  const run = (action: () => Promise<void>) => startTransition(async () => { await action(); router.refresh(); });

  const feedHint = feedUrl
    ? <p className="text-tiny text-warning-700">{t("feedOnce")}</p>
    : feedActive ? <p className="text-tiny text-default-500">{t("feedActive")}</p> : null;

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>{t("title")}</ModalHeader>
        <ModalBody className="gap-6 pb-6">
          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">{t("feedTitle")}</h3>
            <p className="text-small text-default-600">{t("feedDescription")}</p>
            {feedUrl ? <Snippet symbol="" size="sm" className="max-w-full" classNames={{ pre: "truncate" }}>{feedUrl}</Snippet> : null}
            {feedHint}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" color="primary" variant="flat" isLoading={pending} startContent={feedActive ? <RefreshCw className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                onPress={() => run(async () => {
                  const response = await rotateFeedAction({});
                  if (!response.ok) return void addToast({ title: response.error, color: "danger" });
                  setFeedUrl(`${window.location.origin}/api/calendar/feed/${response.data.token}.ics`);
                  setFeedActive(true);
                })}>
                {feedActive ? t("feedRotate") : t("feedCreate")}
              </Button>
              {feedActive ? (
                <Button size="sm" variant="light" color="danger" isLoading={pending} startContent={<Unlink className="h-4 w-4" />}
                  onPress={() => run(async () => {
                    const response = await revokeFeedAction({});
                    if (!response.ok) return void addToast({ title: response.error, color: "danger" });
                    setFeedUrl(null);
                    setFeedActive(false);
                  })}>
                  {t("feedRevoke")}
                </Button>
              ) : null}
            </div>
            <p className="text-tiny text-default-500">{t("feedPlugins")}</p>
          </section>

          {personal ? (
            <section className="flex flex-col gap-2">
              <h3 className="font-semibold">{t("personalTitle")}</h3>
              <label className="flex items-center gap-3 text-small">
                <input type="color" defaultValue={personal.color} aria-label={t("color")}
                  onChange={(event) => run(async () => { await setPersonalColorAction({ color: event.target.value }); })} />
                {personal.label}
              </label>
            </section>
          ) : null}

          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">{t("sharedTitle")}</h3>
            <p className="text-small text-default-600">{t("sharedDescription")}</p>
            <ul className="flex flex-col gap-1">
              {shared.map((source) => (
                <li key={source.id} className="flex items-center gap-2 text-small">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: source.color }} />{source.label}
                </li>
              ))}
            </ul>
            {canManageShared ? (
              <div className="flex flex-wrap items-end gap-2">
                <Input size="sm" label={t("sharedName")} className="max-w-xs" value={name} onValueChange={setName} />
                <input type="color" value={color} aria-label={t("color")} onChange={(event) => setColor(event.target.value)} className="h-10 w-12" />
                <Button size="sm" color="primary" isDisabled={name.trim().length < 2} isLoading={pending} startContent={<Plus className="h-4 w-4" />}
                  onPress={() => run(async () => {
                    const response = await saveSharedCalendarAction({ name, color });
                    if (!response.ok) return void addToast({ title: response.error, color: "danger" });
                    setName("");
                    addToast({ title: t("sharedCreated"), color: "success" });
                  })}>
                  {t("sharedAdd")}
                </Button>
              </div>
            ) : null}
          </section>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
