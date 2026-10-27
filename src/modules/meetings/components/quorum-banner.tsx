import type { QuorumInfo } from "../types";

/**
 * Yeter sayısı bandı (5. bölüm md. 8): quorumRequired tanımlı değilse hiç
 * gösterilmez; ulaşıldığında yeşil, ulaşılamadığında amber renk.
 */
export function QuorumBanner({ quorum }: { quorum: QuorumInfo }) {
  if (quorum.required === null || quorum.reached === null) return null;

  const reached = quorum.reached;
  return (
    <div
      role="status"
      className={`rounded-medium px-4 py-2 text-small font-medium ${
        reached
          ? "bg-success-50 text-success-700"
          : "bg-warning-50 text-warning-600"
      }`}
    >
      {reached
        ? `Toplantı yeter sayısı sağlandı (${quorum.presentCount}/${quorum.required})`
        : `Toplantı yeter sayısı sağlanmadı (${quorum.presentCount}/${quorum.required})`}
    </div>
  );
}
