/**
 * Pure helpers for proxy voting (Stimmrechtsübertragung / Vekâlet) in meetings (#589).
 * Kept free of server-only/Next imports so unit tests can run directly under tsx.
 */

export type ProxyAttendeeLike = {
  id: string;
  memberId: string | null;
  attendance: string;
  proxyToAttendeeId: string | null;
};

export type ProxyValidationError =
  | "self"
  | "sourceNoMember"
  | "sourcePresent"
  | "targetNotPresent"
  | "targetNoMember"
  | "targetHasProxy";

export function countProxiesHeld(
  attendeeId: string,
  attendees: readonly ProxyAttendeeLike[],
): number {
  let count = 0;
  for (const attendee of attendees) {
    if (
      attendee.proxyToAttendeeId === attendeeId &&
      attendee.attendance !== "PRESENT" &&
      attendee.memberId !== null
    ) {
      count += 1;
    }
  }
  return count;
}

export function computeVotingWeight(
  attendeeId: string,
  attendees: readonly ProxyAttendeeLike[],
): number {
  const self = attendees.find((attendee) => attendee.id === attendeeId);
  if (!self || !self.memberId || self.attendance !== "PRESENT" || self.proxyToAttendeeId !== null) {
    return 0;
  }
  return 1 + countProxiesHeld(attendeeId, attendees);
}

export function getRepresentedMemberIds(
  attendeeId: string,
  attendees: readonly ProxyAttendeeLike[],
): string[] {
  const self = attendees.find((attendee) => attendee.id === attendeeId);
  if (!self || !self.memberId || self.attendance !== "PRESENT" || self.proxyToAttendeeId !== null) {
    return [];
  }
  const ids = new Set<string>([self.memberId]);
  for (const attendee of attendees) {
    if (
      attendee.proxyToAttendeeId === attendeeId &&
      attendee.attendance !== "PRESENT" &&
      attendee.memberId !== null
    ) {
      ids.add(attendee.memberId);
    }
  }
  return [...ids];
}

export function canAssignProxy(
  source: ProxyAttendeeLike,
  target: ProxyAttendeeLike | null,
): { ok: true } | { ok: false; reason: ProxyValidationError } {
  if (!target) return { ok: true };
  if (source.id === target.id) return { ok: false, reason: "self" };
  if (!source.memberId) return { ok: false, reason: "sourceNoMember" };
  if (source.attendance === "PRESENT") return { ok: false, reason: "sourcePresent" };
  if (target.attendance !== "PRESENT") return { ok: false, reason: "targetNotPresent" };
  if (!target.memberId) return { ok: false, reason: "targetNoMember" };
  if (target.proxyToAttendeeId !== null) return { ok: false, reason: "targetHasProxy" };
  return { ok: true };
}
