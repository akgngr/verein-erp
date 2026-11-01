"use client";

import { addToast, Button, Input, Select, SelectItem } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { saveInboxSettingsAction } from "../actions/inbox-actions";

/** IMAP ayarları. Kayıtlı şifre geri gösterilmez; boş bırakılırsa değişmez. */
export function InboxSettingsForm({ initial }: { initial: { host: string | null; port: number; security: string; username: string | null; hasPassword: boolean; mailbox: string } }) {
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
      <Input label={t("host")} labelPlacement="outside" placeholder="imap.example.com" value={host} onValueChange={setHost} />
      <div className="grid grid-cols-2 gap-3">
        <Input type="number" label={t("port")} labelPlacement="outside" value={port} onValueChange={setPort} />
        <Select
          label={t("security")}
          labelPlacement="outside"
          selectedKeys={[security]}
          onSelectionChange={(keys) => {
            const key = Array.from(keys)[0];
            if (typeof key === "string") {
              setSecurity(key);
              setPort(key === "SSL" ? "993" : "143");
            }
          }}
        >
          {["SSL", "STARTTLS", "NONE"].map((value) => (
            <SelectItem key={value}>{t(`securities.${value}`)}</SelectItem>
          ))}
        </Select>
      </div>
      <Input label={t("username")} labelPlacement="outside" autoComplete="off" value={username} onValueChange={setUsername} />
      <Input type="password" label={t("password")} labelPlacement="outside" autoComplete="new-password" placeholder={initial.hasPassword ? t("passwordStored") : ""} value={password} onValueChange={setPassword} />
      <Input label={t("mailbox")} labelPlacement="outside" value={mailbox} onValueChange={setMailbox} description={t("mailboxHelp")} />
      <div className="flex items-end">
        <Button
          color="primary"
          isLoading={busy}
          onPress={async () => {
            setBusy(true);
            const response = await saveInboxSettingsAction({ host, port: Number(port), security, username, password, mailbox });
            setBusy(false);
            if (!response.ok) return void addToast({ title: response.error, color: "danger" });
            setPassword("");
            addToast({ title: t("saved"), color: "success" });
            router.refresh();
          }}
        >
          {t("save")}
        </Button>
      </div>
      <p className="text-tiny text-default-500 md:col-span-2">{t("help")}</p>
    </div>
  );
}
