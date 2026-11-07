import type { EInvoiceDocument, EInvoiceParty } from "../services/einvoice-document";
import type { EInvoiceViewLabels } from "../lib/einvoice-view-labels";

const money = (cents: number, currency: string) => (cents / 100).toLocaleString("de-DE", { style: "currency", currency });
const day = (value: string | null) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split("-").reverse().join(".") : (value ?? "—"));
const days = (value: string | null) => (value ? value.replace(/\d{4}-\d{2}-\d{2}/g, (match) => day(match)) : "—");

/** EI-3: gelen e-faturanın okunabilir görünümü (orijinal XML'den). Sunucu bileşeni; düz HTML. */
export function EInvoiceDocumentView({ document: doc, labels: l }: { document: EInvoiceDocument; labels: EInvoiceViewLabels }) {
  const cur = doc.currency;
  const meta: Array<[string, string | null]> = [
    [l.number, doc.number],
    [l.issueDate, day(doc.issueDate)],
    [l.dueDate, doc.dueDate ? day(doc.dueDate) : null],
    [l.servicePeriod, doc.servicePeriod ? days(doc.servicePeriod) : null],
    [l.buyerReference, doc.buyerReference],
    [l.orderReference, doc.orderReference],
    [l.precedingInvoice, doc.precedingInvoice],
  ];
  const totals: Array<[string, number, boolean?]> = [
    [l.totalLines, doc.totals.lineCents],
    ...(doc.totals.allowanceCents ? [[l.totalAllowance, -doc.totals.allowanceCents] as [string, number]] : []),
    ...(doc.totals.chargeCents ? [[l.totalCharge, doc.totals.chargeCents] as [string, number]] : []),
    [l.totalNet, doc.totals.netCents],
    [l.totalTax, doc.totals.taxCents],
    [l.totalGross, doc.totals.grossCents, true],
    ...(doc.totals.prepaidCents ? [[l.totalPrepaid, -doc.totals.prepaidCents] as [string, number]] : []),
    [l.totalPayable, doc.totals.payableCents, true],
  ];
  const payment: Array<[string, string | null]> = [
    [l.means, l.meansLabel],
    [l.iban, doc.payment.iban],
    [l.bic, doc.payment.bic],
    [l.accountName, doc.payment.accountName],
    [l.reference, doc.payment.reference],
    [l.mandate, doc.payment.mandateReference],
    [l.creditorId, doc.payment.creditorId],
    [l.terms, doc.payment.terms],
  ];
  return (
    <article className="flex flex-col gap-6 rounded-medium border border-default-200 bg-white p-6 text-small text-default-800 shadow-sm dark:bg-content1">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-default-200 pb-4">
        <div>
          <p className="text-tiny uppercase tracking-wider text-default-500">{l.title}</p>
          <h2 className="text-xl font-semibold text-foreground">{l.documentType}</h2>
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5">
          {meta.filter(([, value]) => value).map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-default-500">{label}</dt>
              <dd className="text-right font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Party title={l.seller} party={doc.seller} labels={l} />
        <Party title={l.buyer} party={doc.buyer} labels={l} />
      </div>

      <section>
        <h3 className="mb-2 font-semibold">{l.lines}</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-default-200 text-left text-tiny uppercase text-default-500">
                <th className="py-2 pr-2">{l.position}</th>
                <th className="py-2 pr-2">{l.item}</th>
                <th className="py-2 pr-2 text-right">{l.quantity}</th>
                <th className="py-2 pr-2 text-right">{l.unitPrice}</th>
                <th className="py-2 pr-2 text-right">{l.rate}</th>
                <th className="py-2 text-right">{l.net}</th>
              </tr>
            </thead>
            <tbody>
              {doc.lines.map((line, index) => (
                <tr key={`${line.id}-${index}`} className="border-b border-default-100 align-top">
                  <td className="py-2 pr-2 text-default-500">{line.id ?? index + 1}</td>
                  <td className="py-2 pr-2">
                    <span className="font-medium">{line.name}</span>
                    {line.description ? <span className="block whitespace-pre-line text-tiny text-default-500">{line.description}</span> : null}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums">{line.quantity ?? "—"} {line.unitCode ?? ""}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{line.unitPriceCents === null ? "—" : money(line.unitPriceCents, cur)}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{line.rate === null ? "—" : `${line.rate} %`}</td>
                  <td className="py-2 text-right tabular-nums">{money(line.netCents, cur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <section>
          <h3 className="mb-2 font-semibold">{l.taxes}</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-default-200 text-left text-tiny uppercase text-default-500">
                <th className="py-1 pr-2">{l.category}</th>
                <th className="py-1 pr-2 text-right">{l.rate}</th>
                <th className="py-1 pr-2 text-right">{l.net}</th>
                <th className="py-1 text-right">{l.taxAmount}</th>
              </tr>
            </thead>
            <tbody>
              {doc.taxes.map((tax, index) => (
                <tr key={index} className="border-b border-default-100 align-top">
                  <td className="py-1 pr-2">{tax.category ?? "—"}{tax.exemptionReason ? <span className="block text-tiny text-default-500">{l.exemption}: {tax.exemptionReason}</span> : null}</td>
                  <td className="py-1 pr-2 text-right tabular-nums">{tax.rate} %</td>
                  <td className="py-1 pr-2 text-right tabular-nums">{money(tax.netCents, cur)}</td>
                  <td className="py-1 text-right tabular-nums">{money(tax.taxCents, cur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section>
          <table className="ml-auto w-full max-w-xs">
            <tbody>
              {totals.map(([label, value, strong]) => (
                <tr key={label} className={strong ? "border-t border-default-300 font-semibold text-foreground" : ""}>
                  <td className="py-1">{label}</td>
                  <td className="py-1 text-right tabular-nums">{money(value, cur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section>
        <h3 className="mb-2 font-semibold">{l.payment}</h3>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
          {payment.filter(([, value]) => value).map(([label, value]) => (
            <div key={label} className="flex gap-2">
              <dt className="text-default-500">{label}:</dt>
              <dd className="whitespace-pre-line break-all font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {doc.notes.length ? (
        <section>
          <h3 className="mb-2 font-semibold">{l.notes}</h3>
          <ul className="flex flex-col gap-1">
            {doc.notes.map((note, index) => <li key={index} className="whitespace-pre-line">{note}</li>)}
          </ul>
        </section>
      ) : null}

      <footer className="border-t border-default-200 pt-3 text-tiny text-default-400">{l.source}</footer>
    </article>
  );
}

function Party({ title, party, labels: l }: { title: string; party: EInvoiceParty; labels: EInvoiceViewLabels }) {
  return (
    <section>
      <h3 className="mb-1 text-tiny uppercase tracking-wider text-default-500">{title}</h3>
      <p className="font-semibold text-foreground">{party.name ?? "—"}</p>
      {party.addressLines.map((line) => <p key={line}>{line}</p>)}
      {party.countryCode ? <p>{party.countryCode}</p> : null}
      {party.vatId ? <p className="mt-1 text-default-600">{l.vatId}: {party.vatId}</p> : null}
      {party.taxNumber ? <p className="text-default-600">{l.taxNumber}: {party.taxNumber}</p> : null}
      {party.contactName || party.phone || party.email ? (
        <p className="mt-1 text-default-600">{l.contact}: {[party.contactName, party.phone, party.email].filter(Boolean).join(" · ")}</p>
      ) : null}
    </section>
  );
}
