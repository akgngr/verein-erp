"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button, Card, StatusChip } from "@/shared/components/kit";
import { isTimeBoxActive } from "@/shared/security/external-grant";

import { createExternalGrantAction, revokeExternalGrantAction } from "../actions/external-grants";

export type ExternalGrantItem = {
  id: string;
  moduleScope: string | null;
  startsAt: string;
  expiresAt: string;
  revokedAt: string | null;
  note: string | null;
};

type Props = {
  userId: string;
  grants: ExternalGrantItem[];
  defaultStartsAt: string;
  defaultExpiresAt: string;
};

export function ExternalGrantsPanel({ userId, grants, defaultStartsAt, defaultExpiresAt }: Props) {
  const t = useTranslations("users.grants");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [startsAt, setStartsAt] = useState(defaultStartsAt.slice(0, 16));
  const [expiresAt, setExpiresAt] = useState(defaultExpiresAt.slice(0, 16));
  const [moduleScope, setModuleScope] = useState<string>("");
  const [note, setNote] = useState("");

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createExternalGrantAction({
        userId,
        moduleScope: moduleScope === "accounting" || moduleScope === "finance" ? moduleScope : null,
        startsAt: new Date(startsAt).toISOString(),
        expiresAt: new Date(expiresAt).toISOString(),
        note: note || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setNote("");
      router.refresh();
    });
  }

  function handleRevoke(grantId: string) {
    setError(null);
    startTransition(async () => {
      const res = await revokeExternalGrantAction({ grantId, userId });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card className="mt-4">
      <Card.Header>
        <h3 className="text-base font-semibold text-ink-900">{t("title")}</h3>
        <p className="text-xs text-ink-500">{t("subtitle")}</p>
      </Card.Header>
      <Card.Content className="space-y-4">
        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
            {t("startsAt")}
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="rounded-lg border border-ink-200 bg-surface-0 px-3 py-2 text-sm text-ink-900"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
            {t("expiresAt")}
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="rounded-lg border border-ink-200 bg-surface-0 px-3 py-2 text-sm text-ink-900"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
            {t("moduleScope")}
            <select
              value={moduleScope}
              onChange={(e) => setModuleScope(e.target.value)}
              className="rounded-lg border border-ink-200 bg-surface-0 px-3 py-2 text-sm text-ink-900"
            >
              <option value="">{t("scopeAll")}</option>
              <option value="accounting">{t("scopeAccounting")}</option>
              <option value="finance">{t("scopeFinance")}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
            {t("note")}
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("notePlaceholder")}
              className="rounded-lg border border-ink-200 bg-surface-0 px-3 py-2 text-sm text-ink-900"
            />
          </label>
          <div className="md:col-span-2">
            <Button type="submit" isDisabled={isPending} size="sm" variant="primary">
              {t("createButton")}
            </Button>
          </div>
        </form>

        {grants.length === 0 ? (
          <p className="text-xs text-ink-500">{t("empty")}</p>
        ) : (
          <ul className="space-y-2">
            {grants.map((grant) => {
              const active = isTimeBoxActive({
                startsAt: new Date(grant.startsAt),
                expiresAt: new Date(grant.expiresAt),
                revokedAt: grant.revokedAt ? new Date(grant.revokedAt) : null,
              });
              const statusKey = grant.revokedAt ? "revoked" : active ? "active" : "expired";
              return (
                <li
                  key={grant.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-200/80 p-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <StatusChip tone={statusKey === "active" ? "success" : statusKey === "revoked" ? "danger" : "warning"}>
                        {t(`statuses.${statusKey}`)}
                      </StatusChip>
                      <span className="text-xs font-medium text-ink-700">
                        {grant.moduleScope === "accounting"
                          ? t("scopeAccounting")
                          : grant.moduleScope === "finance"
                            ? t("scopeFinance")
                            : t("scopeAll")}
                      </span>
                    </div>
                    <p className="text-xs text-ink-500">
                      {new Date(grant.startsAt).toLocaleString()} → {new Date(grant.expiresAt).toLocaleString()}
                    </p>
                    {grant.note ? <p className="text-xs text-ink-600">{grant.note}</p> : null}
                  </div>
                  {statusKey === "active" ? (
                    <Button
                      size="sm"
                      variant="danger-soft"
                      isDisabled={isPending}
                      onPress={() => handleRevoke(grant.id)}
                    >
                      {t("revokeButton")}
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card.Content>
    </Card>
  );
}
