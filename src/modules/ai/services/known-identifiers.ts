import "server-only";

import { listActiveUserOptions } from "@/modules/auth/server";
import { listMemberOptions } from "@/modules/members/server";
import { listGuardianOptions, listStudentOptions } from "@/modules/students/server";
import { listUsableModuleKeys } from "@/modules/system/server";

/**
 * Maskeleme için kayıtlı kişi adları ve numaraları (üyeler, kullanıcılar, öğrenciler, veliler).
 * KARAR: Liste yalnızca sunucuda, metindeki eşleşmeleri [PERSON_n]/[REF_n] ile değiştirmek
 * için kullanılır; asla modele veya istemciye gönderilmez. Koruyucu olduğu için kullanıcının
 * o modüldeki yetkisinden bağımsız çalışır; yalnızca etkin modüllerden okunur.
 */
export async function loadKnownIdentifiers(): Promise<{ names: string[]; references: string[] }> {
  const usable = new Set(await listUsableModuleKeys());
  const [members, users, students, guardians] = await Promise.all([
    usable.has("members") ? listMemberOptions() : [],
    listActiveUserOptions(),
    usable.has("students") ? listStudentOptions() : [],
    usable.has("students") ? listGuardianOptions() : [],
  ]);
  return {
    names: [
      ...members.map((member) => member.label),
      ...users.map((user) => user.label),
      ...students.map((student) => student.label),
      ...guardians.map((guardian) => guardian.label.replace(/\s*\(\d+\)$/, "")),
    ],
    references: [...members.map((member) => member.membershipNumber), ...students.map((student) => student.studentNumber)],
  };
}
