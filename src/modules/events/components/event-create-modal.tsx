"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { EventFormModal } from "./event-form-modal"

interface EventCreateModalProps {
  isOpen: boolean
}

export function EventCreateModal({ isOpen }: EventCreateModalProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleClose = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("action")
    params.delete("yeni")
    const newQuery = params.toString()
    router.replace(newQuery ? `/events?${newQuery}` : "/events")
  }

  return <EventFormModal isOpen={isOpen} onClose={handleClose} />
}
