"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button, Card, CardContent, CardHeader, Checkbox, Dialog, Input, Label, TextArea, TextField } from "@/shared/components/kit";
import { useRoles } from "@/shared/components/roles/roles-provider";

import { createAnnouncementAction } from "../actions/announcements";

type RoleOption = { key: string; label: string };

export function AnnouncementForm({ roles }: { roles: RoleOption[] }) {
  // #586: Sistem/modül rolleri çevrilmiş adla (önceden "ADMIN", "TAX_ADVISOR" gibi anahtarlar görünüyordu).
  const { label: translateRole } = useRoles();
  const roleLabel = (role: RoleOption) => (role.label && role.label !== role.key ? role.label : translateRole(role.key));
  const t = useTranslations("notifications.ui.announcement");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<number | null>(null);

  const toggle = (key: string) => {
    setSelected((current) => current.includes(key) ? current.filter((value) => value !== key) : [...current, key]);
    setRecipients(null);
  };

  async function send() {
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      const result = await createAnnouncementAction({ title: title.trim(), body: body.trim(), ...(selected.length ? { roles: selected } : {}) });
      if (!result.ok) {
        setError(t("sendError"));
        setConfirmOpen(false);
        return;
      }
      setRecipients(result.data.recipients);
      setTitle("");
      setBody("");
      setSelected([]);
      setConfirmOpen(false);
    } catch {
      setError(t("sendError"));
      setConfirmOpen(false);
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader><h2 className="text-lg font-semibold">{t("compose")}</h2></CardHeader>
      <CardContent>
        <form className="flex flex-col gap-5" onSubmit={(event) => {
          event.preventDefault();
          if (!sending && title.trim()) { setError(null); setRecipients(null); setConfirmOpen(true); }
        }}>
          <TextField value={title} onChange={(value) => { setTitle(value); setRecipients(null); }} isRequired>
            <Label>{t("subject")}</Label>
            <Input maxLength={120} />
          </TextField>
          <TextField value={body} onChange={(value) => { setBody(value); setRecipients(null); }}>
            <Label>{t("message")}</Label>
            <TextArea rows={6} maxLength={1000} />
          </TextField>
          <fieldset className="rounded-lg border border-ink-200 p-4">
            <legend className="px-1 text-sm font-semibold">{t("audience")}</legend>
            <p className="mb-3 text-sm text-foreground-muted">{t("audienceHint")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {roles.map((role) => (
                <Checkbox key={role.key} isSelected={selected.includes(role.key)} onChange={() => toggle(role.key)} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-ink-200 px-3 py-2 text-sm">
                  <span>{roleLabel(role)}</span>
                </Checkbox>
              ))}
            </div>
          </fieldset>
          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          {recipients !== null ? <p role="status" className="text-sm text-success">{t("sent", { count: recipients })}</p> : null}
          <div><Button type="submit" variant="primary" isDisabled={sending || !title.trim()}>{t("review")}</Button></div>
        </form>
      </CardContent>
      <Dialog isOpen={confirmOpen} onOpenChange={(open) => { if (!sending) setConfirmOpen(open); }} isDismissable={!sending} size="md">
        {() => (
          <>
            <Dialog.Header><Dialog.Heading>{t("confirmTitle")}</Dialog.Heading></Dialog.Header>
            <Dialog.Body>
              <p className="text-sm">{t("confirmMessage")}</p>
              <p className="mt-2 text-sm font-semibold">{selected.length ? t("selectedRoles", { roles: roles.filter((role) => selected.includes(role.key)).map(roleLabel).join(", ") }) : t("everyone")}</p>
              <p className="mt-3 break-words text-sm font-semibold">{title.trim()}</p>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="tertiary" isDisabled={sending} onPress={() => setConfirmOpen(false)}>{t("cancel")}</Button>
              <Button variant="primary" isPending={sending} isDisabled={sending} onPress={() => void send()}>{t("send")}</Button>
            </Dialog.Footer>
          </>
        )}
      </Dialog>
    </Card>
  );
}
