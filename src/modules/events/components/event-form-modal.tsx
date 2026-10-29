"use client"

import { useTranslations } from "next-intl";

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
  Checkbox,
  addToast,
} from "@heroui/react"
import { ChevronDown } from "lucide-react"
import { EVENT_TYPES, EVENT_STATUSES } from "../constants"
import { createEventAction, updateEventAction } from "../actions/event-actions"
import type { EventRow, EventType, EventStatus } from "../types"

interface EventFormModalProps {
  isOpen: boolean
  onClose: () => void
  eventToEdit?: EventRow | null
}

export function EventFormModal({
  isOpen,
  onClose,
  eventToEdit,
}: EventFormModalProps) {
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("events.status");
  const tTypes = useTranslations("events.types");
  const tFields = useTranslations("events.fields");
  const tForm = useTranslations("events.form");
  const router = useRouter()
  const isEditing = Boolean(eventToEdit)

  const [title, setTitle] = useState(eventToEdit?.title ?? "")
  const [description, setDescription] = useState(eventToEdit?.description ?? "")
  const [type, setType] = useState<EventType>(eventToEdit?.type ?? "OTHER")
  const [status, setStatus] = useState<EventStatus>(
    eventToEdit?.status ?? "PUBLISHED",
  )
  const [startDate, setStartDate] = useState(
    eventToEdit?.startDate
      ? new Date(eventToEdit.startDate).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
  )
  const [endDate, setEndDate] = useState(
    eventToEdit?.endDate
      ? new Date(eventToEdit.endDate).toISOString().slice(0, 16)
      : "",
  )
  const [location, setLocation] = useState(eventToEdit?.location ?? "")
  const [isOnline, setIsOnline] = useState(eventToEdit?.isOnline ?? false)
  const [onlineUrl, setOnlineUrl] = useState(eventToEdit?.onlineUrl ?? "")
  const [capacity, setCapacity] = useState<string>(
    eventToEdit?.capacity ? String(eventToEdit.capacity) : "",
  )

  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setLoading(true)

    try {
      if (isEditing && eventToEdit) {
        const res = await updateEventAction({
          id: eventToEdit.id,
          title,
          description: description || null,
          type,
          status,
          startDate,
          endDate: endDate || null,
          location: location || null,
          isOnline,
          onlineUrl: isOnline && onlineUrl ? onlineUrl : null,
          capacity: capacity ? parseInt(capacity, 10) : null,
        })

        if (!res.success) {
          setErrorMessage(res.error ?? "Güncelleme başarısız oldu.")
          setLoading(false)
          return
        }
      } else {
        const res = await createEventAction({
          title,
          description: description || null,
          type,
          status,
          startDate,
          endDate: endDate || null,
          location: location || null,
          isOnline,
          onlineUrl: isOnline && onlineUrl ? onlineUrl : null,
          capacity: capacity ? parseInt(capacity, 10) : null,
        })

        if (!res.success) {
          setErrorMessage(res.error ?? tForm("createFailed"))
          setLoading(false)
          return
        }
      }

      if (isEditing) {
        addToast({ title: tForm("updatedToast"), color: "success" })
      } else {
        addToast({ title: tForm("createdToast"), color: "success" })
      }

      onClose()
      router.refresh()
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : tForm("genericError"),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onClose}
      size="2xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        {() => (
          <form onSubmit={handleSubmit}>
            <ModalHeader className="flex flex-col gap-1">
              <span className="text-lg font-semibold text-foreground">
                {isEditing ? tForm("editTitle") : tForm("createTitle")}
              </span>
              <span className="text-xs text-default-500 font-normal">
                Dernek içi seminer, atölye veya sosyal etkinlik bilgilerini
                belirleyin.
              </span>
            </ModalHeader>

            <ModalBody className="gap-4">
              {errorMessage && (
                <div className="p-3 text-xs rounded-medium bg-danger-50 text-danger-600 border border-danger-200">
                  {errorMessage}
                </div>
              )}

              <Input
                label={tFields("title")}
                placeholder={tForm("titlePlaceholder")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                isRequired
                variant="bordered"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-foreground">
                    {tFields("type")}
                  </label>
                  <div className="relative inline-block w-full">
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as EventType)}
                      className="h-10 w-full appearance-none rounded-medium bg-default-100 px-3 pr-8 text-sm text-foreground transition-colors hover:bg-default-200 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer border border-transparent focus:border-primary/50"
                    >
                      {EVENT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {tTypes(t.value)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-default-400" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-foreground">
                    {tForm("publishStatus")}
                  </label>
                  <div className="relative inline-block w-full">
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as EventStatus)}
                      className="h-10 w-full appearance-none rounded-medium bg-default-100 px-3 pr-8 text-sm text-foreground transition-colors hover:bg-default-200 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer border border-transparent focus:border-primary/50"
                    >
                      {EVENT_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {tStatus(s.value)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-default-400" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label={tFields("startDate")}
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  isRequired
                  variant="bordered"
                />

                <Input
                  label={tForm("endOptional")}
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  variant="bordered"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Checkbox
                  isSelected={isOnline}
                  onValueChange={setIsOnline}
                  size="sm"
                >
                  {tForm("isOnlineLabel")}
                </Checkbox>

                {isOnline ? (
                  <Input
                    label={tForm("onlineUrl")}
                    placeholder={tForm("onlineUrlPlaceholder")}
                    value={onlineUrl}
                    onChange={(e) => setOnlineUrl(e.target.value)}
                    variant="bordered"
                  />
                ) : (
                  <Input
                    label={tForm("physicalLocation")}
                    placeholder={tForm("locationPlaceholder")}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    variant="bordered"
                  />
                )}
              </div>

              <Input
                label={tForm("capacityOptional")}
                type="number"
                min="1"
                placeholder={tForm("capacityPlaceholder")}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                variant="bordered"
              />

              <Textarea
                label={tForm("descriptionLabel")}
                placeholder={tForm("descriptionPlaceholder")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                minRows={3}
                variant="bordered"
              />
            </ModalBody>

            <ModalFooter>
              <Button variant="flat" onPress={onClose} isDisabled={loading}>
                {tCommon("cancel")}
              </Button>
              <Button color="primary" type="submit" isLoading={loading}>
                {isEditing ? tForm("saveChanges") : tForm("create")}
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  )
}
