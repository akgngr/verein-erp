import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  canAssignProxy,
  computeVotingWeight,
  countProxiesHeld,
  getRepresentedMemberIds,
  type ProxyAttendeeLike,
} from "../../src/modules/meetings/lib/proxy-voting";

describe("Meetings — Proxy Voting (Stimmrechtsübertragung, #589)", () => {
  const baseAttendees: ProxyAttendeeLike[] = [
    { id: "a1", memberId: "m1", attendance: "PRESENT", proxyToAttendeeId: null },
    { id: "a2", memberId: "m2", attendance: "ABSENT_EXCUSED", proxyToAttendeeId: "a1" },
    { id: "a3", memberId: "m3", attendance: "ABSENT", proxyToAttendeeId: "a1" },
    { id: "a4", memberId: "m4", attendance: "PRESENT", proxyToAttendeeId: null },
    { id: "a5", memberId: null, attendance: "PRESENT", proxyToAttendeeId: null },
    { id: "a6", memberId: null, attendance: "ABSENT", proxyToAttendeeId: "a1" },
  ];

  it("computeVotingWeight and countProxiesHeld sum base vote plus valid member proxies and exclude non-members", () => {
    assert.equal(countProxiesHeld("a1", baseAttendees), 2);
    assert.equal(computeVotingWeight("a1", baseAttendees), 3);
    assert.equal(computeVotingWeight("a4", baseAttendees), 1);
    assert.equal(computeVotingWeight("a2", baseAttendees), 0);
    assert.equal(computeVotingWeight("a5", baseAttendees), 0);
    assert.equal(computeVotingWeight("missing", baseAttendees), 0);
    assert.deepEqual(getRepresentedMemberIds("a1", baseAttendees), ["m1", "m2", "m3"]);
  });

  it("canAssignProxy enforces self, member source, presence, member target, and no-chain rules", () => {
    const a1 = baseAttendees[0]!;
    const a2 = baseAttendees[1]!;
    const a4 = baseAttendees[3]!;
    const guestPresent = baseAttendees[4]!;
    const guestAbsent = baseAttendees[5]!;

    assert.deepEqual(canAssignProxy(a2, null), { ok: true });
    assert.deepEqual(canAssignProxy(a2, a4), { ok: true });
    assert.deepEqual(canAssignProxy(a2, a2), { ok: false, reason: "self" });
    assert.deepEqual(canAssignProxy(guestAbsent, a4), { ok: false, reason: "sourceNoMember" });
    assert.deepEqual(canAssignProxy(a1, a4), { ok: false, reason: "sourcePresent" });
    assert.deepEqual(canAssignProxy(a2, baseAttendees[2]!), { ok: false, reason: "targetNotPresent" });
    assert.deepEqual(canAssignProxy(a2, guestPresent), { ok: false, reason: "targetNoMember" });
    assert.deepEqual(
      canAssignProxy(a2, { ...a4, proxyToAttendeeId: "a1" }),
      { ok: false, reason: "targetHasProxy" },
    );
  });

  it("unit-weight issuance reserves every represented member and prevents double counting on reassignment", () => {
    const reservedMemberIds = new Set<string>();
    const issuedBallots: { weight: number }[] = [];

    const simulateIssue = (holderId: string, attendees: ProxyAttendeeLike[]) => {
      const represented = getRepresentedMemberIds(holderId, attendees);
      if (represented.some((mId) => reservedMemberIds.has(mId))) {
        return { ok: false as const, error: "alreadyIssued" as const };
      }
      for (const mId of represented) {
        reservedMemberIds.add(mId);
        issuedBallots.push({ weight: 1 });
      }
      return { ok: true as const, count: represented.length };
    };

    // A (m2) delegates to B (a1/m1); B's credentials are issued -> reserves m1 and m2
    const attendeesBeforeReassign: ProxyAttendeeLike[] = [
      { id: "a1", memberId: "m1", attendance: "PRESENT", proxyToAttendeeId: null },
      { id: "a2", memberId: "m2", attendance: "ABSENT_EXCUSED", proxyToAttendeeId: "a1" },
      { id: "a4", memberId: "m4", attendance: "PRESENT", proxyToAttendeeId: null },
    ];
    assert.deepEqual(simulateIssue("a1", attendeesBeforeReassign), { ok: true, count: 2 });

    // Even if A's proxy were moved to C (a4/m4), issuing to C must reject because m2 is already reserved
    const attendeesAfterReassign: ProxyAttendeeLike[] = [
      { id: "a1", memberId: "m1", attendance: "PRESENT", proxyToAttendeeId: null },
      { id: "a2", memberId: "m2", attendance: "ABSENT_EXCUSED", proxyToAttendeeId: "a4" },
      { id: "a4", memberId: "m4", attendance: "PRESENT", proxyToAttendeeId: null },
    ];
    assert.deepEqual(simulateIssue("a4", attendeesAfterReassign), { ok: false, error: "alreadyIssued" });

    // Every issued ballot has unit weight (never > 1)
    assert.equal(issuedBallots.length, 2);
    assert.ok(issuedBallots.every((b) => b.weight === 1));
  });
});
