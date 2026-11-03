import "server-only";

// Worker ve otomasyonlar için framework bağımsız kullanıcı API'si.
// Geniş users/server barrel'ındaki hesap yönetimi/action bağımlılıklarını içe aktarmaz.
export { getUserById, type UserRow } from "./queries/list-users";
export { loadPermissionPolicy } from "./services/roles";
