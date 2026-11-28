// crm modülü — sunucu public girişi
import "server-only";

export { crmPermissions } from "./permissions";
export { listOpenFollowUpsForHub, pipelineStats, type HubFollowUpItem } from "./services/crm";
