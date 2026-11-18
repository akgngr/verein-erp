// secretary modülü — sunucu public girişi
import "server-only";

export { secretaryPermissions } from "./permissions";
export { getBriefing } from "./services/briefing";
export { getPendingProposals } from "./services/pending-proposals";
export type { ProposalView } from "./services/proposals";
