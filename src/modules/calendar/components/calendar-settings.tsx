"use client";
import {
  toast,
  Button,
  Spinner,
  Modal,
  TextField,
  Label,
  Input,
} from "@heroui/react";
import { CopyValue } from "@/shared/components/ui/copy-value";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { Link2, Plus, RefreshCw, Unlink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import {
  revokeFeedAction,
  rotateFeedAction,
  saveSharedCalendarAction,
  setPersonalColorAction,
} from "../actions/calendar-actions";
import type { CalendarSourceView, SyncSettingsData } from "../types";
import { SyncSettings } from "./sync-settings";

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sources: CalendarSourceView[];
  canManageShared: boolean;
  hasFeed: boolean;
  sync: SyncSettingsData;
};

export function CalendarSettings({
  isOpen,
  onOpenChange,
  sources,
  canManageShared,
  hasFeed,
  sync,
}: Props) {
  const t = useTranslations("calendar.settings");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedUrl, setFeedUrl] = useState<string | null>(null);
  const [feedActive, setFeedActive] = useState(hasFeed);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#22c55e");
  const personal = sources.find((source) => source.kind === "PERSONAL");
  const shared = sources.filter((source) => source.kind === "SHARED");

  const run = (action: () => Promise<void>) =>
    startTransition(async () => {
      await action();
      router.refresh();
    });

  const feedHint = feedUrl ? (
    <p className="text-xs text-warning-700">{t("feedOnce")}</p>
  ) : feedActive ? (
    <p className="text-xs text-ink-500">{t("feedActive")}</p>
  ) : null;

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size="lg" scroll={"inside"}>
          <Modal.Dialog className={"w-full max-w-2xl "}>
            <DialogDismissButton />

            <Modal.Header>
              <Modal.Heading className="flex items-center gap-2">
                {t("title")}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="gap-6 pb-6">
              <section className="flex flex-col gap-2">
                <h3 className="font-semibold">{t("feedTitle")}</h3>
                <p className="text-sm text-ink-600">{t("feedDescription")}</p>
                {feedUrl ? (
                  <CopyValue
                    value={feedUrl}
                    className={"max-w-full"}
                    truncate
                  />
                ) : null}
                {feedHint}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onPress={() =>
                      run(async () => {
                        const response = await rotateFeedAction({});
                        if (!response.ok)
                          return void toast(response.error, {
                            variant: "danger",
                          });
                        setFeedUrl(
                          `${window.location.origin}/api/calendar/feed/${response.data.token}.ics`,
                        );
                        setFeedActive(true);
                      })
                    }
                    variant={actionVariant("primary", "flat")}
                    isPending={pending}
                  >
                    {pending ? <Spinner size="sm" color="current" /> : null}
                    {feedActive ? (
                      <RefreshCw className="h-4 w-4" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}
                    {feedActive ? t("feedRotate") : t("feedCreate")}
                  </Button>
                  {feedActive ? (
                    <Button
                      size="sm"
                      onPress={() =>
                        run(async () => {
                          const response = await revokeFeedAction({});
                          if (!response.ok)
                            return void toast(response.error, {
                              variant: "danger",
                            });
                          setFeedUrl(null);
                          setFeedActive(false);
                        })
                      }
                      variant={actionVariant("danger", "light")}
                      isPending={pending}
                    >
                      {pending ? <Spinner size="sm" color="current" /> : null}
                      {<Unlink className="h-4 w-4" />}
                      {t("feedRevoke")}
                    </Button>
                  ) : null}
                </div>
              </section>

              <SyncSettings data={sync} />

              {personal ? (
                <section className="flex flex-col gap-2">
                  <h3 className="font-semibold">{t("personalTitle")}</h3>
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="color"
                      defaultValue={personal.color}
                      aria-label={t("color")}
                      onChange={(event) =>
                        run(async () => {
                          await setPersonalColorAction({
                            color: event.target.value,
                          });
                        })
                      }
                    />
                    {personal.label}
                  </label>
                </section>
              ) : null}

              <section className="flex flex-col gap-2">
                <h3 className="font-semibold">{t("sharedTitle")}</h3>
                <p className="text-sm text-ink-600">{t("sharedDescription")}</p>
                <ul className="flex flex-col gap-1">
                  {shared.map((source) => (
                    <li
                      key={source.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: source.color }}
                      />
                      {source.label}
                    </li>
                  ))}
                </ul>
                {canManageShared ? (
                  <div className="flex flex-wrap items-end gap-2">
                    <TextField
                      value={name}
                      onChange={setName}
                      className={["max-w-xs"].filter(Boolean).join(" ")}
                    >
                      <Label>{t("sharedName")}</Label>
                      <Input
                        className={["h-9 text-sm"].filter(Boolean).join(" ")}
                      />
                    </TextField>
                    <input
                      type="color"
                      value={color}
                      aria-label={t("color")}
                      onChange={(event) => setColor(event.target.value)}
                      className="h-10 w-12"
                    />
                    <Button
                      size="sm"
                      isDisabled={name.trim().length < 2}
                      onPress={() =>
                        run(async () => {
                          const response = await saveSharedCalendarAction({
                            name,
                            color,
                          });
                          if (!response.ok)
                            return void toast(response.error, {
                              variant: "danger",
                            });
                          setName("");
                          toast(t("sharedCreated"), { variant: "success" });
                        })
                      }
                      variant={actionVariant("primary", "solid")}
                      isPending={pending}
                    >
                      {pending ? <Spinner size="sm" color="current" /> : null}
                      {<Plus className="h-4 w-4" />}
                      {t("sharedAdd")}
                    </Button>
                  </div>
                ) : null}
              </section>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
