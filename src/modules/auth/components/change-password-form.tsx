"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { addToast } from "@heroui/react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { applyActionResult } from "@/shared/components/forms/action-result"
import { FormErrorSummary } from "@/shared/components/forms/form-error-summary"
import { FormPasswordInput } from "@/shared/components/forms/form-password-input"
import { SubmitButton } from "@/shared/components/forms/submit-button"

import { changePasswordAction } from "../actions/change-password"
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "../schemas/change-password"

export function ChangePasswordForm() {
  const t = useTranslations("auth.profile")
  const tValidation = useTranslations("validation")
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    const result = await changePasswordAction(values)
    if (!result.ok) {
      setFormError(applyActionResult(result, form.setError))
      return
    }
    form.reset()
    addToast({ title: t("updated"), color: "success" })
    router.push("/")
    router.refresh()
  })

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      <FormPasswordInput
        name="currentPassword"
        label={t("currentPassword")}
        control={form.control}
        autoComplete="current-password"
        isRequired
      />
      <FormPasswordInput
        name="newPassword"
        label={t("newPassword")}
        control={form.control}
        isRequired
        description={tValidation("passwordHint")}
      />
      <FormErrorSummary message={formError} />
      <SubmitButton isSubmitting={form.formState.isSubmitting}>
        {t("submit")}
      </SubmitButton>
    </form>
  )
}
