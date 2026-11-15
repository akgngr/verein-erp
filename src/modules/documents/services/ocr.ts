import "server-only";

import { copyFile, mkdir, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

/**
 * Evrak OCR'ı (docs/specs/DOCUMENTS_AI.md, EV-1). tesseract.js (WASM) + yerel dil paketleri
 * (deu, tur, eng); hiçbir veri dışarı gönderilmez. Taranmış PDF'te sayfa görüntüleri unpdf ile
 * çıkarılır ve BMP'ye çevrilir (ek canvas bağımlılığı yok). Sınırlar: en çok 5 sayfa, 60 sn.
 */
export const OCR_MAX_PAGES = 5;
const OCR_TIMEOUT_MS = 60_000;
const LANGS = ["deu", "tur", "eng"] as const;

export type OcrResult = { text: string; confidence: number; pages: number };

/** Ham piksel (RGBA/RGB/gri) → 24 bit BMP. Saf fonksiyon; test edilir. */
export function rawImageToBmp(image: { width: number; height: number; data: Uint8Array | Uint8ClampedArray }): Buffer {
  const { width, height, data } = image;
  const channels = data.length / (width * height);
  if (!Number.isInteger(channels) || channels < 1 || channels > 4) throw new Error("OCR_IMAGE_FORMAT");
  const row = Math.ceil((width * 3) / 4) * 4;
  const out = Buffer.alloc(54 + row * height);
  out.write("BM", 0, "ascii");
  out.writeUInt32LE(out.length, 2);
  out.writeUInt32LE(54, 10);
  out.writeUInt32LE(40, 14);
  out.writeInt32LE(width, 18);
  out.writeInt32LE(-height, 22); // üstten aşağı
  out.writeUInt16LE(1, 26);
  out.writeUInt16LE(24, 28);
  out.writeUInt32LE(row * height, 34);
  const gray = channels < 3;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const source = (y * width + x) * channels;
      const target = 54 + y * row + x * 3;
      out[target] = data[gray ? source : source + 2];
      out[target + 1] = data[gray ? source : source + 1];
      out[target + 2] = data[source];
    }
  }
  return out;
}

/** tesseract.js tek bir dil klasörü ister; paketlerdeki .gz dosyaları geçici klasörde birleştirilir. */
async function languageDirectory(): Promise<string> {
  const target = path.join(os.tmpdir(), "verein-ocr-lang");
  await mkdir(target, { recursive: true });
  const require = createRequire(import.meta.url);
  for (const lang of LANGS) {
    const file = path.join(target, `${lang}.traineddata.gz`);
    const exists = await stat(file).then((info) => info.size > 0, () => false);
    if (exists) continue;
    // Sıra: OCR_LANG_DIR (işletmeci), paket çözümlemesi, çalışma klasöründeki node_modules.
    const candidates = [
      process.env.OCR_LANG_DIR ? path.join(process.env.OCR_LANG_DIR, `${lang}.traineddata.gz`) : null,
      (() => {
        try {
          return path.join(path.dirname(require.resolve(`@tesseract.js-data/${lang}/package.json`)), "4.0.0_best_int", `${lang}.traineddata.gz`);
        } catch {
          return null;
        }
      })(),
      path.join(process.cwd(), "node_modules", "@tesseract.js-data", lang, "4.0.0_best_int", `${lang}.traineddata.gz`),
    ].filter((candidate): candidate is string => Boolean(candidate));
    let copied = false;
    for (const candidate of candidates) {
      if (await stat(candidate).then((info) => info.size > 0, () => false)) {
        await copyFile(candidate, file);
        copied = true;
        break;
      }
    }
    if (!copied) throw new Error(`OCR_LANGUAGE_DATA_MISSING:${lang}`);
  }
  return target;
}

async function recognizeImages(images: Buffer[]): Promise<OcrResult> {
  const { createWorker } = await import("tesseract.js");
  const langPath = await languageDirectory();
  const worker = await createWorker([...LANGS], 1, { langPath, cachePath: langPath, gzip: true, logger: () => {} });
  const timer = setTimeout(() => void worker.terminate(), OCR_TIMEOUT_MS);
  try {
    const texts: string[] = [];
    let confidence = 0;
    for (const image of images) {
      const { data } = await worker.recognize(image);
      texts.push(data.text.trim());
      confidence += data.confidence;
    }
    return { text: texts.filter(Boolean).join("\n\n"), confidence: images.length ? Math.round(confidence / images.length) : 0, pages: images.length };
  } finally {
    clearTimeout(timer);
    await worker.terminate().catch(() => {});
  }
}

/** Fotoğraf/tarama (JPEG, PNG, …) OCR. */
export async function ocrImage(bytes: Uint8Array): Promise<OcrResult> {
  return recognizeImages([Buffer.from(bytes)]);
}

/** Metin katmanı olmayan PDF: her sayfanın en büyük görüntüsü OCR'a verilir (en çok OCR_MAX_PAGES). */
export async function ocrScannedPdf(bytes: Uint8Array): Promise<OcrResult> {
  const { getDocumentProxy, extractImages } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const images: Buffer[] = [];
  for (let page = 1; page <= Math.min(pdf.numPages, OCR_MAX_PAGES); page++) {
    const found = await extractImages(pdf, page);
    const largest = found.sort((a, b) => b.width * b.height - a.width * a.height)[0];
    if (largest && largest.width >= 200 && largest.height >= 200) images.push(rawImageToBmp(largest));
  }
  return images.length ? recognizeImages(images) : { text: "", confidence: 0, pages: 0 };
}
