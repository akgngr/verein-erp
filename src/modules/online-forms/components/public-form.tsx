"use client";
import { Card, Checkbox, CheckboxGroup, FieldError, Input, Label, Select, Spinner, TextField, Button } from "@/shared/components/kit";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { CheckCircle2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState, useTransition } from "react";

import {
  BUNDESLAENDER,
  COUNTRY_CODES,
  countryNameDe,
  normalizeCountryName,
} from "@/shared/geo/germany";
import { useHydrated } from "@/shared/hooks/use-hydrated";
import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

import { markOnlineFormOpenedAction, submitOnlineFormAction } from "../actions/public-actions";
import type { PublicForm as Form } from "../services/requests";
import { BirthDateSelect } from "./birth-date-select";
import { SignaturePad } from "./signature-pad";

type Values = Record<string, string | boolean | string[]>;
const str = (value: string | null | undefined) => value ?? "";

/** Oturumsuz form: ön doldurulmuş alanlar, Datenschutz onayları ve imza. */
export function PublicOnlineForm({
  token,
  form,
}: {
  token: string;
  form: Form;
}) {
  // #580: Açılma zamanı yalnız gerçek tarayıcıda (JS çalıştıktan sonra) kaydedilir; GET artık yazmaz.
  useEffect(() => {
    void markOnlineFormOpenedAction(token).catch(() => undefined);
  }, [token]);
  const t = useTranslations("online-forms.public");
  const translate = useTranslateMessage();
  const locale = useLocale();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [signerName, setSignerName] = useState(
    form.signerRole === "guardian" && form.guardian
      ? `${form.guardian.firstName} ${form.guardian.lastName}`
      : form.subjectName,
  );
  const [privacyBuiltIn, setPrivacyBuiltIn] = useState(false);
  const [acceptedDocs, setAcceptedDocs] = useState<string[]>([]);
  const privacyDoc = form.documents.find(
    (doc) => doc.purpose === "PRIVACY" && doc.requiresConsent,
  );
  const photoDoc = form.documents.find(
    (doc) => doc.purpose === "PHOTO" && doc.requiresConsent,
  );
  const privacy = privacyDoc
    ? acceptedDocs.includes(privacyDoc.id)
    : privacyBuiltIn;
  const missingRequired = form.documents.some(
    (doc) =>
      doc.requiresConsent && doc.required && !acceptedDocs.includes(doc.id),
  );
  const toggleDoc = (id: string, value: boolean) =>
    setAcceptedDocs((current) =>
      value
        ? [...current.filter((item) => item !== id), id]
        : current.filter((item) => item !== id),
    );

  const [member, setMember] = useState<Values | null>(
    form.member && {
      email: str(form.member.email),
      phone: str(form.member.phone),
      street: str(form.member.street),
      houseNumber: str(form.member.houseNumber),
      postalCode: str(form.member.postalCode),
      city: str(form.member.city),
      state: str(form.member.state),
      country: normalizeCountryName(form.member.country) || "Deutschland",
      birthDate: str(form.member.birthDate),
      profession: str(form.member.profession),
      messagingConsents: form.member.messagingConsents,
      bulkMailOptOut: form.member.bulkMailOptOut,
      photoConsent: form.member.photoConsent,
      // #580: SEPA yetki yenileme için banka alanları (IBAN ön doldurulmaz; yeniden girilir).
      iban: "",
      bic: "",
      accountHolder: "",
      sepaMandate: false,
    },
  );
  const [student, setStudent] = useState<Values | null>(
    form.student && {
      birthDate: str(form.student.birthDate),
      school: str(form.student.school),
      gradeLevel: str(form.student.gradeLevel),
      email: str(form.student.email),
      phone: str(form.student.phone),
      photoConsent: form.student.photoConsent,
    },
  );
  const [guardian, setGuardian] = useState<Values | null>(
    form.guardian && {
      email: str(form.guardian.email),
      phone: str(form.guardian.phone),
      street: str(form.guardian.street),
      houseNumber: str(form.guardian.houseNumber),
      postalCode: str(form.guardian.postalCode),
      city: str(form.guardian.city),
      state: str(form.guardian.state),
      country: form.guardian.country || "DE",
      iban: "",
      bic: "",
      accountHolder: str(form.guardian.accountHolder),
      messagingConsents: form.guardian.messagingConsents,
      bulkMailOptOut: form.guardian.bulkMailOptOut,
      sepaMandate: false,
    },
  );

  const countries = useMemo(() => {
    const display = new Intl.DisplayNames([locale], { type: "region" });
    return COUNTRY_CODES.map((code) => ({
      code,
      name: countryNameDe(code),
      label: display.of(code) ?? code,
    }));
  }, [locale]);

  // KARAR: react-aria seçim kutularının otomatik kimlikleri sunucu/istemci arasında kayıyor (hydration
  // uyarısı); form yalnız istemcide çizilir. Sayfa arama motoruna açık değildir, SSR kazancı yok.
  const hydrated = useHydrated();
  if (!hydrated)
    return (
      <div className="flex justify-center p-10">
        <Spinner></Spinner>
      </div>
    );

  if (done) {
    return (
      <Card className={["mx-auto max-w-xl"].filter(Boolean).join(" ")}>
        <Card.Content
          className={["flex flex-col items-center gap-3 p-8 text-center"]
            .filter(Boolean)
            .join(" ")}
        >
          <CheckCircle2 className="size-12 text-success" />
          <h1 className="text-xl font-semibold">{t("doneTitle")}</h1>
          <p className="text-ink-600">{t("doneText", { org: form.orgName })}</p>
        </Card.Content>
      </Card>
    );
  }

  const field = (
    scope: string,
    values: Values,
    set: (next: Values) => void,
    name: string,
    props: { type?: string; label?: string } = {},
  ) => (
    <TextField
      key={`${scope}.${name}`}
      value={String(values[name] ?? "")}
      isInvalid={Boolean(errors[`${scope}.${name}`])}
      onChange={(value) => set({ ...values, [name]: value })}
      className={["w-full"].filter(Boolean).join(" ")}
    >
      <Label>{props.label ?? t(`fields.${name}` as never)}</Label>
      <Input placeholder=" " type={props.type ?? "text"} />
      <FieldError>{translate(errors[`${scope}.${name}`])}</FieldError>
    </TextField>
  );
  const birthDate = (
    scope: string,
    values: Values,
    set: (next: Values) => void,
  ) => (
    <BirthDateSelect
      key={`${scope}.birthDate`}
      id={`${scope}-birthDate`}
      label={t("fields.birthDate")}
      value={String(values.birthDate ?? "")}
      onChange={(value) => set({ ...values, birthDate: value })}
      isInvalid={Boolean(errors[`${scope}.birthDate`])}
      errorMessage={translate(errors[`${scope}.birthDate`])}
      labels={{
        day: t("date.day"),
        month: t("date.month"),
        year: t("date.year"),
      }}
    />
  );
  const address = (
    scope: string,
    values: Values,
    set: (next: Values) => void,
    countryMode: "code" | "name",
  ) => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
      <div className="sm:col-span-4">{field(scope, values, set, "street")}</div>
      <div className="sm:col-span-2">
        {field(scope, values, set, "houseNumber")}
      </div>
      <div className="sm:col-span-2">
        {field(scope, values, set, "postalCode")}
      </div>
      <div className="sm:col-span-4">{field(scope, values, set, "city")}</div>
      <div className="sm:col-span-3">
        <Select
          id={`${scope}-state`}
          placeholder={t("select")}
          isInvalid={Boolean(errors[`${scope}.state`])}
          value={values.state ? String(values.state) : null}
          onChange={(selectedValue) => {
            const keys =
              selectedValue === null ? undefined : String(selectedValue);
            return set({ ...values, state: String(keys ?? "") });
          }}
        >
          <Label>{t("fields.state")}</Label>
              {BUNDESLAENDER.map((item) => (
                <Select.Item key={item} id={item} textValue={String(item)}>
                  <Label>{item}</Label>
                </Select.Item>
              ))}
          <FieldError>{translate(errors[`${scope}.state`])}</FieldError>
        </Select>
      </div>
      <div className="sm:col-span-3">
        <Select
          id={`${scope}-country`}
          value={values.country ? String(values.country) : null}
          onChange={(selectedValue) => {
            const keys =
              selectedValue === null ? undefined : String(selectedValue);
            return set({ ...values, country: String(keys ?? "") });
          }}
        >
          <Label>{t("fields.country")}</Label>
              {countries.map((item) => (
                <Select.Item
                  key={countryMode === "code" ? item.code : item.name}
                  id={countryMode === "code" ? item.code : item.name}
                  textValue={String(item.label)}
                >
                  <Label>{item.label}</Label>
                </Select.Item>
              ))}
        </Select>
      </div>
    </div>
  );
  const messaging = (values: Values, set: (next: Values) => void) => (
    <div className="flex flex-col gap-2">
      <CheckboxGroup
        value={values.messagingConsents as string[]}
        onChange={(value) => set({ ...values, messagingConsents: value })}
      >
        <Label>{t("messagingLabel")}</Label>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {(["sms", "whatsapp", "telegram"] as const).map((key) => (
            <Checkbox key={key} value={key}>
                <Label>{t(`channels.${key}`)}</Label>
            </Checkbox>
          ))}
        </div>
      </CheckboxGroup>
      <Checkbox
        isSelected={Boolean(values.bulkMailOptOut)}
        onChange={(value) => set({ ...values, bulkMailOptOut: value })}
      >
          <Label>{t("bulkMailOptOut")}</Label>
      </Checkbox>
    </div>
  );

  const consentLabel = (doc: Form["documents"][number]) => {
    if (doc.purpose === "PRIVACY") return t("privacy", { org: form.orgName });
    if (doc.purpose === "PHOTO")
      return form.signerRole === "guardian" && student
        ? t("photoChild")
        : t("photo");
    return t("acceptDocument", { title: doc.title });
  };
  const submit = () => {
    setFormError(null);
    start(async () => {
      const response = await submitOnlineFormAction({
        token,
        textVersion: form.textVersion,
        signerName,
        signature: signature ?? "",
        privacy,
        documents: acceptedDocs,
        ...(member ? { member } : {}),
        ...(student ? { student } : {}),
        ...(guardian ? { guardian } : {}),
      });
      if (response.ok) return setDone(true);
      setErrors(response.fields ?? {});
      setFormError(response.error);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const section = (title: string, children: React.ReactNode) => (
    <Card className={"shadow-sm border border-ink-200/80"}>
      <Card.Content
        className={["flex flex-col gap-4 p-5"].filter(Boolean).join(" ")}
      >
        <h2 className="text-base font-semibold">{title}</h2>
        {children}
      </Card.Content>
    </Card>
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-ink-500">{form.orgName}</p>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-ink-600">
          {form.signerRole === "guardian"
            ? t("introGuardian", { name: form.subjectName })
            : t("intro", { name: form.subjectName })}
        </p>
        <p className="text-xs text-ink-400">
          {t("validUntil", {
            date: new Date(form.expiresAt).toLocaleDateString(locale),
          })}
        </p>
      </header>
      {formError ? (
        <div
          role="alert"
          className="rounded-lg bg-danger-50 p-3 text-sm text-danger"
        >
          {translate(formError)}
        </div>
      ) : null}

      {member &&
        section(
          t("sections.person"),
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {field("member", member, setMember, "email", { type: "email" })}
              {field("member", member, setMember, "phone", { type: "tel" })}
              {birthDate("member", member, setMember)}
              {field("member", member, setMember, "profession")}
            </div>
            {address("member", member, setMember, "name")}
            <h3 className="pt-2 text-sm font-semibold">{t("sections.bank")}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {field("member", member, setMember, "iban")}
              {field("member", member, setMember, "bic")}
              {field("member", member, setMember, "accountHolder")}
            </div>
            <Checkbox
              isSelected={Boolean(member.sepaMandate)}
              onChange={(value) => setMember({ ...member, sepaMandate: value })}
            >
              <Label>
                <span className="text-sm">{t("sepaMandate", { org: form.orgName })}</span>
              </Label>
            </Checkbox>
          </>,
        )}
      {student &&
        section(
          form.signerRole === "guardian"
            ? t("sections.child")
            : t("sections.person"),
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {birthDate("student", student, setStudent)}
            {field("student", student, setStudent, "school")}
            {field("student", student, setStudent, "gradeLevel")}
            {field("student", student, setStudent, "email", { type: "email" })}
            {field("student", student, setStudent, "phone", { type: "tel" })}
          </div>,
        )}
      {guardian &&
        section(
          form.kind === "GUARDIAN"
            ? t("sections.person")
            : t("sections.guardian"),
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {field("guardian", guardian, setGuardian, "email", {
                type: "email",
              })}
              {field("guardian", guardian, setGuardian, "phone", {
                type: "tel",
              })}
            </div>
            {address("guardian", guardian, setGuardian, "code")}
            <h3 className="pt-2 text-sm font-semibold">{t("sections.bank")}</h3>
            {form.guardian?.ibanMasked ? (
              <p className="text-xs text-ink-500">
                {t("ibanKnown", { iban: form.guardian.ibanMasked })}
              </p>
            ) : null}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {field("guardian", guardian, setGuardian, "iban")}
              {field("guardian", guardian, setGuardian, "bic")}
              {field("guardian", guardian, setGuardian, "accountHolder")}
            </div>
            <Checkbox
              isSelected={Boolean(guardian.sepaMandate)}
              onChange={(value) =>
                setGuardian({ ...guardian, sepaMandate: value })
              }
            >
                <Label>
                  <span className="text-sm">
                    {t("sepaMandate", { org: form.orgName })}
                  </span>
                </Label>
            </Checkbox>
          </>,
        )}

      {section(
        t("sections.consents"),
        <>
          {form.documents.map((doc) => (
            <div key={doc.id} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">{doc.title}</h3>
              {/* contentHtml sunucuda sanitize-html ile izin listesine göre temizlenmiştir. */}
              <div
                className="doc-content max-h-64 overflow-y-auto rounded-lg border border-ink-200 bg-ink-50 p-3 text-sm text-ink-700"
                dangerouslySetInnerHTML={{ __html: doc.contentHtml }}
              />
              {doc.requiresConsent ? (
                <Checkbox
                  isSelected={acceptedDocs.includes(doc.id)}
                  isInvalid={
                    doc.purpose === "PRIVACY" && Boolean(errors.privacy)
                  }
                  onChange={(value) => toggleDoc(doc.id, value)}
                >
                    <Label>
                      <span className="text-sm">
                        {consentLabel(doc)}
                        {doc.required ? " *" : ""}
                      </span>
                    </Label>
                </Checkbox>
              ) : null}
            </div>
          ))}
          {!privacyDoc ? (
            <Checkbox
              isSelected={privacyBuiltIn}
              isInvalid={Boolean(errors.privacy)}
              onChange={setPrivacyBuiltIn}
            >
                <Label>
                  <span className="text-sm">
                    {t("privacy", { org: form.orgName })}
                  </span>
                </Label>
            </Checkbox>
          ) : null}
          {errors.privacy ? (
            <p className="text-xs text-danger">{translate(errors.privacy)}</p>
          ) : null}
          {!photoDoc && member ? (
            <Checkbox
              isSelected={Boolean(member.photoConsent)}
              onChange={(value) =>
                setMember({ ...member, photoConsent: value })
              }
            >
                <Label>
                  <span className="text-sm">{t("photo")}</span>
                </Label>
            </Checkbox>
          ) : null}
          {!photoDoc && student ? (
            <Checkbox
              isSelected={Boolean(student.photoConsent)}
              onChange={(value) =>
                setStudent({ ...student, photoConsent: value })
              }
            >
                <Label>
                  <span className="text-sm">
                    {form.signerRole === "guardian"
                      ? t("photoChild")
                      : t("photo")}
                  </span>
                </Label>
            </Checkbox>
          ) : null}
          {member
            ? messaging(member, setMember)
            : guardian
              ? messaging(guardian, setGuardian)
              : null}
          <p className="text-xs text-ink-500">{t("withdraw")}</p>
        </>,
      )}

      {section(
        t("sections.signature"),
        <>
          <TextField
            value={signerName}
            isInvalid={Boolean(errors.signerName)}
            onChange={setSignerName}
            className={["w-full"].filter(Boolean).join(" ")}
          >
            <Label>{t("signerName")}</Label>
            <Input placeholder=" " />
            <FieldError>{translate(errors.signerName)}</FieldError>
          </TextField>
          <SignaturePad
            onChange={setSignature}
            clearLabel={t("clearSignature")}
            ariaLabel={t("signatureArea")}
          />
          {errors.signature ? (
            <p className="text-xs text-danger">{translate(errors.signature)}</p>
          ) : null}
          <p className="text-xs text-ink-500">{t("signatureHint")}</p>
        </>,
      )}

      <Button
        size="lg"
        isDisabled={!privacy || missingRequired || !signature}
        onPress={submit}
        variant={actionVariant("primary", "solid")}
        isPending={pending}
      >
        {pending ? <Spinner size="sm" tone="current" /> : null}
        {t("submit")}
      </Button>
    </div>
  );
}
