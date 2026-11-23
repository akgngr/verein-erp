"use client";

import { NotificationInboxWidget } from "../views/inbox-widget";

/** Widget Platform entry (lazy-loaded by the header slot): the notification bell + right drawer. */
export default function NotificationBellWidget() {
  return <NotificationInboxWidget />;
}
