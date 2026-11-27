import "server-only";

// notifications modülü — sunucu public girişi (N1a ile genişler)
export { notificationsPermissions } from "./permissions";
export { notify, NotificationError, type NotificationView } from "./services/inbox";
// Modül sağlık kokpiti (system): etkin dış kanallar (#583).
export { listEnabledNotificationChannels } from "./queries/enabled-channels";
