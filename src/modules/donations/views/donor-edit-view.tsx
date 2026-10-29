import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { FormDrawer } from "@/shared/components/forms/form-drawer";

import { getDonor } from "../queries/get-donor";
import { donationsPermissions } from "../permissions";
import { DonorForm } from "../components/donor-form";

/** Bağışçı düzenleme (§ 15 md. 4). */
export async function DonorEditView({ id }: { id: string }) {
  const tDonors = await getTranslations("donations.donors");
  let user;
  try {
    user = await requirePermission(donationsPermissions, "update");
  } catch (error) {
    if (error instanceof ForbiddenError) return <FormDrawer title="">{<AccessDenied />}</FormDrawer>;
    throw error;
  }
  void user;

  const donor = await getDonor(id);
  if (!donor) notFound();
  const t = await getTranslations("donations.donors.form");

  return (
    <FormDrawer title={t("editTitle")} description={`SP-${String(donor.donorNumber).padStart(4, "0")}`}>
      {donor.isAnonymized ? (
        <div className="max-w-3xl rounded-medium border border-warning-300 bg-warning-50 px-4 py-3 text-small text-warning-700">
          {tDonors("anonymizedNoEdit")}
        </div>
      ) : (
        <DonorForm
          mode="edit"
          initial={{
            type: donor.type,
            firstName: donor.firstName ?? "",
            lastName: donor.lastName ?? "",
            organizationName: donor.organizationName ?? "",
            street: donor.street ?? "",
            postalCode: donor.postalCode ?? "",
            city: donor.city ?? "",
            country: donor.country ?? "Deutschland",
            email: donor.email ?? "",
            phone: donor.phone ?? "",
            note: donor.note ?? "",
            id: donor.id,
            isActive: donor.isActive,
          }}
        />
      )}
    </FormDrawer>
  );
}
