"use client";
import { Button, toast } from "@heroui/react";
import { Dialog, InputGroup, Spinner, TextField } from "@/shared/components/kit";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { Landmark, Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import {
  listInstitutionsAction,
  startBankConnectionAction,
} from "../actions/banking-actions";
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
      return void toast(response.error, { variant: "danger" });
    }
    setInstitutions(response.data);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return (
      q
        ? institutions.filter(
            (row) =>
              row.name.toLocaleLowerCase().includes(q) ||
              row.bic?.toLowerCase().includes(q),
          )
        : institutions
    ).slice(0, 60);
  }, [institutions, query]);

  const start = async (institution: Institution) => {
    setStarting(institution.id);
    const response = await startBankConnectionAction({
      institutionId: institution.id,
      institutionName: institution.name,
    });
    if (!response.ok) {
      setStarting(null);
      return void toast(response.error, { variant: "danger" });
    }
    window.location.assign(response.data.link);
  };

  return (
    <>
      <Button
        isDisabled={disabled}
        onPress={load}
        variant={actionVariant("primary", "solid")}
      >
        {<Plus size={16} />}
        {t("button")}
      </Button>
      <Dialog isOpen={open} onOpenChange={setOpen} size="lg" scroll={"inside"} className={"w-full max-w-lg "}>
              <DialogDismissButton />

              <Dialog.Header>
                <Dialog.Heading className="flex items-center gap-2">
                  {t("title")}
                </Dialog.Heading>
              </Dialog.Header>
              <Dialog.Body className="pb-6">
                <p className="text-sm text-ink-500">{t("help")}</p>
                <TextField
                  aria-label={t("search")}
                  value={query}
                  onChange={setQuery}
                  className={["w-full"].filter(Boolean).join(" ")}
                >
                  <InputGroup>
                    <InputGroup.Prefix>
                      {<Search size={16} />}
                    </InputGroup.Prefix>
                    <InputGroup.Input placeholder={t("search")} />
                  </InputGroup>
                </TextField>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Spinner></Spinner>
                  </div>
                ) : (
                  <ul className="flex flex-col divide-y divide-ink-100">
                    {filtered.map((row) => (
                      <li key={row.id}>
                        <button
                          type="button"
                          disabled={starting !== null}
                          onClick={() => start(row)}
                          className="flex w-full items-center gap-3 px-1 py-2 text-left hover:bg-ink-50 disabled:opacity-50"
                        >
                          {row.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={row.logo}
                              alt=""
                              className="h-6 w-6 object-contain"
                            />
                          ) : (
                            <Landmark size={20} className="text-ink-400" />
                          )}
                          <span className="flex-1 text-sm">{row.name}</span>
                          {starting === row.id ? (
                            <Spinner size="sm"></Spinner>
                          ) : (
                            <span className="text-xs text-ink-400">
                              {row.bic}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                    {!filtered.length ? (
                      <li className="py-6 text-center text-sm text-ink-500">
                        {t("empty")}
                      </li>
                    ) : null}
                  </ul>
                )}
              </Dialog.Body>
      </Dialog>
    </>
  );
}
