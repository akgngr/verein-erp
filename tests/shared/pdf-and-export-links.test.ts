import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { inflateSync } from "node:zlib";

function walkTsFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTsFiles(full, out);
    else if (full.endsWith(".ts") || full.endsWith(".tsx")) out.push(full);
  }
  return out;
}

function parseCMap(cmap: string): Map<string, string> {
  const map = new Map<string, string>();
  const decodeHex = (hex: string) => {
    let text = "";
    for (let i = 0; i < hex.length; i += 4) {
      text += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16));
    }
    return text;
  };
  for (const block of cmap.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const m of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      map.set(m[1].toUpperCase(), decodeHex(m[2]));
    }
  }
  for (const block of cmap.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const rawLine of block[1].split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue;
      const arr = /^<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*\[([^\]]+)\]$/.exec(line);
      if (arr) {
        const start = parseInt(arr[1], 16);
        const width = arr[1].length;
        const targets = [...arr[3].matchAll(/<([0-9A-Fa-f]+)>/g)].map((t) => decodeHex(t[1]));
        for (let i = 0; i < targets.length; i += 1) {
          map.set((start + i).toString(16).toUpperCase().padStart(width, "0"), targets[i]);
        }
        continue;
      }
      const range = /^<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>$/.exec(line);
      if (range) {
        const start = parseInt(range[1], 16);
        const end = parseInt(range[2], 16);
        let dst = parseInt(range[3], 16);
        const width = range[1].length;
        for (let c = start; c <= end; c += 1, dst += 1) {
          map.set(c.toString(16).toUpperCase().padStart(width, "0"), String.fromCharCode(dst));
        }
      }
    }
  }
  return map;
}

/**
 * Extracts visible text from a @react-pdf/renderer PDF buffer by resolving each
 * font's ToUnicode CMap object and decoding TJ/Tj hex glyph runs per active font.
 */
function extractPdfText(pdf: Buffer): string {
  const latin = pdf.toString("latin1");
  const objects = new Map<string, string>();
  const streams = new Map<string, string>();

  for (const m of latin.matchAll(/(\d+)\s+0\s+obj\s*([\s\S]*?)endobj/g)) {
    const id = m[1];
    const body = m[2];
    objects.set(id, body);
    const sm = /stream\r?\n/.exec(body);
    if (sm) {
      const end = body.indexOf("endstream", sm.index);
      if (end > sm.index) {
        const raw = Buffer.from(body.slice(sm.index + sm[0].length, end), "latin1");
        try {
          const decoded = /\/FlateDecode/.test(body.slice(0, sm.index))
            ? inflateSync(raw).toString("latin1")
            : raw.toString("latin1");
          streams.set(id, decoded);
        } catch {
          // Skip non-text binary streams
        }
      }
    }
  }

  // Map font resource name (e.g. "F2") -> ToUnicode CMap
  const fontMaps = new Map<string, Map<string, string>>();
  for (const body of objects.values()) {
    const fontDict = /\/Font\s*<<([\s\S]*?)>>/.exec(body);
    if (!fontDict) continue;
    for (const m of fontDict[1].matchAll(/\/(F\d+)\s+(\d+)\s+0\s+R/g)) {
      const fontObj = objects.get(m[2]) ?? "";
      const toUnicodeRef = /\/ToUnicode\s+(\d+)\s+0\s+R/.exec(fontObj);
      if (!toUnicodeRef) continue;
      const cmapStream = streams.get(toUnicodeRef[1]);
      if (cmapStream) fontMaps.set(m[1], parseCMap(cmapStream));
    }
  }

  const lines: string[] = [];
  for (const stream of streams.values()) {
    if (!stream.includes("BT") || stream.includes("begincmap")) continue;
    for (const block of stream.matchAll(/BT([\s\S]*?)ET/g)) {
      const fontMatch = /\/(F\d+)\s+[\d.]+\s+Tf/.exec(block[1]);
      const cmap = fontMatch ? fontMaps.get(fontMatch[1]) : undefined;
      if (!cmap) continue;
      let line = "";
      for (const hexRun of block[1].matchAll(/<([0-9A-Fa-f]+)>/g)) {
        const hex = hexRun[1].toUpperCase();
        for (let i = 0; i + 4 <= hex.length; i += 4) {
          line += cmap.get(hex.slice(i, i + 4)) ?? "";
        }
      }
      if (line) lines.push(line);
    }
  }
  return lines.join("\n");
}

test("only src/shared/pdf/fonts.ts calls Font.register and meetings delegates to it (#577)", () => {
  const files = walkTsFiles("src");
  const callers = files.filter((file) => /Font\.register\(/.test(readFileSync(file, "utf8")));
  assert.deepEqual(callers, ["src/shared/pdf/fonts.ts"]);

  const meetingsFonts = readFileSync("src/modules/meetings/pdf/fonts.ts", "utf8");
  assert.match(meetingsFonts, /registerSharedPdfFonts/);
});

test("no Next.js <Link> points to /api/ and LinkButton renders native <a> for /api/ & download (#577)", () => {
  const files = walkTsFiles("src").filter((f) => f.endsWith(".tsx"));
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    const nextLinkApi = /<Link\b[^>]*href=\{?["'`]\/api\//;
    assert.equal(nextLinkApi.test(src), false, `Found Next.js <Link> to /api/ in ${file}`);
  }

  const linkButton = readFileSync("src/shared/components/ui/link-button.tsx", "utf8");
  assert.match(linkButton, /href\.startsWith\("\/api\/"\)/);
  assert.match(linkButton, /<a[\s\S]*download=\{download\}/);

  const nextConfig = readFileSync("next.config.ts", "utf8");
  assert.match(nextConfig, /"\/api\/\*\*":\s*\["\.\/src\/shared\/pdf\/fonts\/\*\*"\]/);
});

test("unified NotoSans PDF registration renders TOP-2026-001, AO, Ort, German & Turkish glyphs intact (#577)", () => {
  const script = `
    import React from "react";
    import { Document, Page, Text, renderToBuffer } from "@react-pdf/renderer";
    import { registerSharedPdfFonts } from "./src/shared/pdf/fonts.ts";

    // Call twice to assert idempotency (matches shared + meetings delegating to registerSharedPdfFonts)
    registerSharedPdfFonts();
    registerSharedPdfFonts();

    const doc = React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: "A4", style: { fontFamily: "NotoSans", fontSize: 11 } },
        React.createElement(Text, null, "TOP-2026-001 AO Ort Körperschaftsteuergesetzes"),
        React.createElement(Text, { style: { fontWeight: 700 } }, "ÄÖÜäöüß ĞğŞşİıÇç Übungsleiter")
      )
    );
    const buf = await renderToBuffer(doc);
    process.stdout.write(buf.toString("base64"));
  `;

  const env = { ...process.env };
  delete env.NODE_OPTIONS; // Avoid tsx/--conditions=react-server CJS interop issue with @react-pdf/hyphenate
  const b64 = execFileSync(
    process.execPath,
    ["--no-warnings", "--experimental-strip-types", "--input-type=module", "-e", script],
    { env, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
  );
  const pdfBuffer = Buffer.from(b64, "base64");
  assert.equal(pdfBuffer.subarray(0, 5).toString("ascii"), "%PDF-");

  const extracted = extractPdfText(pdfBuffer);
  for (const token of ["TOP-2026-001", "AO", "Ort", "Körperschaftsteuergesetzes", "ÄÖÜäöüß", "ĞğŞşİıÇç", "Übungsleiter"]) {
    assert.ok(extracted.includes(token), `Expected PDF text to contain "${token}", got: ${extracted}`);
  }
});
