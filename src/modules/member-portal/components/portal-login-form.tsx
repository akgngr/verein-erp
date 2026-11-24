"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/shared/components/kit";

export function PortalLoginForm() {
  const t = useTranslations("member-portal");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/member-portal/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-800">
        <span>{t("login.emailLabel")}</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("login.emailPlaceholder")}
          className="rounded-lg border border-ink-200 bg-surface-0 px-3 py-2 text-sm text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </label>
      <Button type="submit" variant="primary" isDisabled={submitting || !email.trim()}>
        {t("login.submitButton")}
      </Button>
      {submitted ? (
        <p role="status" className="rounded-lg border border-success-300 bg-success-50 p-3 text-sm text-success-800">
          {t("login.sentNotice")}
        </p>
      ) : null}
    </form>
  );
}
