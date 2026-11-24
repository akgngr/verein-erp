"use client";

import { notify } from "@/shared/components/ui/notify";
import { actionVariant } from "@/shared/components/ui/action-appearance";

import {
  FormSurface,
  useFormDrawerClose,
} from "@/shared/components/forms/form-drawer";
import { zodResolver } from "@hookform/resolvers/zod";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { applyActionResult } from "@/shared/components/forms/action-result";
import { FormErrorSummary } from "@/shared/components/forms/form-error-summary";
import { FormInput } from "@/shared/components/forms/form-input";
import { FormPasswordInput } from "@/shared/components/forms/form-password-input";
import { FormSelect } from "@/shared/components/forms/form-select";
import { FormSwitch } from "@/shared/components/forms/form-switch";
import { SubmitButton } from "@/shared/components/forms/submit-button";
import { useRoles } from "@/shared/components/roles/roles-provider";
import type { Role } from "@/shared/roles";

import { createUserAction } from "../actions/create-user";
import { updateUserAction } from "../actions/update-user";
import { RolePermissionsPreview } from "./role-permissions-matrix";
import {
  userCreateSchema,
  userUpdateSchema,
  type UserCreateInput,
  type UserUpdateInput,
} from "../schemas/user";
import { Button } from "@/shared/components/kit";

/** Yalnızca atanabilir roller (modülü kullanılabilir olanlar); mevcut rol listede değilse eklenir. */
function useRoleSelectOptions(current?: string) {
  const { roles, label } = useRoles();
  return roles
    .filter((role) => role.available || role.key === current)
    .map((role) => ({ value: role.key, label: label(role.key) }));
}

/** Yeni kullanıcı formu (11.1). */
export function UserCreateForm() {
  const t = useTranslations("users.form");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const closeDrawer = useFormDrawerClose();
  const roleOptions = useRoleSelectOptions();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<UserCreateInput>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: { name: "", email: "", role: "VIEWER", setupMode: "invite", password: "" },
  });

  const selectedRole = (useWatch({ control: form.control, name: "role" }) as Role) || "VIEWER";
  const setupMode = useWatch({ control: form.control, name: "setupMode" }) ?? "invite";

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const result = await createUserAction(values);
    if (!result.ok) {
      setFormError(applyActionResult(result, form.setError));
      return;
    }
    if (values.setupMode === "invite") {
      if (result.data.inviteSent) notify.success(t("createdInvited", { email: values.email }));
      else notify.warning(t("createdInviteFailed"));
    } else {
      notify.success(t("created"));
    }
    if (closeDrawer) {
      closeDrawer();
    } else {
      router.push(`/ayarlar/kullanicilar/${result.data.id}`);
      router.refresh();
    }
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      <FormInput
        name="name"
        label={t("name")}
        control={form.control}
        isRequired
      />
      <FormInput
        name="email"
        label={t("email")}
        control={form.control}
        type="email"
        isRequired
        placeholder={tCommon("emailPlaceholder")}
      />
      <FormSelect
        name="role"
        label={t("role")}
        control={form.control}
        options={roleOptions}
        isRequired
      />
      <RolePermissionsPreview role={selectedRole} />
      <FormSelect
        name="setupMode"
        label={t("setupMode")}
        control={form.control}
        options={[
          { value: "invite", label: t("setupInvite") },
          { value: "password", label: t("setupPassword") },
        ]}
        isRequired
        description={setupMode === "invite" ? t("setupInviteHint") : t("setupPasswordHint")}
      />
      {setupMode === "password" ? (
        <FormPasswordInput
          name="password"
          label={t("tempPassword")}
          control={form.control}
          allowGenerate
          isRequired
          description={t("tempPasswordHint")}
        />
      ) : null}
      <FormErrorSummary message={formError} />
      <div className="flex items-center gap-2">
        <SubmitButton isSubmitting={form.formState.isSubmitting}>
          {tCommon("create")}
        </SubmitButton>
        <Button
          onPress={() =>
            closeDrawer ? closeDrawer() : router.push("/ayarlar/kullanicilar")
          }
          variant={actionVariant("default", "light")}
        >
          {tCommon("cancel")}
        </Button>
      </div>
    </form>
  );
}

export type UserEditValues = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
};

/** Düzenleme formu (11.1): ad, e-posta, rol, aktif/pasif. Parola sıfırlama ayrı eylemdir. */
export function UserEditForm({ user }: { user: UserEditValues }) {
  const t = useTranslations("users.form");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const closeDrawer = useFormDrawerClose();
  const roleOptions = useRoleSelectOptions(user.role);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<UserUpdateInput>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
  });

  const selectedRole = (useWatch({ control: form.control, name: "role" }) as Role) || user.role;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const result = await updateUserAction({ id: user.id, ...values });
    if (!result.ok) {
      setFormError(applyActionResult(result, form.setError));
      return;
    }
    notify.success(t("updated"));
    if (closeDrawer) {
      closeDrawer();
    } else {
      router.push("/ayarlar/kullanicilar");
      router.refresh();
    }
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      <FormInput
        name="name"
        label={t("name")}
        control={form.control}
        isRequired
      />
      <FormInput
        name="email"
        label={t("email")}
        control={form.control}
        type="email"
        isRequired
      />
      <FormSelect
        name="role"
        label={t("role")}
        control={form.control}
        options={roleOptions}
        isRequired
      />
      <RolePermissionsPreview role={selectedRole} />
      <FormSwitch
        name="isActive"
        label={t("isActive")}
        control={form.control}
        description={t("isActiveHint")}
      />
      <FormErrorSummary message={formError} />
      <div className="flex items-center gap-2">
        <SubmitButton isSubmitting={form.formState.isSubmitting}>
          {tCommon("save")}
        </SubmitButton>
        <Button
          onPress={() =>
            closeDrawer ? closeDrawer() : router.push("/ayarlar/kullanicilar")
          }
          variant={actionVariant("default", "light")}
        >
          {tCommon("cancel")}
        </Button>
      </div>
    </form>
  );
}

/** Sayfa düzeyinde kart sarmalayıcı (create/edit view'lar ortak kullanır). */
export function UserFormCard({ children }: { children: React.ReactNode }) {
  return <FormSurface className="max-w-2xl">{children}</FormSurface>;
}
