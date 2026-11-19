import "server-only";

import type { Role } from "@/shared/roles";

import { defaultProposalDeps } from "./proposal-store";
import { listPendingProposals, type ProposalView } from "./proposals";

/** Onay kutusu (T2.2 UI) için bekleyen öneriler: yalnız kullanıcının ve hâlâ izinli olanlar. */
export async function getPendingProposals(user: { id: string; role: Role }, now = new Date()): Promise<ProposalView[]> {
  return listPendingProposals(user, await defaultProposalDeps(), now);
}

/** Onay kutusu için güvenli durum: yalnız oturum sahibinin önerisi; başkasınınki "unavailable". */
export async function getMyProposalState(user: { id: string }, id: string, now = new Date()) {
  const { getProposalState } = await import("./proposals");
  const { prismaProposalStore } = await import("./proposal-store");
  return getProposalState(user, id, { store: prismaProposalStore() }, now);
}
