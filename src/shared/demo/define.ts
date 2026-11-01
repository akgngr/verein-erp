/**
 * Demo veri sözleşmesi: bir modül, src/modules/<modül>/demo.ts içinde `demo` dışa aktararak
 * kendi tablolarına örnek kayıt üretip silebilir. `pnpm module:sync` src/demo-registry.ts'i üretir;
 * "demo" modülü yalnızca oradan okur. Her modül yalnızca KENDİ tablolarına yazar.
 *
 * KVKK: üretilen veriler tamamen kurgusaldır (example.com e-postaları, örnek IBAN, 000 telefonlar).
 */
/** label/number: bağımlı modüllerin (ör. kurs kaydı) karşı tabloya dokunmadan kullanacağı görünen bilgi. */
export type DemoRef = { model: string; id: string; label?: string; number?: string };

export type DemoContext = {
  /** İşlemi başlatan kullanıcı (createdById/Label alanları için). */
  userId: string;
  userLabel: string;
  /** Başka modüllerin bu turda ürettiği kayıtlar (ör. kurs kaydı için öğrenciler). */
  created: Record<string, DemoRef[]>;
  /**
   * Bu modülün ürettiği kayıtlar: oluşturulan her kayıt HEMEN eklenmelidir. Üretim yarıda
   * kalırsa da listedekiler takip edilir ve temizlenebilir.
   */
  refs: DemoRef[];
};

export type ModuleDemo = {
  moduleKey: string;
  /** Küçük olan önce üretilir, sonra silinir (bağımlılar için büyük sıra). */
  order: number;
  seed: (ctx: DemoContext) => Promise<unknown>;
  /** Verilen kayıtları siler; silinemeyenleri döndürür (ör. sonradan gerçek veriye bağlanmış). */
  clear: (refs: DemoRef[]) => Promise<DemoRef[]>;
};

export function defineDemo(demo: ModuleDemo): ModuleDemo {
  return demo;
}

const FIRST_NAMES = [
  "Anna", "Ben", "Clara", "David", "Elif", "Felix", "Greta", "Hasan", "Ida", "Jonas",
  "Kerem", "Lea", "Mehmet", "Nora", "Oskar", "Pia", "Quentin", "Rana", "Selin", "Tim",
  "Umut", "Vera", "Will", "Yasemin", "Zeynep", "Ali", "Berk", "Leonie", "Max", "Sofia",
];
const LAST_NAMES = [
  "Muster", "Beispiel", "Probe", "Testmann", "Demir", "Yılmaz", "Schmidt", "Kaya", "Weber", "Şahin",
  "Fischer", "Öztürk", "Wagner", "Arslan", "Becker", "Koch", "Aydın", "Richter", "Klein", "Wolf",
];
const STREETS = ["Musterstraße", "Beispielweg", "Probeallee", "Testplatz", "Demoring"];
const CITIES: [string, string][] = [["10115", "Berlin"], ["20095", "Hamburg"], ["50667", "Köln"], ["80331", "München"], ["60311", "Frankfurt am Main"]];

/** Deterministik kurgusal kişi; i aynı kaldıkça aynı sonuç. */
export function demoPerson(i: number) {
  const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
  const lastName = LAST_NAMES[(i * 7) % LAST_NAMES.length];
  const [postalCode, city] = CITIES[i % CITIES.length];
  const slug = `${firstName}.${lastName}`.toLowerCase().normalize("NFD").replace(/[^a-z.]/g, "");
  return {
    firstName,
    lastName,
    email: `${slug}${i + 1}@example.com`,
    phone: `+49 30 0000${String(1000 + i).slice(-4)}`,
    street: STREETS[i % STREETS.length],
    houseNumber: String((i % 40) + 1),
    postalCode,
    city,
    country: "DE",
    birthDate: new Date(Date.UTC(1960 + (i % 45), i % 12, (i % 27) + 1)),
  };
}

/** Bankaların dokümantasyonda kullandığı örnek IBAN (gerçek hesap değildir). */
export const DEMO_IBAN = "DE89370400440532013000";
export const DEMO_BIC = "COBADEFFXXX";

export const DEMO_NOTE = "Demo";

export function daysFromNow(days: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Ref listesini model bazında ters sırada siler; hata verenleri döndürür. */
export async function clearRefs(refs: DemoRef[], deleters: Record<string, (ids: string[]) => Promise<unknown>>): Promise<DemoRef[]> {
  const failed: DemoRef[] = [];
  const models = [...new Set(refs.map((r) => r.model))].reverse();
  for (const model of models) {
    const deleter = deleters[model];
    const items = refs.filter((r) => r.model === model);
    if (!deleter) {
      failed.push(...items);
      continue;
    }
    try {
      await deleter(items.map((r) => r.id));
    } catch {
      // Toplu silme başarısızsa tek tek dene: sonradan gerçek veriye bağlanan kayıt kalır.
      for (const item of items) {
        try {
          await deleter([item.id]);
        } catch {
          failed.push(item);
        }
      }
    }
  }
  return failed;
}
