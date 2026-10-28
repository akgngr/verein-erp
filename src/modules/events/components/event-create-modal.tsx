"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { EventFormModal } from "./event-form-modal";

interface EventCreateModalProps {
  isOpen: boolean;
}

export function EventCreateModal({ isOpen }: EventCreateModalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (!isOpen) return null;

  const handleClose = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("action");
    const query = params.toString();
    router.push(query ? `/events?${query}` : "/events");
  };

  return <EventFormModal isOpen={isOpen} onClose={handleClose} />;
}
