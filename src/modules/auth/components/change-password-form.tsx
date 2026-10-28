"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { addToast } from "@heroui/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { applyActionResult } from "@/shared/components/forms/action-result"
import { FormErrorSummary } from "@/shared/components/forms/form-error-summary"
import { FormInput } from "@/shared/components/forms/form-input"
import { SubmitButton } from "@/shared/components/forms/submit-button"

import { changePasswordAction } from "../actions/change-password"
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "../schemas/change-password"

export function ChangePasswordForm() {
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
    addToast({ title: "Parolanız güncellendi.", color: "success" })
    router.push("/")
    router.refresh()
  })

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      <FormInput
        name="currentPassword"
        label="Mevcut parola"
        control={form.control}
        type="password"
        autoComplete="current-password"
        isRequired
      />
      <FormInput
        name="newPassword"
        label="Yeni parola"
        control={form.control}
        type="password"
        autoComplete="new-password"
        isRequired
        description="En az 10 karakter; 1 büyük harf, 1 küçük harf ve 1 rakam içermelidir."
      />
      <FormErrorSummary message={formError} />
      <SubmitButton isSubmitting={form.formState.isSubmitting}>
        Parolayı güncelle
      </SubmitButton>
    </form>
  )
}
