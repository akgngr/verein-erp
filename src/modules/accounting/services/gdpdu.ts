/**
 * ACC-7 GDPdU / Z3 (Datenträgerüberlassung, § 147 Abs. 6 AO): CSV tabloları + index.xml
 * (gdpdu-01-09-2004.dtd). Saf — handler veriyi verir, burada biçimlenir.
 */
export type GdpduColumn = { name: string; description: string; type: "AlphaNumeric" | "Numeric" | "Date"; accuracy?: number };
export type GdpduTable = { file: string; name: string; description: string; columns: GdpduColumn[]; primaryKey: string; rows: Array<Array<string | number | null>> };

const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** CSV hücresi: ";" ayırıcı, metin tırnaklı, ondalık virgül, tarih TT.MM.JJJJ. */
export function gdpduCell(value: string | number | null, column: GdpduColumn): string {
  if (value === null || value === undefined || value === "") return "";
  if (column.type === "Numeric") return typeof value === "number" ? value.toFixed(column.accuracy ?? 2).replace(".", ",") : String(value).replace(".", ",");
  if (column.type === "Date") {
    const iso = String(value).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split("-").reverse().join(".") : "";
  }
  return `"${String(value).replace(/"/g, '""').replace(/[\r\n]+/g, " ")}"`;
}

export function gdpduCsv(table: GdpduTable): string {
  return table.rows.map((row) => row.map((value, index) => gdpduCell(value, table.columns[index])).join(";")).join("\r\n") + "\r\n";
}

export function gdpduIndex(input: { supplierName: string; location: string; comment: string; mediaName: string; from: string; to: string; tables: GdpduTable[] }): string {
  const range = `<Validity><Range><From>${input.from.split("-").reverse().join(".")}</From><To>${input.to.split("-").reverse().join(".")}</To></Range></Validity>`;
  const tables = input.tables
    .map((table) => {
      const column = (col: GdpduColumn) => {
        const type = col.type === "Numeric" ? `<Numeric><Accuracy>${col.accuracy ?? 2}</Accuracy></Numeric>` : col.type === "Date" ? "<Date><Format>DD.MM.YYYY</Format></Date>" : "<AlphaNumeric/>";
        return `<Name>${esc(col.name)}</Name><Description>${esc(col.description)}</Description>${type}`;
      };
      const pk = table.columns.find((col) => col.name === table.primaryKey) as GdpduColumn;
      const rest = table.columns.filter((col) => col.name !== table.primaryKey);
      return `<Table><URL>${esc(table.file)}</URL><Name>${esc(table.name)}</Name><Description>${esc(table.description)}</Description>${range}<DecimalSymbol>,</DecimalSymbol><DigitGroupingSymbol>.</DigitGroupingSymbol><VariableLength><ColumnDelimiter>;</ColumnDelimiter><RecordDelimiter>&#13;&#10;</RecordDelimiter><TextEncapsulator>"</TextEncapsulator><VariablePrimaryKey>${column(pk)}</VariablePrimaryKey>${rest.map((col) => `<VariableColumn>${column(col)}</VariableColumn>`).join("")}</VariableLength></Table>`;
    })
    .join("\n");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE DataSet SYSTEM "gdpdu-01-09-2004.dtd">',
    "<DataSet>",
    "<Version>1.0</Version>",
    `<DataSupplier><Name>${esc(input.supplierName)}</Name><Location>${esc(input.location)}</Location><Comment>${esc(input.comment)}</Comment></DataSupplier>`,
    `<Media><Name>${esc(input.mediaName)}</Name>`,
    tables,
    "</Media>",
    "</DataSet>",
  ].join("\n");
}
