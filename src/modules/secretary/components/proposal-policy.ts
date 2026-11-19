/** Presentation guard only; the server rechecks authorization, expiry and external risk. */
export function requiresExternalConfirmation(risk: "internal" | "external"): boolean {
  return risk === "external";
}
export function isProposalExpired(expiresAt: string, now: Date): boolean {
  const deadline = Date.parse(expiresAt);
  return !Number.isFinite(deadline) || deadline <= now.getTime();
}
