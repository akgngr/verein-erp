import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  canAssignProxy,
  computeVotingWeight,
  countProxiesHeld,
  type ProxyAttendeeLike,
} from "../../src/modules/meetings/lib/proxy-voting";

describe("Meetings — Proxy Voting (Stimmrechtsübertragung, #589)", () => {
  const baseAttendees: ProxyAttendeeLike[] = [
    { id: "a1", memberId: "m1", attendance: "PRESENT", proxyToAttendeeId: null },
    { id: "a2", memberId: "m2", attendance: "ABSENT_EXCUSED", proxyToAttendeeId: "a1" },
    { id: "a3", memberId: "m3", attendance: "ABSENT", proxyToAttendeeId: "a1" },
    { id: "a4", memberId: "m4", attendance: "PRESENT", proxyToAttendeeId: null },
    { id: "a5", memberId: null, attendance: "PRESENT", proxyToAttendeeId: null },
  ];

  it("computeVotingWeight and countProxiesHeld sum base vote plus valid proxies", () => {
    assert.equal(countProxiesHeld("a1", baseAttendees), 2);
    assert.equal(computeVotingWeight("a1", baseAttendees), 3);
    assert.equal(computeVotingWeight("a4", baseAttendees), 1);
    assert.equal(computeVotingWeight("a2", baseAttendees), 0);
    assert.equal(computeVotingWeight("missing", baseAttendees), 0);
  });

  it("canAssignProxy enforces self, presence, membership, and no-chain rules", () => {
    const a1 = baseAttendees[0]!;
    const a2 = baseAttendees[1]!;
    const a4 = baseAttendees[3]!;
    const guest = baseAttendees[4]!;

    assert.deepEqual(canAssignProxy(a2, null), { ok: true });
    assert.deepEqual(canAssignProxy(a2, a4), { ok: true });
    assert.deepEqual(canAssignProxy(a2, a2), { ok: false, reason: "self" });
    assert.deepEqual(canAssignProxy(a1, a4), { ok: false, reason: "sourcePresent" });
    assert.deepEqual(canAssignProxy(a2, baseAttendees[2]!), { ok: false, reason: "targetNotPresent" });
    assert.deepEqual(canAssignProxy(a2, guest), { ok: false, reason: "targetNoMember" });
    assert.deepEqual(
      canAssignProxy(a2, { ...a4, proxyToAttendeeId: "a1" }),
      { ok: false, reason: "targetHasProxy" },
    );
  });
});
