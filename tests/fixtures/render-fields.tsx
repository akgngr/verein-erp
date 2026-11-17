// Rendered in a child process without the "react-server" condition (see tests/shared/fields.test.ts).
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CheckboxField, RadioGroupField, SwitchField, TextAreaField, TextInputField } from "@/shared/components/fields";

const noop = () => {};
const out = {
  text: renderToStaticMarkup(<TextInputField label="IBAN" description="Hilfe" error="Ungültig" value="DE" onChange={noop} prefix="€" isRequired />),
  textNoLabel: renderToStaticMarkup(<TextInputField ariaLabel="Suche" value="" onChange={noop} />),
  area: renderToStaticMarkup(<TextAreaField label="Notiz" rows={4} defaultValue="x" />),
  check: renderToStaticMarkup(<CheckboxField label="Aktiv" checked onChange={noop} />),
  sw: renderToStaticMarkup(<SwitchField label="An" checked={false} onChange={noop} />),
  radio: renderToStaticMarkup(<RadioGroupField label="Modus" value="a" onChange={noop} options={[{ value: "a", label: "A" }, { value: "b", label: "B" }]} />),
};
process.stdout.write(JSON.stringify(out));
void React;
