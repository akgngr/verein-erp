"use client";

import { addToast, Button, Input } from "@heroui/react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { createWorkflowAction } from "../actions/workflow-actions";

export function WorkflowCreateForm() {
  const t = useTranslations("automation.workflows");
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  const create = () => startTransition(async () => {
    const response = await createWorkflowAction({ name });
    if (!response.ok) return void addToast({ title: response.error, color: "danger" });
    router.push(`/automation/workflows/${response.data.id}`);
  });

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-large border border-default-200 bg-content1 p-4">
      <Input label={t("name")} size="sm" className="max-w-sm" value={name} onValueChange={setName} />
      <Button color="primary" isLoading={pending} isDisabled={name.trim().length < 2} startContent={<Plus className="h-4 w-4" />} onPress={create}>
        {t("create")}
      </Button>
    </div>
  );
}
