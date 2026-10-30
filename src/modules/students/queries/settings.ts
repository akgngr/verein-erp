import "server-only";

import { getDb } from "@/shared/db";

import { DEBTOR_NUMBER_MIN } from "../constants";

export async function getStudentsSettings() {
  const row = await getDb().studentsSettings.findUnique({ where: { id: "singleton" } });
  return {
    datevConsultantNo: row?.datevConsultantNo ?? "",
    datevClientNo: row?.datevClientNo ?? "",
    debtorRangeStart: row?.debtorRangeStart ?? DEBTOR_NUMBER_MIN,
  };
}
