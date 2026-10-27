import type { Metadata } from "next";

import { MemberSyncView } from "@/modules/accounting/server";

export const metadata: Metadata = { title: "Üyelik aktarımı" };

/** Üyelik aktarımı — ince sayfa (§ 6). */
export default function MuhasebeUyelikAktarimiPage() {
  return <MemberSyncView />;
}
