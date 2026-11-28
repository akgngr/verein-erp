import type { SponsorStatus, SponsorTier } from "./constants";

/** İstemci bileşenlerine aktarılan sponsor satırı. */
export type SponsorRow = {
  id: string;
  name: string;
  tier: SponsorTier;
  status: SponsorStatus;
  amountCents: number;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  startDate: Date | null;
  endDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SponsorSummary = {
  totalCount: number;
  activeCount: number;
  activeAmountCents: number;
  leadCount: number;
};
