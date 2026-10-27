"use client";

import { Button, addToast } from "@heroui/react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";

import { deleteDecisionAction } from "../actions/decision-actions";
import { DECISION_RESULT_COLORS, DECISION_RESULT_LABELS } from "../constants";
import type { AgendaItemDetail, DecisionItem } from "../types";

import { DecisionModal } from "./decision-modal";

/** Sonuç rozeti (7.3 Kararlar). */
function ResultBadge({ result }: { result: DecisionItem["result"] }) {
  const color = DECISION_RESULT_COLORS[result];
  const colorClass =
    color === "success"
      ? "bg-success-50 text-success-700"
      : color === "danger"
        ? "bg-danger-50 text-danger-600"
        : "bg-warning-50 text-warning-600";
  return (
    <span className={`rounded-small px-2 py-0.5 text-tiny ${colorClass}`}>
      {DECISION_RESULT_LABELS[result]}
    </span>
  );
}

/**
 * Kararlar sekmesi (7.3): tüm kararlar; numara, metin, bağlı gündem maddesi,
 * sonuç rozeti, oylar. Ekleme ?gundem= ile önden seçilmiş maddeyle açılabilir.
 */
export function DecisionsTab({
  meetingId,
  decisions,
  agendaItems,
  editable,
  presetAgendaItemId,
}: {
  meetingId: string;
  decisions: DecisionItem[];
  agendaItems: AgendaItemDetail[];
  editable: boolean;
  presetAgendaItemId?: string | null;
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(Boolean(presetAgendaItemId));
  const [editing, setEditing] = useState<DecisionItem | null>(null);
  const [deleting, setDeleting] = useState<DecisionItem | null>(null);

  const confirmDelete = async () => {
    if (!deleting) return;
    const result = await deleteDecisionAction({ id: deleting.id });
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    addToast({ title: `Karar silindi: ${deleting.decisionNumber}`, color: "success" });
    setDeleting(null);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      {editable ? (
        <div>
          <Button
            size="sm"
            color="primary"
            startContent={<Plus className="h-4 w-4" />}
            onPress={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            Karar ekle
          </Button>
        </div>
      ) : null}

      {decisions.length === 0 ? (
        <p className="text-small text-default-500">Karar kaydı yok.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {decisions.map((decision) => (
            <li key={decision.id} className="rounded-medium border border-default-200 bg-content1 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{decision.decisionNumber}</span>
                    <ResultBadge result={decision.result} />
                    {decision.agendaItemTitle ? (
                      <span className="text-tiny text-default-500">
                        Gündem: {decision.agendaItemTitle}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-small">{decision.text}</p>
                  {decision.votesFor !== null ? (
                    <p className="mt-1 text-tiny text-default-500">
                      Kabul {decision.votesFor} / Ret {decision.votesAgainst ?? 0} / Çekimser{" "}
                      {decision.votesAbstain ?? 0}
                    </p>
                  ) : null}
                </div>
                {editable ? (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      aria-label="Düzenle"
                      onPress={() => {
                        setEditing(decision);
                        setModalOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      color="danger"
                      aria-label="Sil"
                      onPress={() => setDeleting(decision)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <DecisionModal
        meetingId={meetingId}
        agendaItems={agendaItems}
        decision={editing}
        defaultAgendaItemId={presetAgendaItemId ?? null}
        isOpen={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditing(null);
        }}
      />

      <ConfirmDialog
        isOpen={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Kararı sil"
        message={`"${deleting?.decisionNumber ?? ""}" numaralı karar silinecek. Karar numarası yeniden kullanılmaz; bu karara bağlı görevlerin bağlantısı boşalır. Onaylıyor musunuz?`}
        confirmLabel="Sil"
        confirmColor="danger"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
