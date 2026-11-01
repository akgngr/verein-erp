import "server-only";

import { AFRelationship, PDFDocument, PDFName, PDFString } from "pdf-lib";

import { SRGB_ICC_BASE64 } from "../pdf/srgb-icc";

/**
 * ACC-5b: mevcut fatura PDF'ini ZUGFeRD / Factur-X'e çevirir: CII XML'i "factur-x.xml" olarak
 * gömer (AFRelationship=Alternative, katalogda /AF), PDF/A-3b + Factur-X XMP meta verisi ve
 * sRGB OutputIntent ekler. Fontlar react-pdf tarafından zaten gömülüdür.
 */
export async function toZugferdPdf(pdfBytes: Uint8Array, xml: string, meta: { title: string; author: string; created: Date }): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(pdfBytes, { updateMetadata: false });
  const created = meta.created;
  pdf.setTitle(meta.title);
  pdf.setAuthor(meta.author);
  pdf.setProducer("Verein ERP");
  pdf.setCreator("Verein ERP");
  pdf.setCreationDate(created);
  pdf.setModificationDate(created);

  await pdf.attach(new TextEncoder().encode(xml), "factur-x.xml", {
    mimeType: "text/xml",
    description: "Factur-X/ZUGFeRD invoice (EN 16931)", // i18n-ignore
    creationDate: created,
    modificationDate: created,
    afRelationship: AFRelationship.Alternative,
  });

  // sRGB OutputIntent (PDF/A şartı).
  const icc = Uint8Array.from(Buffer.from(SRGB_ICC_BASE64, "base64"));
  const iccStream = pdf.context.stream(icc, { N: 3 });
  const iccRef = pdf.context.register(iccStream);
  const intent = pdf.context.obj({
    Type: "OutputIntent",
    S: "GTS_PDFA1",
    OutputConditionIdentifier: PDFString.of("sRGB IEC61966-2.1"),
    Info: PDFString.of("sRGB IEC61966-2.1"),
    DestOutputProfile: iccRef,
  });
  pdf.catalog.set(PDFName.of("OutputIntents"), pdf.context.obj([pdf.context.register(intent)]));

  const iso = created.toISOString().replace(/\.\d{3}Z$/, "Z");
  const xmp = [
    "<?xpacket begin=\"﻿\" id=\"W5M0MpCehiHzreSzNTczkc9d\"?>", // i18n-ignore
    "<x:xmpmeta xmlns:x=\"adobe:ns:meta/\">", // i18n-ignore
    "<rdf:RDF xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\">", // i18n-ignore
    "<rdf:Description rdf:about=\"\" xmlns:pdfaid=\"http://www.aiim.org/pdfa/ns/id/\"><pdfaid:part>3</pdfaid:part><pdfaid:conformance>B</pdfaid:conformance></rdf:Description>", // i18n-ignore
    `<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(meta.title)}</rdf:li></rdf:Alt></dc:title><dc:creator><rdf:Seq><rdf:li>${escapeXml(meta.author)}</rdf:li></rdf:Seq></dc:creator></rdf:Description>`, // i18n-ignore
    `<rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/"><xmp:CreatorTool>Verein ERP</xmp:CreatorTool><xmp:CreateDate>${iso}</xmp:CreateDate><xmp:ModifyDate>${iso}</xmp:ModifyDate></rdf:Description>`, // i18n-ignore
    "<rdf:Description rdf:about=\"\" xmlns:pdf=\"http://ns.adobe.com/pdf/1.3/\"><pdf:Producer>Verein ERP</pdf:Producer></rdf:Description>", // i18n-ignore
    "<rdf:Description rdf:about=\"\" xmlns:fx=\"urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#\"><fx:DocumentType>INVOICE</fx:DocumentType><fx:DocumentFileName>factur-x.xml</fx:DocumentFileName><fx:Version>1.0</fx:Version><fx:ConformanceLevel>EN 16931</fx:ConformanceLevel></rdf:Description>", // i18n-ignore
    "<rdf:Description rdf:about=\"\" xmlns:pdfaExtension=\"http://www.aiim.org/pdfa/ns/extension/\" xmlns:pdfaSchema=\"http://www.aiim.org/pdfa/ns/schema#\" xmlns:pdfaProperty=\"http://www.aiim.org/pdfa/ns/property#\">", // i18n-ignore
    "<pdfaExtension:schemas><rdf:Bag><rdf:li rdf:parseType=\"Resource\">", // i18n-ignore
    "<pdfaSchema:schema>Factur-X PDFA Extension Schema</pdfaSchema:schema>", // i18n-ignore
    "<pdfaSchema:namespaceURI>urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#</pdfaSchema:namespaceURI>", // i18n-ignore
    "<pdfaSchema:prefix>fx</pdfaSchema:prefix>", // i18n-ignore
    "<pdfaSchema:property><rdf:Seq>", // i18n-ignore
    "<rdf:li rdf:parseType=\"Resource\"><pdfaProperty:name>DocumentFileName</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>name of the embedded XML invoice file</pdfaProperty:description></rdf:li>", // i18n-ignore
    "<rdf:li rdf:parseType=\"Resource\"><pdfaProperty:name>DocumentType</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>INVOICE</pdfaProperty:description></rdf:li>", // i18n-ignore
    "<rdf:li rdf:parseType=\"Resource\"><pdfaProperty:name>Version</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>The actual version of the Factur-X XML schema</pdfaProperty:description></rdf:li>", // i18n-ignore
    "<rdf:li rdf:parseType=\"Resource\"><pdfaProperty:name>ConformanceLevel</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>The conformance level of the embedded Factur-X data</pdfaProperty:description></rdf:li>", // i18n-ignore
    "</rdf:Seq></pdfaSchema:property>", // i18n-ignore
    "</rdf:li></rdf:Bag></pdfaExtension:schemas>", // i18n-ignore
    "</rdf:Description>", // i18n-ignore
    "</rdf:RDF>", // i18n-ignore
    "</x:xmpmeta>", // i18n-ignore
    "<?xpacket end=\"w\"?>", // i18n-ignore
  ].join("\n");
  const metadata = pdf.context.stream(new TextEncoder().encode(xmp), { Type: "Metadata", Subtype: "XML" });
  pdf.catalog.set(PDFName.of("Metadata"), pdf.context.register(metadata));

  return pdf.save({ useObjectStreams: false });
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
