/** Pure time policy, shared by request reads and worker cleanup. */
export const AI_CONVERSATION_RETENTION_DAYS = 180;
export const AI_HISTORY_WINDOW = 40;
export function aiRetentionCutoff(now = new Date()): Date {
  return new Date(now.getTime() - AI_CONVERSATION_RETENTION_DAYS * 86_400_000);
}
