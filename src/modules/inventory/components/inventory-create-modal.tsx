"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { removeSearchParam } from "../helpers/inventory-helpers";
import { InventoryFormModal } from "./inventory-form-modal";

interface InventoryCreateModalProps {
  isOpen: boolean;
}

/** Opens the create form for `?yeni` (legacy `?action=new`) and removes the param on close. */
export function InventoryCreateModal({ isOpen }: InventoryCreateModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleClose = () => {
    const query = removeSearchParam(removeSearchParam(searchParams.toString(), "action"), "yeni");
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return <InventoryFormModal isOpen={isOpen} onClose={handleClose} />;
}
