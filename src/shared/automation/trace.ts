/**
 * Terminal trace for automation troubleshooting. On by default; set
 * AUTOMATION_TRACE=false to silence. Never pass personal data: use IDs,
 * codes and maskEmail() for addresses.
 */
export function automationTrace(scope: string, message: string, fields: Record<string, unknown> = {}): void {
  if (process.env.AUTOMATION_TRACE === "false") return;
  const details = Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${typeof value === "string" ? value : JSON.stringify(value)}`)
    .join(" ");
  console.info(`[automation:${scope}] ${message}${details ? ` ${details}` : ""}`);
}

/** "board@example.org" → "b***@example.org" */
export function maskEmail(value: string): string {
  const [local = "", domain = ""] = value.split("@");
  return domain ? `${local.slice(0, 1)}***@${domain}` : "***";
}
