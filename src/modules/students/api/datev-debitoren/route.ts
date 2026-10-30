import { datevDebtorsHandler } from "../../services/datev-handler";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  return datevDebtorsHandler();
}
