"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addToast, Button, Card, CardBody } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { applyActionResult } from "@/shared/components/forms/action-result";
import { FormErrorSummary } from "@/shared/components/forms/form-error-summary";
import { FormInput } from "@/shared/components/forms/form-input";
import { FormSelect } from "@/shared/components/forms/form-select";
import { FormSwitch } from "@/shared/components/forms/form-switch";
import { SubmitButton } from "@/shared/components/forms/submit-button";
import { ROLES, type Role } from "@/shared/roles";

import { createUserAction } from "../actions/create-user";
import { updateUserAction } from "../actions/update-user";
import { RolePermissionsPreview } from "./role-permissions-matrix";
import {
  userCreateSchema,
  userUpdateSchema,
  type UserCreateInput,
  type UserUpdateInput,
} from "../schemas/user";

function useRoleSelectOptions() {
  const tRoles = useTranslations("roles");
  return ROLES.map((role) => ({ value: role as string, label: tRoles(role) }));
}

/** Yeni kullanıcı formu (11.1). */
export function UserCreateForm() {
  const t = useTranslations("users.form");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const roleOptions = useRoleSelectOptions();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<UserCreateInput>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: { name: "", email: "", role: "VIEWER", password: "" },
  });

  const selectedRole = (form.watch("role") as Role) || "VIEWER";

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const result = await createUserAction(values);
    if (!result.ok) {
      setFormError(applyActionResult(result, form.setError));
      return;
    }
    addToast({ title: t("created"), color: "success" });
    router.push(`/ayarlar/kullanicilar/${result.data.id}`);
    router.refresh();
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      <FormInput name="name" label={t("name")} control={form.control} isRequired />
      <FormInput
        name="email"
        label={t("email")}
        control={form.control}
        type="email"
        isRequired
        placeholder={tCommon("emailPlaceholder")}
      />
      <FormSelect name="role" label={t("role")} control={form.control} options={roleOptions} isRequired />
      <RolePermissionsPreview role={selectedRole} />
      <FormInput
        name="password"
        label={t("tempPassword")}
        control={form.control}
        type="password"
        autoComplete="new-password"
        isRequired
        description={t("tempPasswordHint")}
      />
      <FormErrorSummary message={formError} />
      <div className="flex items-center gap-2">
        <SubmitButton isSubmitting={form.formState.isSubmitting}>{tCommon("create")}</SubmitButton>
        <Button variant="light" onPress={() => router.push("/ayarlar/kullanicilar")}>
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
  role: "ADMIN" | "BOARD" | "SECRETARY" | "VIEWER" | "TREASURER" | "AUDITOR";
  isActive: boolean;
};

/** Düzenleme formu (11.1): ad, e-posta, rol, aktif/pasif. Parola sıfırlama ayrı eylemdir. */
export function UserEditForm({ user }: { user: UserEditValues }) {
  const t = useTranslations("users.form");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const roleOptions = useRoleSelectOptions();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<UserUpdateInput>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: { name: user.name, email: user.email, role: user.role, isActive: user.isActive },
  });

  const selectedRole = (form.watch("role") as Role) || user.role;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const result = await updateUserAction({ id: user.id, ...values });
    if (!result.ok) {
      setFormError(applyActionResult(result, form.setError));
      return;
    }
    addToast({ title: t("updated"), color: "success" });
    router.push("/ayarlar/kullanicilar");
    router.refresh();
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      <FormInput name="name" label={t("name")} control={form.control} isRequired />
      <FormInput name="email" label={t("email")} control={form.control} type="email" isRequired />
      <FormSelect name="role" label={t("role")} control={form.control} options={roleOptions} isRequired />
      <RolePermissionsPreview role={selectedRole} />
      <FormSwitch
        name="isActive"
        label={t("isActive")}
        control={form.control}
        description={t("isActiveHint")}
      />
      <FormErrorSummary message={formError} />
      <div className="flex items-center gap-2">
        <SubmitButton isSubmitting={form.formState.isSubmitting}>{tCommon("save")}</SubmitButton>
        <Button variant="light" onPress={() => router.push("/ayarlar/kullanicilar")}>
          {tCommon("cancel")}
        </Button>
      </div>
    </form>
  );
}

/** Sayfa düzeyinde kart sarmalayıcı (create/edit view'lar ortak kullanır). */
export function UserFormCard({ children }: { children: React.ReactNode }) {
  return (
    <Card shadow="sm" className="max-w-2xl">
      <CardBody className="gap-2 p-6">{children}</CardBody>
    </Card>
  );
}
