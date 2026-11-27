/**
 * CSV formül enjeksiyonu (#582): `=`, `+`, `-`, `@` ile (baştaki boşluk/kontrol karakterlerinden sonra)
 * başlayan hücre Excel/LibreOffice'te formül olarak çalışır. Böyle bir değerin başına `'` eklenir;
 * yalnız düz işaretli sayılar (`-12,50`) olduğu gibi kalır. Tırnaklama/ayırıcı kaçışı çağıranın işidir.
 */
export function neutralizeCsvFormula(value: string): string {
  const numeric = /^-?\d+(?:[.,]\d+)?$/.test(value);
  return !numeric && /^[\s\u0000-\u001f\u007f-\u009f]*[=+@-]/u.test(value) ? `'${value}` : value;
}
