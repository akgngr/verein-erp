"use client";

import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem, Textarea, addToast } from "@heroui/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import type { CategoryDirection, Sphere } from "@prisma/client";

import { createCategoryAction, updateCategoryAction } from "../actions/category-actions";

const DIRECTIONS: CategoryDirection[] = ["INCOME", "EXPENSE"];
const SPHERES: Sphere[] = ["IDEELL", "ASSET_MANAGEMENT", "PURPOSE_OPERATION", "ECONOMIC_OPERATION"];

type CategoryRow = {
  id: string;
  name: string;
  direction: string;
  sphere: string;
  helpText: string | null;
  isActive: boolean;
};

/** Kategori oluştur/düzenle modalı (§ 11.4): yön/alan fişli kategoride kilitli. */
export function CategoryFormModal({
  isOpen,
  onOpenChange,
  category,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  category?: CategoryRow | null;
}) {
  const t = useTranslations("accounting.setup.categories");
  const tBudget = useTranslations("accounting.budget");
  const router = useRouter();
  const [name, setName] = useState(category?.name ?? "");
  const [direction, setDirection] = useState<CategoryDirection>(
    (category?.direction as CategoryDirection) ?? "INCOME",
  );
  const [sphere, setSphere] = useState<Sphere>((category?.sphere as Sphere) ?? "IDEELL");
  const [helpText, setHelpText] = useState(category?.helpText ?? "");
  const [busy, setBusy] = useState(false);

  const sphereLabel = (value: Sphere) =>
    tBudget(`sphere${value.charAt(0)}${value.slice(1).toLowerCase()}`);

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
          })
        : await createCategoryAction({
            name,
            direction,
            sphere,
            helpText: helpText || undefined,
          });
      if (!result.ok) {
        addToast({ title: result.error, color: "danger" });
        return;
      }
      addToast({ title: "✓", color: "success" });
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
          <Input label={t("name")} value={name} onValueChange={setName} isRequired maxLength={150} />
          <Select
            id="category-direction"
            label={t("direction")}
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
            id="category-sphere"
            label={t("sphere")}
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
          <Textarea label={t("helpText")} value={helpText} onValueChange={setHelpText} maxLength={500} />
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button color="primary" onPress={submit} isLoading={busy} isDisabled={name.trim().length < 2}>
            {category ? t("edit") : t("new")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
