"use client";

import Link from "next/link";
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
  // #603: second step — shown once the server reports that this account has two-factor sign-in turned on.
  const [needsSecondFactor, setNeedsSecondFactor] = useState(false);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", otp: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const result = await loginAction(needsSecondFactor ? values : { ...values, otp: undefined });
    if (!result.ok) {
      if (result.error === "auth.errors.twoFactorRequired") {
        setNeedsSecondFactor(true);
        form.setValue("otp", "");
        setTimeout(() => form.setFocus("otp"), 0);
        return;
      }
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
        isDisabled={needsSecondFactor}
      />
      {needsSecondFactor ? (
        <div className="flex flex-col gap-1">
          <FormInput
            name="otp"
            label={t("twoFactorCode")}
            control={form.control}
            autoComplete="one-time-code"
            isRequired
          />
          <p className="text-xs text-ink-500">{t("twoFactorCodeHint")}</p>
          <button
            type="button"
            className="self-start text-xs text-ink-500 hover:text-foreground hover:underline"
            onClick={() => { setNeedsSecondFactor(false); form.setValue("otp", ""); setFormError(null); }}
          >
            {t("twoFactorBack")}
          </button>
        </div>
      ) : null}
      <FormErrorSummary message={formError} />
      <SubmitButton isSubmitting={form.formState.isSubmitting}>{t("loginButton")}</SubmitButton>
      {/* #603: Self-service password reset. */}
      <Link href="/sifremi-unuttum" className="self-center text-sm text-ink-500 hover:text-foreground hover:underline">
        {t("forgotPassword")}
      </Link>
    </form>
  );
}
