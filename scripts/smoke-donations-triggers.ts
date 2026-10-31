/** Faz 5 Adım 7 smoke testi: şema + tetikleyiciler. */
import { createPrismaClient } from "../src/shared/db-client";

const db = createPrismaClient();

async function main() {
  const donor = await db.donor.create({
    data: {
      donorNumber: 1,
      type: "PERSON",
      firstName: "Test",
      lastName: "Bağışçı",
      createdById: "t",
      createdByLabel: "t",
    },
  });
  console.log("Donor oluşturuldu:", donor.donorNumber);

  // Donation silme engeli (prevent_mutation).
  const donation = await db.donation.create({
    data: {
      donationNumber: "BG-2026-9001",
      year: 2026,
      sequence: 9001,
      donorId: donor.id,
      receivedAt: new Date("2026-03-01T00:00:00Z"),
      amount: "100.00",
      method: "CASH",
      createdById: "t",
      createdByLabel: "t",
    },
  });
  try {
    await db.$executeRawUnsafe(`DELETE FROM "Donation" WHERE id = $1`, donation.id);
    console.log("HATA: Donation silindi (trigger çalışmıyor)");
  } catch {
    console.log("Donation DELETE engeli OK");
  }

  // Bildirim + item: activeKey unique + update koruması.
  const confirmation = await db.zuwendungConfirmation.create({
    data: {
      confirmationNumber: "ZB-2026-9001",
      year: 2026,
      sequence: 9001,
      kind: "SINGLE",
      content: "DONATION",
      donorId: donor.id,
      recipientName: "Test Bağışçı",
      recipientStreet: "X",
      recipientPostalCode: "10115",
      recipientCity: "Berlin",
      periodFrom: new Date("2026-03-01T00:00:00Z"),
      periodTo: new Date("2026-03-01T00:00:00Z"),
      totalAmount: "100.00",
      amountInWords: "ein Euro",
      waivedReimbursement: false,
      issuerSnapshot: {},
      templateVersion: "TEST",
      issuedPlace: "Berlin",
      issuedById: "t",
      issuedByLabel: "t",
      items: {
        create: {
          position: 1,
          itemType: "DONATION",
          sourceId: donation.id,
          itemDate: new Date("2026-03-01T00:00:00Z"),
          amount: "100.00",
          label: "Geldspende",
          waived: false,
          activeKey: "DONATION:" + donation.id,
        },
      },
    },
  });
  console.log("Confirmation oluşturuldu:", confirmation.confirmationNumber);

  try {
    await db.$executeRawUnsafe(
      `UPDATE "ZuwendungConfirmation" SET "recipientName" = $1 WHERE id = $2`,
      "Değişti",
      confirmation.id,
    );
    console.log("HATA: recipientName değişti (trigger çalışmıyor)");
  } catch {
    console.log("Confirmation protected columns OK");
  }

  try {
    await db.$executeRawUnsafe(
      `UPDATE "ZuwendungConfirmationItem" SET "amount" = '50.00' WHERE "confirmationId" = $1`,
      confirmation.id,
    );
    console.log("HATA: Item amount değişti (trigger çalışmıyor)");
  } catch {
    console.log("Item protected columns OK");
  }

  // activeKey NULL'a inebilir mi? (izinli tek değişiklik)
  await db.$executeRawUnsafe(
    `UPDATE "ZuwendungConfirmationItem" SET "activeKey" = NULL WHERE "confirmationId" = $1`,
    confirmation.id,
  );
  console.log("Item activeKey → NULL OK");

  // status ISSUED → CANCELLED izinli; CANCELLED → ISSUED değil.
  await db.zuwendungConfirmation.update({
    where: { id: confirmation.id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  console.log("status ISSUED → CANCELLED OK");
  try {
    await db.zuwendungConfirmation.update({
      where: { id: confirmation.id },
      data: { status: "ISSUED" },
    });
    console.log("HATA: CANCELLED → ISSUED kabul edildi");
  } catch {
    console.log("status CANCELLED → ISSUED engeli OK");
  }

  // Test verilerini temizle (donor Restrict → sırayla silme; trigger DELETE'i
  // engellediği için raw ile de olmaz — test verisi kalır; son ek -9001 numaraları).
  console.log("test verileri (ZB-2026-9001) veritabanında kalır — demo kirliliği yok denecek kadar az");
}

main()
  .catch((error) => {
    console.error("SMOKE FAIL:", error.message.slice(0, 200));
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
