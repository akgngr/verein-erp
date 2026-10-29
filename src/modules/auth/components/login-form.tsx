"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { applyActionResult } from "@/shared/components/forms/action-result";
import { FormErrorSummary } from "@/shared/components/forms/form-error-summary";
import { FormInput } from "@/shared/components/forms/form-input";
import { SubmitButton } from "@/shared/components/forms/submit-button";

import { loginAction } from "../actions/login";
import { loginSchema, type LoginInput } from "../schemas/login";

export function LoginForm() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const result = await loginAction(values);
    if (!result.ok) {
      setFormError(applyActionResult(result, form.setError));
      return;
    }
    // Başarıda loginAction "/" adresine yönlendirir; buraya normalde gelinmez.
    router.push("/");
    router.refresh();
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      <FormInput
        name="email"
        label={t("email")}
        control={form.control}
        type="email"
        autoComplete="email"
        isRequired
        placeholder={tCommon("emailPlaceholder")}
      />
      <FormInput
        name="password"
        label={t("password")}
        control={form.control}
        type="password"
        autoComplete="current-password"
        isRequired
      />
      <FormErrorSummary message={formError} />
      <SubmitButton isSubmitting={form.formState.isSubmitting}>{t("loginButton")}</SubmitButton>
    </form>
  );
}
