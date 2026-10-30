import { z } from "zod";

/** Panel düzeni: sıralı kart kimlikleri ("<modül>.<kart>"). */
export const dashboardLayoutSchema = z.object({
  cards: z.array(z.string().trim().min(3).max(120)).max(60),
});

export type DashboardLayoutInput = z.infer<typeof dashboardLayoutSchema>;
