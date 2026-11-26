"use client";

import { useEffect, useState } from "react";

import { availableNotificationChannelsAction, type ChannelAvailability } from "../actions/channels";
import { ChannelAdminSettings } from "./channel-admin";
import { NotificationChannelLinks } from "./channel-links";
import { PhoneChannelLink } from "./phone-channel-link";
import { NotificationPreferencesForm } from "./preferences-form";

/**
 * #604 — notification settings: availability is loaded once; the preferences table and the link cards show only
 * channels that actually deliver. Admin sections render only for users who may change channel settings.
 */
export function NotificationChannelsPanel() {
  const [available, setAvailable] = useState<ChannelAvailability | null>(null);
  useEffect(() => {
    let mounted = true;
    void availableNotificationChannelsAction({}).then((result) => { if (mounted && result.ok) setAvailable(result.data); }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  return (
    <div className="space-y-6">
      <NotificationPreferencesForm available={available} />
      <NotificationChannelLinks showLink={available ? available.telegram : false} />
      {available?.sms ? <PhoneChannelLink channel="sms" /> : null}
      {available?.whatsappLinking ? <PhoneChannelLink channel="whatsapp" /> : null}
      <ChannelAdminSettings />
    </div>
  );
}
