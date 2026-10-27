import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { membersPermissions } from "../permissions";
import { getMember } from "../queries/get-member";
import { MemberForm } from "../components/member-form";

/**
 * Üye düzenleme: form, üyelik numarasını salt okunur gösterir. Eşzamanlılık
 * koruması formun gizli updatedAt alanıyla sağlanır.
 */
export async function MemberEditView({ id }: { id: string }) {
  let user;
  try {
    user = await requirePermission(membersPermissions, "update");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  const member = await getMember(id, user.role);
  if (!member) notFound();

  const t = await getTranslations("members");

  return (
    <div>
      <PageHeader
        title={t("editTitle")}
        description={t("editDescription", { membershipNumber: member.membershipNumber })}
      />
      <MemberForm
        mode="edit"
        member={{
          id: member.id,
          membershipNumber: member.membershipNumber,
          type: member.type,
          status: member.status,
          firstName: member.firstName,
          lastName: member.lastName,
          kimlikNo: member.kimlikNo,
          email: member.email,
          phone: member.phone,
          street: member.street,
          houseNumber: member.houseNumber,
          postalCode: member.postalCode,
          city: member.city,
          state: member.state,
          country: member.country,
          birthDate: member.birthDate,
          profession: member.profession,
          joinDate: member.joinDate,
          exitDate: member.exitDate,
          exitReason: member.exitReason,
          notes: member.notes,
          updatedAt: member.updatedAt,
        }}
      />
    </div>
  );
}
