"use client";

import { addToast, Button, Input, Modal, ModalBody, ModalContent, ModalHeader, Spinner } from "@heroui/react";
import { Landmark, Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { listInstitutionsAction, startBankConnectionAction } from "../actions/banking-actions";
import type { Institution } from "../services/providers/types";

/** Banka seçimi → sağlayıcı onay sayfasına yönlendirme (banka giriş bilgileri bu uygulamaya gelmez). */
export function ConnectBankButton({ disabled }: { disabled: boolean }) {
  const t = useTranslations("banking.connect");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [query, setQuery] = useState("");
  const [starting, setStarting] = useState<string | null>(null);

  const load = async () => {
    setOpen(true);
    if (institutions.length) return;
    setLoading(true);
    const response = await listInstitutionsAction({ country: "DE" });
    setLoading(false);
    if (!response.ok) {
      setOpen(false);
      return void addToast({ title: response.error, color: "danger" });
    }
    setInstitutions(response.data);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return (q ? institutions.filter((row) => row.name.toLocaleLowerCase().includes(q) || row.bic?.toLowerCase().includes(q)) : institutions).slice(0, 60);
  }, [institutions, query]);

  const start = async (institution: Institution) => {
    setStarting(institution.id);
    const response = await startBankConnectionAction({ institutionId: institution.id, institutionName: institution.name });
    if (!response.ok) {
      setStarting(null);
      return void addToast({ title: response.error, color: "danger" });
    }
    window.location.assign(response.data.link);
  };

  return (
    <>
      <Button color="primary" startContent={<Plus size={16} />} isDisabled={disabled} onPress={load}>
        {t("button")}
      </Button>
      <Modal isOpen={open} onOpenChange={setOpen} size="lg" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>{t("title")}</ModalHeader>
          <ModalBody className="pb-6">
            <p className="text-small text-default-500">{t("help")}</p>
            <Input aria-label={t("search")} placeholder={t("search")} startContent={<Search size={16} />} value={query} onValueChange={setQuery} />
            {loading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : (
              <ul className="flex flex-col divide-y divide-default-100">
                {filtered.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      disabled={starting !== null}
                      onClick={() => start(row)}
                      className="flex w-full items-center gap-3 px-1 py-2 text-left hover:bg-default-50 disabled:opacity-50"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {row.logo ? <img src={row.logo} alt="" className="h-6 w-6 object-contain" /> : <Landmark size={20} className="text-default-400" />}
                      <span className="flex-1 text-small">{row.name}</span>
                      {starting === row.id ? <Spinner size="sm" /> : <span className="text-tiny text-default-400">{row.bic}</span>}
                    </button>
                  </li>
                ))}
                {!filtered.length ? <li className="py-6 text-center text-small text-default-500">{t("empty")}</li> : null}
              </ul>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
