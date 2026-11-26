"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button, Card, DateTimeInput, StatusChip } from "@/shared/components/kit";
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

function toLocalDatetimeInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ExternalGrantsPanel({ userId, grants, defaultStartsAt, defaultExpiresAt }: Props) {
  const t = useTranslations("users.grants");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [startsAt, setStartsAt] = useState(() => toLocalDatetimeInput(defaultStartsAt));
  const [expiresAt, setExpiresAt] = useState(() => toLocalDatetimeInput(defaultExpiresAt));
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
          <DateTimeInput
            label={t("startsAt")}
            ariaLabel={t("startsAt")}
            value={startsAt}
            onChange={setStartsAt}
            isRequired
          />
          <DateTimeInput
            label={t("expiresAt")}
            ariaLabel={t("expiresAt")}
            value={expiresAt}
            onChange={setExpiresAt}
            minValue={startsAt || undefined}
            isRequired
          />
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
            <Button type="submit" isDisabled={isPending || !startsAt || !expiresAt} size="sm" variant="primary">
              {t("createButton")}
            </Button>
          </div>
        </form>

        {grants.length === 0 ? (
          <p className="text-xs text-ink-500">{t("empty")}</p>
        ) : (
          <ul className="space-y-2">
            {grants.map((grant) => {
              const now = new Date();
              const startDate = new Date(grant.startsAt);
              const endDate = new Date(grant.expiresAt);
              const active = isTimeBoxActive(
                {
                  startsAt: startDate,
                  expiresAt: endDate,
                  revokedAt: grant.revokedAt ? new Date(grant.revokedAt) : null,
                },
                now,
              );
              const scheduled = !grant.revokedAt && startDate > now && endDate > startDate;
              const statusKey = grant.revokedAt
                ? "revoked"
                : active
                  ? "active"
                  : scheduled
                    ? "scheduled"
                    : "expired";
              const chipTone =
                statusKey === "active"
                  ? "success"
                  : statusKey === "scheduled"
                    ? "primary"
                    : statusKey === "revoked"
                      ? "danger"
                      : "warning";
              return (
                <li
                  key={grant.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-200/80 p-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <StatusChip tone={chipTone}>
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
                      {startDate.toLocaleString()} → {endDate.toLocaleString()}
                    </p>
                    {grant.note ? <p className="text-xs text-ink-600">{grant.note}</p> : null}
                  </div>
                  {statusKey === "active" || statusKey === "scheduled" ? (
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
