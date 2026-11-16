"use client";
import {
  toast,
  Button,
  Spinner,
  Modal,
  Switch,
  Label,
  TextField,
  Input,
  Description,
  TextArea,
  Select,
  ListBox,
} from "@heroui/react";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import type { CategoryDirection, Sphere } from "@prisma/client";

import {
  createCategoryAction,
  updateCategoryAction,
} from "../actions/category-actions";
import { SKR_SUGGESTIONS, type ChartOfAccounts } from "../services/skr";
import { TAX_RATES } from "../services/tax";

const DIRECTIONS: CategoryDirection[] = ["INCOME", "EXPENSE"];
const SPHERES: Sphere[] = [
  "IDEELL",
  "ASSET_MANAGEMENT",
  "PURPOSE_OPERATION",
  "ECONOMIC_OPERATION",
];

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
  const [sphere, setSphere] = useState<Sphere>(
    (category?.sphere as Sphere) ?? "IDEELL",
  );
  const [helpText, setHelpText] = useState(category?.helpText ?? "");
  const [accountNumber, setAccountNumber] = useState(
    category?.accountNumber ?? "",
  );
  const [defaultTaxRate, setDefaultTaxRate] = useState(
    String(category?.defaultTaxRate ?? 0),
  );
  const [isAsset, setIsAsset] = useState(category?.isAsset ?? false);
  const [busy, setBusy] = useState(false);
  const tSkr = useTranslations("accounting.setup.skr");
  const suggestions =
    SKR_SUGGESTIONS[chart][direction === "INCOME" ? "income" : "expense"];

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
        toast(result.error, { variant: "danger" });
        return;
      }
      toast(t("saved"), { variant: "success" });
      onOpenChange(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog className={"w-full max-w-md "}>
            <DialogDismissButton />

            <Modal.Header>
              <Modal.Heading className="flex items-center gap-2">
                {category ? t("edit") : t("new")}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="gap-4">
              <TextField
                value={name}
                isRequired
                onChange={setName}
                className={["w-full"].filter(Boolean).join(" ")}
              >
                <Label>{t("name")}</Label>
                <Input maxLength={150} />
              </TextField>
              <Select
                value={direction}
                onChange={(selectedValue) => {
                  const keys =
                    selectedValue === null ? undefined : String(selectedValue);
                  const key = keys as CategoryDirection | undefined;
                  if (key) setDirection(key);
                }}
              >
                <Label>{t("direction")}</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {DIRECTIONS.map((value) => (
                      <ListBox.Item
                        key={value}
                        id={value}
                        textValue={String(t(`direction${value}`))}
                      >
                        <Label>{t(`direction${value}`)}</Label>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              <Select
                value={sphere}
                onChange={(selectedValue) => {
                  const keys =
                    selectedValue === null ? undefined : String(selectedValue);
                  const key = keys as Sphere | undefined;
                  if (key) setSphere(key);
                }}
              >
                <Label>{t("sphere")}</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {SPHERES.map((value) => (
                      <ListBox.Item
                        key={value}
                        id={value}
                        textValue={String(sphereLabel(value))}
                      >
                        <Label>{sphereLabel(value)}</Label>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  value={accountNumber}
                  onChange={setAccountNumber}
                  className={["w-full"].filter(Boolean).join(" ")}
                >
                  <Label>{t("accountNumber")}</Label>
                  <Input
                    inputMode="numeric"
                    maxLength={8}
                    placeholder={suggestions[0]?.number}
                  />
                  <Description>{chart}</Description>
                </TextField>
                <Select
                  value={defaultTaxRate}
                  onChange={(selectedValue) => {
                    const keys =
                      selectedValue === null
                        ? undefined
                        : String(selectedValue);
                    const key = keys;
                    if (key !== undefined) setDefaultTaxRate(String(key));
                  }}
                >
                  <Label>{t("defaultTaxRate")}</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {TAX_RATES.map((rate) => (
                        <ListBox.Item
                          key={String(rate)}
                          id={String(rate)}
                          textValue={String(`${rate} %`)}
                        >
                          <Label>{`${rate} %`}</Label>
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>
              {direction === "EXPENSE" ? (
                <Switch isSelected={isAsset} onChange={setIsAsset} size={"sm"}>
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                    <Label>
                      <span className="flex flex-col">
                        <span className="text-sm">{t("isAsset")}</span>
                        <span className="text-xs text-ink-500">
                          {t("isAssetHint")}
                        </span>
                      </span>
                    </Label>
                  </Switch.Content>
                </Switch>
              ) : null}
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((suggestion) => (
                  <Button
                    key={suggestion.number}
                    size="sm"
                    onPress={() => {
                      setAccountNumber(suggestion.number);
                      if (suggestion.taxRate !== undefined)
                        setDefaultTaxRate(String(suggestion.taxRate));
                    }}
                    variant={actionVariant(
                      accountNumber === suggestion.number
                        ? "primary"
                        : "default",
                      accountNumber === suggestion.number ? "solid" : "flat",
                    )}
                  >
                    {`${suggestion.number} · ${tSkr(suggestion.key)}`}
                  </Button>
                ))}
              </div>
              <TextField
                value={helpText}
                onChange={setHelpText}
                className={["w-full"].filter(Boolean).join(" ")}
              >
                <Label>{t("helpText")}</Label>
                <TextArea
                  maxLength={500}
                  rows={3}
                  className={["[field-sizing:content]"]
                    .filter(Boolean)
                    .join(" ")}
                />
              </TextField>
            </Modal.Body>
            <Modal.Footer>
              <Button
                onPress={() => onOpenChange(false)}
                variant={actionVariant("default", "flat")}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                onPress={submit}
                isDisabled={name.trim().length < 2}
                variant={actionVariant("primary", "solid")}
                isPending={busy}
              >
                {busy ? <Spinner size="sm" color="current" /> : null}
                {category ? t("edit") : t("new")}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
