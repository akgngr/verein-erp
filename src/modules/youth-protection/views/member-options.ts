import "server-only";

import type { YouthProtectionMemberOption } from "../components/item-form";

/** #585: Üye seçici seçenekleri (members public API). Üyeler modülü kapalıysa seçici gösterilmez. */
export async function loadMemberOptions(): Promise<YouthProtectionMemberOption[]> {
  try {
    const { listMemberOptions } = await import("@/modules/members/server");
    return (await listMemberOptions()).map((member) => ({ id: member.id, label: member.label, membershipNumber: member.membershipNumber }));
  } catch {
    return [];
  }
}
