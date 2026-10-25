import { requirePermission, ForbiddenError } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";

import { UserCreateForm, UserFormCard } from "../components/user-form";
import { usersPermissions } from "../permissions";

export async function UserCreateView() {
  try {
    await requirePermission(usersPermissions, "create");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }

  return (
    <div>
      <PageHeader
        title="Yeni Kullanıcı"
        description="Sisteme yeni bir kullanıcı ekleyin. Kullanıcı ilk girişte parolasını değiştirmeye zorlanır."
      />
      <UserFormCard>
        <UserCreateForm />
      </UserFormCard>
    </div>
  );
}
