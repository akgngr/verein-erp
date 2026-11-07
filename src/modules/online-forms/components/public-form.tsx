"use client";

import { Button, Card, CardBody, Checkbox, CheckboxGroup, Input, Select, SelectItem } from "@heroui/react";
import { CheckCircle2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";

import { BUNDESLAENDER, COUNTRY_CODES, countryNameDe, normalizeCountryName } from "@/shared/geo/germany";
import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

import { submitOnlineFormAction } from "../actions/public-actions";
import type { PublicForm as Form } from "../services/requests";
import { SignaturePad } from "./signature-pad";

type Values = Record<string, string | boolean | string[]>;
const str = (value: string | null | undefined) => value ?? "";

/** Oturumsuz form: ön doldurulmuş alanlar, Datenschutz onayları ve imza. */
export function PublicOnlineForm({ token, form }: { token: string; form: Form }) {
  const t = useTranslations("online-forms.public");
  const translate = useTranslateMessage();
  const locale = useLocale();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [signerName, setSignerName] = useState(form.signerRole === "guardian" && form.guardian ? `${form.guardian.firstName} ${form.guardian.lastName}` : form.subjectName);
  const [privacy, setPrivacy] = useState(false);

  const [member, setMember] = useState<Values | null>(form.member && {
    email: str(form.member.email), phone: str(form.member.phone), street: str(form.member.street), houseNumber: str(form.member.houseNumber), postalCode: str(form.member.postalCode),
    city: str(form.member.city), state: str(form.member.state), country: normalizeCountryName(form.member.country) || "Deutschland", birthDate: str(form.member.birthDate),
    profession: str(form.member.profession), messagingConsents: form.member.messagingConsents, bulkMailOptOut: form.member.bulkMailOptOut, photoConsent: form.member.photoConsent,
  });
  const [student, setStudent] = useState<Values | null>(form.student && {
    birthDate: str(form.student.birthDate), school: str(form.student.school), gradeLevel: str(form.student.gradeLevel), email: str(form.student.email), phone: str(form.student.phone), photoConsent: form.student.photoConsent,
  });
  const [guardian, setGuardian] = useState<Values | null>(form.guardian && {
    email: str(form.guardian.email), phone: str(form.guardian.phone), street: str(form.guardian.street), houseNumber: str(form.guardian.houseNumber), postalCode: str(form.guardian.postalCode),
    city: str(form.guardian.city), state: str(form.guardian.state), country: form.guardian.country || "DE", iban: "", bic: "", accountHolder: str(form.guardian.accountHolder),
    messagingConsents: form.guardian.messagingConsents, bulkMailOptOut: form.guardian.bulkMailOptOut, sepaMandate: false,
  });

  const countries = useMemo(() => {
    const display = new Intl.DisplayNames([locale], { type: "region" });
    return COUNTRY_CODES.map((code) => ({ code, name: countryNameDe(code), label: display.of(code) ?? code }));
  }, [locale]);

  if (done) {
    return (
      <Card className="mx-auto max-w-xl"><CardBody className="flex flex-col items-center gap-3 p-8 text-center">
        <CheckCircle2 className="size-12 text-success" />
        <h1 className="text-xl font-semibold">{t("doneTitle")}</h1>
        <p className="text-default-600">{t("doneText", { org: form.orgName })}</p>
      </CardBody></Card>
    );
  }

  const field = (scope: string, values: Values, set: (next: Values) => void, name: string, props: { type?: string; label?: string } = {}) => (
    <Input
      key={`${scope}.${name}`}
      label={props.label ?? t(`fields.${name}` as never)}
      labelPlacement="outside"
      placeholder=" "
      type={props.type ?? "text"}
      value={String(values[name] ?? "")}
      onValueChange={(value) => set({ ...values, [name]: value })}
      isInvalid={Boolean(errors[`${scope}.${name}`])}
      errorMessage={translate(errors[`${scope}.${name}`])}
    />
  );
  const address = (scope: string, values: Values, set: (next: Values) => void, countryMode: "code" | "name") => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
      <div className="sm:col-span-4">{field(scope, values, set, "street")}</div>
      <div className="sm:col-span-2">{field(scope, values, set, "houseNumber")}</div>
      <div className="sm:col-span-2">{field(scope, values, set, "postalCode")}</div>
      <div className="sm:col-span-4">{field(scope, values, set, "city")}</div>
      <div className="sm:col-span-3">
        <Select label={t("fields.state")} labelPlacement="outside" placeholder={t("select")} selectedKeys={values.state ? [String(values.state)] : []} onSelectionChange={(keys) => set({ ...values, state: String(Array.from(keys)[0] ?? "") })} isInvalid={Boolean(errors[`${scope}.state`])} errorMessage={translate(errors[`${scope}.state`])}>
          {BUNDESLAENDER.map((item) => <SelectItem key={item}>{item}</SelectItem>)}
        </Select>
      </div>
      <div className="sm:col-span-3">
        <Select label={t("fields.country")} labelPlacement="outside" selectedKeys={values.country ? [String(values.country)] : []} onSelectionChange={(keys) => set({ ...values, country: String(Array.from(keys)[0] ?? "") })}>
          {countries.map((item) => <SelectItem key={countryMode === "code" ? item.code : item.name}>{item.label}</SelectItem>)}
        </Select>
      </div>
    </div>
  );
  const messaging = (values: Values, set: (next: Values) => void) => (
    <div className="flex flex-col gap-2">
      <CheckboxGroup label={t("messagingLabel")} orientation="horizontal" value={values.messagingConsents as string[]} onValueChange={(value) => set({ ...values, messagingConsents: value })}>
        <Checkbox value="sms">SMS</Checkbox>
        <Checkbox value="whatsapp">WhatsApp</Checkbox>
        <Checkbox value="telegram">Telegram</Checkbox>
      </CheckboxGroup>
      <Checkbox isSelected={Boolean(values.bulkMailOptOut)} onValueChange={(value) => set({ ...values, bulkMailOptOut: value })}>{t("bulkMailOptOut")}</Checkbox>
    </div>
  );

  const submit = () => {
    setFormError(null);
    start(async () => {
      const response = await submitOnlineFormAction({ token, signerName, signature: signature ?? "", privacy, ...(member ? { member } : {}), ...(student ? { student } : {}), ...(guardian ? { guardian } : {}) });
      if (response.ok) return setDone(true);
      setErrors(response.fields ?? {});
      setFormError(response.error);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const section = (title: string, children: React.ReactNode) => (
    <Card shadow="sm"><CardBody className="flex flex-col gap-4 p-5"><h2 className="text-medium font-semibold">{title}</h2>{children}</CardBody></Card>
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <header className="flex flex-col gap-1">
        <p className="text-small text-default-500">{form.orgName}</p>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-default-600">{form.signerRole === "guardian" ? t("introGuardian", { name: form.subjectName }) : t("intro", { name: form.subjectName })}</p>
        <p className="text-tiny text-default-400">{t("validUntil", { date: new Date(form.expiresAt).toLocaleDateString(locale) })}</p>
      </header>
      {formError ? <div role="alert" className="rounded-medium bg-danger-50 p-3 text-small text-danger">{translate(formError)}</div> : null}

      {member && section(t("sections.person"), (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {field("member", member, setMember, "email", { type: "email" })}
            {field("member", member, setMember, "phone", { type: "tel" })}
            {field("member", member, setMember, "birthDate", { type: "date" })}
            {field("member", member, setMember, "profession")}
          </div>
          {address("member", member, setMember, "name")}
        </>
      ))}
      {student && section(form.signerRole === "guardian" ? t("sections.child") : t("sections.person"), (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {field("student", student, setStudent, "birthDate", { type: "date" })}
          {field("student", student, setStudent, "school")}
          {field("student", student, setStudent, "gradeLevel")}
          {field("student", student, setStudent, "email", { type: "email" })}
          {field("student", student, setStudent, "phone", { type: "tel" })}
        </div>
      ))}
      {guardian && section(form.kind === "GUARDIAN" ? t("sections.person") : t("sections.guardian"), (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {field("guardian", guardian, setGuardian, "email", { type: "email" })}
            {field("guardian", guardian, setGuardian, "phone", { type: "tel" })}
          </div>
          {address("guardian", guardian, setGuardian, "code")}
          <h3 className="pt-2 text-small font-semibold">{t("sections.bank")}</h3>
          {form.guardian?.ibanMasked ? <p className="text-tiny text-default-500">{t("ibanKnown", { iban: form.guardian.ibanMasked })}</p> : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {field("guardian", guardian, setGuardian, "iban")}
            {field("guardian", guardian, setGuardian, "bic")}
            {field("guardian", guardian, setGuardian, "accountHolder")}
          </div>
          <Checkbox isSelected={Boolean(guardian.sepaMandate)} onValueChange={(value) => setGuardian({ ...guardian, sepaMandate: value })}>
            <span className="text-small">{t("sepaMandate", { org: form.orgName })}</span>
          </Checkbox>
        </>
      ))}

      {section(t("sections.consents"), (
        <>
          <Checkbox isSelected={privacy} onValueChange={setPrivacy} isInvalid={Boolean(errors.privacy)}>
            <span className="text-small">{t("privacy", { org: form.orgName })}</span>
          </Checkbox>
          {errors.privacy ? <p className="text-tiny text-danger">{translate(errors.privacy)}</p> : null}
          {member ? <Checkbox isSelected={Boolean(member.photoConsent)} onValueChange={(value) => setMember({ ...member, photoConsent: value })}><span className="text-small">{t("photo")}</span></Checkbox> : null}
          {student ? <Checkbox isSelected={Boolean(student.photoConsent)} onValueChange={(value) => setStudent({ ...student, photoConsent: value })}><span className="text-small">{form.signerRole === "guardian" ? t("photoChild") : t("photo")}</span></Checkbox> : null}
          {member ? messaging(member, setMember) : guardian ? messaging(guardian, setGuardian) : null}
          <p className="text-tiny text-default-500">{t("withdraw")}</p>
        </>
      ))}

      {section(t("sections.signature"), (
        <>
          <Input label={t("signerName")} labelPlacement="outside" placeholder=" " value={signerName} onValueChange={setSignerName} isInvalid={Boolean(errors.signerName)} errorMessage={translate(errors.signerName)} />
          <SignaturePad onChange={setSignature} clearLabel={t("clearSignature")} ariaLabel={t("signatureArea")} />
          {errors.signature ? <p className="text-tiny text-danger">{translate(errors.signature)}</p> : null}
          <p className="text-tiny text-default-500">{t("signatureHint")}</p>
        </>
      ))}

      <Button color="primary" size="lg" isLoading={pending} isDisabled={!privacy || !signature} onPress={submit}>{t("submit")}</Button>
    </div>
  );
}
