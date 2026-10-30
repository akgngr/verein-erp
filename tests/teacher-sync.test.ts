import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { splitUserName } from "../src/modules/courses/utils";

describe("Öğretmen ↔ kullanıcı ad senkronu", () => {
  test("son kelime soyad, kalanı ad olur", () => {
    assert.deepEqual(splitUserName("  Ayşe  Nur Yılmaz "), { firstName: "Ayşe Nur", lastName: "Yılmaz" });
  });
  test("tek kelimelik ad soyad alanına yazılır", () => {
    assert.deepEqual(splitUserName("Mehmet"), { firstName: "", lastName: "Mehmet" });
  });
});
