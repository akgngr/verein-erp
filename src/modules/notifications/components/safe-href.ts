/** N1b: only simple internal routes are rendered as links (no external, encoded or control-character escapes). */
export function safeNotificationHref(value: unknown): value is string {
  return typeof value === "string" && value.length >= 2 && value.length <= 300 &&
    value.startsWith("/") && !value.startsWith("//") &&
    !/[\\?#%<>\s\x00-\x1f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/.test(value) &&
    !value.split("/").some(segment => segment === "." || segment === "..");
}
