"use client";

import { notify } from "@/shared/components/ui/notify";
import { Description, Input, Label, Select, Spinner, TextField, Button } from "@/shared/components/kit";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { saveInboxSettingsAction } from "../actions/inbox-actions";

/** IMAP ayarları. Kayıtlı şifre geri gösterilmez; boş bırakılırsa değişmez. */
export function InboxSettingsForm({
  initial,
}: {
  initial: {
    host: string | null;
    port: number;
    security: string;
    username: string | null;
    hasPassword: boolean;
    mailbox: string;
  };
}) {
  const t = useTranslations("mail.inbox.settings");
  const router = useRouter();
  const [host, setHost] = useState(initial.host ?? "");
  const [port, setPort] = useState(String(initial.port));
  const [security, setSecurity] = useState(initial.security);
  const [username, setUsername] = useState(initial.username ?? "");
  const [password, setPassword] = useState("");
  const [mailbox, setMailbox] = useState(initial.mailbox);
  const [busy, setBusy] = useState(false);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <TextField
        value={host}
        onChange={setHost}
        className={["w-full"].filter(Boolean).join(" ")}
      >
        <Label>{t("host")}</Label>
        <Input placeholder="imap.example.com" />
      </TextField>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          value={port}
          onChange={setPort}
          className={["w-full"].filter(Boolean).join(" ")}
        >
          <Label>{t("port")}</Label>
          <Input type="number" />
        </TextField>
        <Select
          value={security}
          onChange={(selectedValue) => {
            const keys =
              selectedValue === null ? undefined : String(selectedValue);
            const key = keys;
            if (typeof key === "string") {
              setSecurity(key);
              setPort(key === "SSL" ? "993" : "143");
            }
          }}
        >
          <Label>{t("security")}</Label>
              {["SSL", "STARTTLS", "NONE"].map((value) => (
                <Select.Item
                  key={value}
                  id={value}
                  textValue={String(t(`securities.${value}`))}
                >
                  <Label>{t(`securities.${value}`)}</Label>
                </Select.Item>
              ))}
        </Select>
      </div>
      <TextField
        value={username}
        onChange={setUsername}
        className={["w-full"].filter(Boolean).join(" ")}
      >
        <Label>{t("username")}</Label>
        <Input autoComplete="off" />
      </TextField>
      <TextField
        value={password}
        onChange={setPassword}
        className={["w-full"].filter(Boolean).join(" ")}
      >
        <Label>{t("password")}</Label>
        <Input
          type="password"
          autoComplete="new-password"
          placeholder={initial.hasPassword ? t("passwordStored") : ""}
        />
      </TextField>
      <TextField
        value={mailbox}
        onChange={setMailbox}
        className={["w-full"].filter(Boolean).join(" ")}
      >
        <Label>{t("mailbox")}</Label>
        <Input />
        <Description>{t("mailboxHelp")}</Description>
      </TextField>
      <div className="flex items-end">
        <Button
          onPress={async () => {
            setBusy(true);
            const response = await saveInboxSettingsAction({
              host,
              port: Number(port),
              security,
              username,
              password,
              mailbox,
            });
            setBusy(false);
            if (!response.ok)
              return void notify.error(response.error);
            setPassword("");
            notify.success(t("saved"));
            router.refresh();
          }}
          variant={actionVariant("primary", "solid")}
          isPending={busy}
        >
          {busy ? <Spinner size="sm" tone="current" /> : null}
          {t("save")}
        </Button>
      </div>
      <p className="text-xs text-ink-500 md:col-span-2">{t("help")}</p>
    </div>
  );
}
