/**
 * passwordSchema'yı her zaman karşılayan rastgele parola üretir (izomorfik; Web Crypto).
 * Karışabilecek karakterler (0/O, 1/l/I) kullanılmaz.
 */
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%*-_+?";
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

function randomIndex(max: number): number {
  const buffer = new Uint32Array(1);
  // Modülo sapmasını önlemek için reddetme örneklemesi.
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return buffer[0] % max;
}

export function generatePassword(length = 16): string {
  const pick = (set: string) => set[randomIndex(set.length)];
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < Math.max(length, 10)) chars.push(pick(ALL));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
