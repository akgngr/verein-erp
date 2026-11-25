"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button, Card, CardContent, CardHeader, StatusChip } from "@/shared/components/kit";

type Art15Item = {
  id: string;
  status: string;
  expiresAt: string;
  createdAt: string;
};

type ProcessingLogItem = {
  id: string;
  actorRole: "PORTAL" | "BOARD" | "SYSTEM";
  category: string;
  action: string;
  createdAt: string;
};

type PortalEventItem = {
  id: string;
  title: string;
  startDate: string;
  location: string | null;
  isOnline: boolean;
  isRegistered: boolean;
};

type PendingFormItem = {
  id: string;
  kind: string;
  expiresAt: string;
};

export function PortalRightsPanel({
  initialArt15,
  processingLog,
  stepUpActive,
  businessLicensed,
  initialEvents,
  initialPendingForms,
}: {
  initialArt15: Art15Item[];
  processingLog: ProcessingLogItem[];
  stepUpActive: boolean;
  businessLicensed: boolean;
  initialEvents: PortalEventItem[];
  initialPendingForms: PendingFormItem[];
}) {
  const t = useTranslations("member-portal");

  const [art15, setArt15] = useState(initialArt15);
  const [art15Notice, setArt15Notice] = useState<string | null>(null);
  const [art15Pending, setArt15Pending] = useState(false);

  const [events, setEvents] = useState(initialEvents);
  const [eventPending, setEventPending] = useState<string | null>(null);

  const forms = initialPendingForms;

  async function requestArt15() {
    setArt15Pending(true);
    setArt15Notice(null);
    try {
      const res = await fetch("/api/member-portal/art15", { method: "POST" });
      if (!res.ok) {
        setArt15Notice(t("art15.errorNotice"));
        return;
      }
      const data = (await res.json()) as { id: string; expiresAt: string };
      setArt15((prev) => [
        {
          id: data.id,
          status: "READY",
          expiresAt: data.expiresAt,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setArt15Notice(t("art15.createdNotice"));
    } finally {
      setArt15Pending(false);
    }
  }

  async function registerEvent(eventId: string) {
    setEventPending(eventId);
    try {
      const res = await fetch("/api/member-portal/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      if (res.ok) {
        setEvents((prev) =>
          prev.map((ev) => (ev.id === eventId ? { ...ev, isRegistered: true } : ev)),
        );
      }
    } finally {
      setEventPending(null);
    }
  }


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-ink-900">{t("art15.title")}</h2>
          <p className="text-xs text-ink-500">{t("art15.subtitle")}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {!stepUpActive ? (
            <p className="text-xs text-warning-700">{t("art15.stepUpHint")}</p>
          ) : (
            <Button
              type="button"
              size="sm"
              isDisabled={art15Pending}
              onPress={requestArt15}
            >
              {t("art15.requestButton")}
            </Button>
          )}
          {art15Notice ? (
            <p className="text-xs text-ink-600" role="status">
              {art15Notice}
            </p>
          ) : null}
          {art15.length === 0 ? (
            <p className="text-xs text-ink-500">{t("art15.empty")}</p>
          ) : (
            <ul className="divide-y divide-ink-100 text-sm">
              {art15.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div>
                    <div className="font-medium text-ink-900">{t("art15.bundleTitle")}</div>
                    <div className="text-xs text-ink-500">
                      {item.expiresAt.slice(0, 10)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusChip tone="success">{item.status}</StatusChip>
                    {stepUpActive ? (
                      <a
                        href={`/api/member-portal/art15/download?id=${encodeURIComponent(item.id)}`}
                        className="inline-flex h-8 items-center rounded-lg border border-ink-200 px-3 text-xs font-medium text-ink-900 hover:bg-ink-50"
                      >
                        {t("art15.downloadButton")}
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-ink-900">{t("processingLog.title")}</h2>
          <p className="text-xs text-ink-500">{t("processingLog.subtitle")}</p>
        </CardHeader>
        <CardContent>
          {processingLog.length === 0 ? (
            <p className="text-xs text-ink-500">{t("processingLog.empty")}</p>
          ) : (
            <ul className="divide-y divide-ink-100 text-sm">
              {processingLog.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div>
                    <span className="font-medium text-ink-900">
                      {t(`processingLog.categories.${entry.category}`)}
                    </span>{" "}
                    <span className="text-xs text-ink-500">· {entry.action}</span>
                  </div>
                  <div className="text-xs text-ink-500">
                    {t(`processingLog.roles.${entry.actorRole}`)} · {entry.createdAt.slice(0, 10)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {businessLicensed ? (
        <>
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-ink-900">{t("events.title")}</h2>
              <p className="text-xs text-ink-500">{t("events.subtitle")}</p>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-xs text-ink-500">{t("events.empty")}</p>
              ) : (
                <ul className="divide-y divide-ink-100 text-sm">
                  {events.map((ev) => (
                    <li key={ev.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <div>
                        <div className="font-medium text-ink-900">{ev.title}</div>
                        <div className="text-xs text-ink-500">
                          {ev.startDate.slice(0, 10)}
                          {ev.location ? ` · ${ev.location}` : ""}
                        </div>
                      </div>
                      {ev.isRegistered ? (
                        <StatusChip tone="success">{t("events.registered")}</StatusChip>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          isDisabled={eventPending === ev.id}
                          onPress={() => registerEvent(ev.id)}
                        >
                          {t("events.registerButton")}
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-ink-900">{t("signing.title")}</h2>
              <p className="text-xs text-ink-500">{t("signing.subtitle")}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {forms.length === 0 ? (
                <p className="text-xs text-ink-500">{t("signing.empty")}</p>
              ) : (
                <>
                  {/* #580: İmza e-postadaki form bağlantısında (belge, imza, kanıt ve PDF ile) yapılır. */}
                  <p className="text-xs text-ink-600">{t("signing.useEmailLink")}</p>
                  <ul className="divide-y divide-ink-100 text-sm">
                    {forms.map((form) => (
                      <li key={form.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                        <div>
                          <div className="font-medium text-ink-900">{form.kind}</div>
                          <div className="text-xs text-ink-500">{form.expiresAt.slice(0, 10)}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
