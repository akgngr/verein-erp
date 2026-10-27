import { MeetingCreateView } from "@/modules/meetings/ui";

export const metadata = { title: "Yeni toplantı" };

/** Toplantı oluşturma (7.2) — ince rota. */
export default function YeniToplantiPage() {
  return <MeetingCreateView />;
}
