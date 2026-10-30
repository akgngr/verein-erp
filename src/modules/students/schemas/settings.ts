import { z } from "zod";

export const studentsSettingsSchema = z.object({
  datevConsultantNo: z.string().trim().refine((value) => value === "" || /^\d{4,7}$/.test(value), "students.validation.consultantNoInvalid"),
  datevClientNo: z.string().trim().refine((value) => value === "" || /^\d{1,5}$/.test(value), "students.validation.clientNoInvalid"),
  debtorRangeStart: z.coerce.number().int().min(10000, "students.validation.debtorRange").max(69999, "students.validation.debtorRange"),
});

export type StudentsSettingsInput = z.infer<typeof studentsSettingsSchema>;
