"use client";

import { addToast, Button, Input, Select, SelectItem } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { saveBankingSettingsAction } from "../actions/banking-actions";

/** Sağlayıcı ve anahtarlar. Kayıtlı anahtarlar ekrana geri gelmez; boş bırakılırsa değişmez. */
export function BankingSettingsForm({ provider, hasCredentials, mockAllowed }: { provider: string; hasCredentials: boolean; mockAllowed: boolean }) {
  const t = useTranslations("banking.settings");
  const router = useRouter();
  const [value, setValue] = useState(provider);
  const [secretId, setSecretId] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [pending, setPending] = useState(false);

  const save = async () => {
    setPending(true);
    const response = await saveBankingSettingsAction({ provider: value, secretId, secretKey });
    setPending(false);
    if (!response.ok) return void addToast({ title: response.error, color: "danger" });
    setSecretId("");
    setSecretKey("");
    addToast({ title: t("saved"), color: "success" });
    router.refresh();
  };

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Select
        label={t("provider")}
        labelPlacement="outside"
        selectedKeys={[value]}
        onSelectionChange={(keys) => {
          const key = Array.from(keys)[0];
          if (typeof key === "string") setValue(key);
        }}
        className="md:col-span-2"
      >
        {[
          <SelectItem key="GOCARDLESS">{t("providers.GOCARDLESS")}</SelectItem>,
          ...(mockAllowed ? [<SelectItem key="MOCK">{t("providers.MOCK")}</SelectItem>] : []),
        ]}
      </Select>
      {value === "GOCARDLESS" ? (
        <>
          <Input
            type="password"
            autoComplete="off"
            label={t("secretId")}
            labelPlacement="outside"
            placeholder={hasCredentials ? t("storedPlaceholder") : ""}
            value={secretId}
            onValueChange={setSecretId}
          />
          <Input
            type="password"
            autoComplete="off"
            label={t("secretKey")}
            labelPlacement="outside"
            placeholder={hasCredentials ? t("storedPlaceholder") : ""}
            value={secretKey}
            onValueChange={setSecretKey}
          />
          <p className="text-tiny text-default-500 md:col-span-2">{t("help")}</p>
        </>
      ) : (
        <p className="text-tiny text-warning-600 md:col-span-2">{t("mockHelp")}</p>
      )}
      <div className="md:col-span-2">
        <Button color="primary" isLoading={pending} onPress={save}>
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
