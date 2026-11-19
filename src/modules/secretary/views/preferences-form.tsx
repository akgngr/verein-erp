"use client";

import { useState } from "react";

import { Button, Input, Label, TextField } from "@/shared/components/kit";
import { notify } from "@/shared/components/ui/notify";
import { validPreferences, type SecretaryPreferencesValue } from "./preferences-policy";
import { saveSecretaryPreferencesAction } from "../actions/preferences";

export type SecretaryPreferenceLabels = {
  title: string;
  enabled: string;
  briefingTime: string;
  quietFrom: string;
  quietTo: string;
  inApp: string;
  email: string;
  save: string;
  saved: string;
  error: string;
  invalid: string;
  emailHint: string;
};

export function SecretaryPreferencesForm({
  initial,
  labels,
}: {
  initial: SecretaryPreferencesValue;
  labels: SecretaryPreferenceLabels;
}) {
  const [value, setValue] = useState(initial);
  const [pending, setPending] = useState(false);

  const toggleChannel = (channel: "in_app" | "email", checked: boolean) =>
    setValue((previous) => ({
      ...previous,
      channels: checked
        ? [...new Set([...previous.channels, channel])]
        : previous.channels.filter((candidate) => candidate !== channel),
    }));

  const save = async () => {
    if (pending) return;
    if (!validPreferences(value)) {
      notify.error(labels.invalid);
      return;
    }
    setPending(true);
    try {
      const result = await saveSecretaryPreferencesAction({
        ...value,
        quietFrom: value.quietFrom || null,
        quietTo: value.quietTo || null,
      });
      if (!result.ok) {
        notify.error(result.error || labels.error);
      } else {
        notify.success(labels.saved);
      }
    } catch {
      notify.error(labels.error);
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-ink-200/80 p-4" aria-label={labels.title}>
      <h2 className="text-base font-semibold">{labels.title}</h2>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={value.briefingEnabled} disabled={pending}
          onChange={(event) => setValue((previous) => ({ ...previous, briefingEnabled: event.target.checked }))} />
        {labels.enabled}
      </label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {([
          ["briefingTime", labels.briefingTime],
          ["quietFrom", labels.quietFrom],
          ["quietTo", labels.quietTo],
        ] as const).map(([key, title]) => (
          <TextField key={key} isDisabled={pending || !value.briefingEnabled}>
            <Label>{title}</Label>
            <Input type="time" value={value[key]} onChange={(event) => setValue((previous) => ({ ...previous, [key]: event.target.value }))}/>
          </TextField>
        ))}
      </div>
      <fieldset className="space-y-2" disabled={pending || !value.briefingEnabled}>
        <legend className="text-sm font-medium">{labels.inApp} / {labels.email}</legend>
        {(["in_app", "email"] as const).map((channel) => (
          <label key={channel} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={value.channels.includes(channel)}
              onChange={(event) => toggleChannel(channel, event.target.checked)} />
            {channel === "in_app" ? labels.inApp : labels.email}
          </label>
        ))}
        <p className="text-xs text-ink-500">{labels.emailHint}</p>
      </fieldset>
      <Button variant="primary" isDisabled={pending || !validPreferences(value)} isPending={pending} onPress={() => void save()}>{labels.save}</Button>
    </section>
  );
}
