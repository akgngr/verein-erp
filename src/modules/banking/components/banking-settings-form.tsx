"use client";

import { notify } from "@/shared/components/ui/notify";import { Button } from "@heroui/react";
import { Input, Label, Select, Spinner, TextField } from "@/shared/components/kit";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { saveBankingSettingsAction } from "../actions/banking-actions";

/** Sağlayıcı ve anahtarlar. Kayıtlı anahtarlar ekrana geri gelmez; boş bırakılırsa değişmez. */
export function BankingSettingsForm({
  provider,
  hasCredentials,
  mockAllowed,
}: {
  provider: string;
  hasCredentials: boolean;
  mockAllowed: boolean;
}) {
  const t = useTranslations("banking.settings");
  const router = useRouter();
  const [value, setValue] = useState(provider);
  const [secretId, setSecretId] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [pending, setPending] = useState(false);

  const save = async () => {
    setPending(true);
    const response = await saveBankingSettingsAction({
      provider: value,
      secretId,
      secretKey,
    });
    setPending(false);
    if (!response.ok) return void notify.error(response.error);
    setSecretId("");
    setSecretKey("");
    notify.success(t("saved"));
    router.refresh();
  };

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Select
        className="md:col-span-2"
        value={value}
        onChange={(selectedValue) => {
          const keys =
            selectedValue === null ? undefined : String(selectedValue);
          const key = keys;
          if (typeof key === "string") setValue(key);
        }}
      >
        <Label>{t("provider")}</Label>
            {[
              <Select.Item
                key="GOCARDLESS"
                id={"GOCARDLESS"}
                textValue={String(t("providers.GOCARDLESS"))}
              >
                <Label>{t("providers.GOCARDLESS")}</Label>
              </Select.Item>,
              ...(mockAllowed
                ? [
                    <Select.Item
                      key="MOCK"
                      id={"MOCK"}
                      textValue={String(t("providers.MOCK"))}
                    >
                      <Label>{t("providers.MOCK")}</Label>
                    </Select.Item>,
                  ]
                : []),
            ]}
      </Select>
      {value === "GOCARDLESS" ? (
        <>
          <TextField
            value={secretId}
            onChange={setSecretId}
            className={["w-full"].filter(Boolean).join(" ")}
          >
            <Label>{t("secretId")}</Label>
            <Input
              type="password"
              autoComplete="off"
              placeholder={hasCredentials ? t("storedPlaceholder") : ""}
            />
          </TextField>
          <TextField
            value={secretKey}
            onChange={setSecretKey}
            className={["w-full"].filter(Boolean).join(" ")}
          >
            <Label>{t("secretKey")}</Label>
            <Input
              type="password"
              autoComplete="off"
              placeholder={hasCredentials ? t("storedPlaceholder") : ""}
            />
          </TextField>
          <p className="text-xs text-ink-500 md:col-span-2">{t("help")}</p>
        </>
      ) : (
        <p className="text-xs text-warning-600 md:col-span-2">
          {t("mockHelp")}
        </p>
      )}
      <div className="md:col-span-2">
        <Button
          onPress={save}
          variant={actionVariant("primary", "solid")}
          isPending={pending}
        >
          {pending ? <Spinner size="sm" tone="current" /> : null}
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
