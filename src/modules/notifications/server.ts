import "server-only";

// notifications modülü — sunucu public girişi (N1a ile genişler)
export { notificationsPermissions } from "./permissions";
export { notify, NotificationError, type NotificationView } from "./services/inbox";
