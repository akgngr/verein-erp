import "server-only";

/**
 * N1c (#356): atanan üyenin e-postasına karşılık gelen etkin kullanıcıya bildirim. Atayan kişi kendine bildirim
 * almaz. Bildirim hatası görev işlemini asla bozmaz (günlükte içerik yok).
 */
export async function notifyTaskAssignee(task: { id: string; title: string; memberId: string | null }, actorId: string): Promise<void> {
  if (!task.memberId) return;
  try {
    const { getMemberContacts } = await import("@/modules/members/automation");
    const email = (await getMemberContacts([task.memberId])).get(task.memberId)?.email;
    if (!email) return;
    const { findActiveUserIdsByEmails } = await import("@/modules/users/automation");
    const recipients = (await findActiveUserIdsByEmails([email])).filter((id) => id !== actorId);
    if (!recipients.length) return;
    const { notify } = await import("@/modules/notifications/automation");
    await notify({ type: "tasks.assigned", recipients, ref: `task:${task.id}:assigned:${task.memberId}`, params: { taskId: task.id, title: task.title.slice(0, 200) } });
  } catch {
    console.error("[tasks] NOTIFY_ASSIGNEE_FAILED");
  }
}
