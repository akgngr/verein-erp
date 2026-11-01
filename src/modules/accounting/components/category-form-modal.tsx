"use client";

import { Button, Input, Modal, Switch, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem, Textarea, addToast } from "@heroui/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import type { CategoryDirection, Sphere } from "@prisma/client";

import { createCategoryAction, updateCategoryAction } from "../actions/category-actions";
import { SKR_SUGGESTIONS, type ChartOfAccounts } from "../services/skr";
import { TAX_RATES } from "../services/tax";

const DIRECTIONS: CategoryDirection[] = ["INCOME", "EXPENSE"];
const SPHERES: Sphere[] = ["IDEELL", "ASSET_MANAGEMENT", "PURPOSE_OPERATION", "ECONOMIC_OPERATION"];

type CategoryRow = {
  id: string;
  name: string;
  direction: string;
  sphere: string;
  helpText: string | null;
  isActive: boolean;
  accountNumber?: string | null;
  defaultTaxRate?: number;
  isAsset?: boolean;
};

/** Kategori oluştur/düzenle modalı (§ 11.4): yön/alan fişli kategoride kilitli. */
export function CategoryFormModal({
  isOpen,
  onOpenChange,
  category,
  chart = "SKR03",
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  category?: CategoryRow | null;
  chart?: ChartOfAccounts;
}) {
  const tCommon = useTranslations("common");
  const t = useTranslations("accounting.setup.categories");
  const tBudget = useTranslations("accounting.budget");
  const router = useRouter();
  const [name, setName] = useState(category?.name ?? "");
  const [direction, setDirection] = useState<CategoryDirection>(
    (category?.direction as CategoryDirection) ?? "INCOME",
  );
  const [sphere, setSphere] = useState<Sphere>((category?.sphere as Sphere) ?? "IDEELL");
  const [helpText, setHelpText] = useState(category?.helpText ?? "");
  const [accountNumber, setAccountNumber] = useState(category?.accountNumber ?? "");
  const [defaultTaxRate, setDefaultTaxRate] = useState(String(category?.defaultTaxRate ?? 0));
  const [isAsset, setIsAsset] = useState(category?.isAsset ?? false);
  const [busy, setBusy] = useState(false);
  const tSkr = useTranslations("accounting.setup.skr");
  const suggestions = SKR_SUGGESTIONS[chart][direction === "INCOME" ? "income" : "expense"];

  const sphereLabel = (value: Sphere) => {
    const rawKey = `sphere${value}`;
    if (tBudget.has(rawKey)) return tBudget(rawKey);
    const camel = `sphere${value.charAt(0)}${value.slice(1).toLowerCase()}`;
    if (tBudget.has(camel)) return tBudget(camel);
    return value;
  };

  const submit = async () => {
    setBusy(true);
    try {
      const result = category
        ? await updateCategoryAction({
            id: category.id,
            name,
            direction,
            sphere,
            helpText: helpText || undefined,
            isActive: category.isActive,
            accountNumber,
            defaultTaxRate,
            isAsset: direction === "EXPENSE" && isAsset,
          })
        : await createCategoryAction({
            name,
            direction,
            sphere,
            helpText: helpText || undefined,
            accountNumber,
            defaultTaxRate,
            isAsset: direction === "EXPENSE" && isAsset,
          });
      if (!result.ok) {
        addToast({ title: result.error, color: "danger" });
        return;
      }
      addToast({ title: t("saved"), color: "success" });
      onOpenChange(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="md">
      <ModalContent>
        <ModalHeader>{category ? t("edit") : t("new")}</ModalHeader>
        <ModalBody className="gap-4">
          <Input
            label={t("name")}
            labelPlacement="outside"
            value={name}
            onValueChange={setName}
            isRequired
            maxLength={150}
          />
          <Select
            label={t("direction")}
            labelPlacement="outside"
            selectedKeys={[direction]}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0] as CategoryDirection | undefined;
              if (key) setDirection(key);
            }}
          >
            {DIRECTIONS.map((value) => (
              <SelectItem key={value}>{t(`direction${value}`)}</SelectItem>
            ))}
          </Select>
          <Select
            label={t("sphere")}
            labelPlacement="outside"
            selectedKeys={[sphere]}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0] as Sphere | undefined;
              if (key) setSphere(key);
            }}
          >
            {SPHERES.map((value) => (
              <SelectItem key={value}>{sphereLabel(value)}</SelectItem>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t("accountNumber")}
              labelPlacement="outside"
              value={accountNumber}
              onValueChange={setAccountNumber}
              inputMode="numeric"
              maxLength={8}
              placeholder={suggestions[0]?.number}
              description={chart}
            />
            <Select
              label={t("defaultTaxRate")}
              labelPlacement="outside"
              selectedKeys={[defaultTaxRate]}
              onSelectionChange={(keys) => {
                const key = Array.from(keys)[0];
                if (key !== undefined) setDefaultTaxRate(String(key));
              }}
            >
              {TAX_RATES.map((rate) => (
                <SelectItem key={String(rate)}>{`${rate} %`}</SelectItem>
              ))}
            </Select>
          </div>
          {direction === "EXPENSE" ? (
            <Switch size="sm" isSelected={isAsset} onValueChange={setIsAsset}>
              <span className="flex flex-col">
                <span className="text-small">{t("isAsset")}</span>
                <span className="text-tiny text-default-500">{t("isAssetHint")}</span>
              </span>
            </Switch>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((suggestion) => (
              <Button
                key={suggestion.number}
                size="sm"
                variant={accountNumber === suggestion.number ? "solid" : "flat"}
                color={accountNumber === suggestion.number ? "primary" : "default"}
                onPress={() => {
                  setAccountNumber(suggestion.number);
                  if (suggestion.taxRate !== undefined) setDefaultTaxRate(String(suggestion.taxRate));
                }}
              >
                {`${suggestion.number} · ${tSkr(suggestion.key)}`}
              </Button>
            ))}
          </div>
          <Textarea
            label={t("helpText")}
            labelPlacement="outside"
            value={helpText}
            onValueChange={setHelpText}
            maxLength={500}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={() => onOpenChange(false)}>
            {tCommon("cancel")}
          </Button>
          <Button color="primary" onPress={submit} isLoading={busy} isDisabled={name.trim().length < 2}>
            {category ? t("edit") : t("new")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
