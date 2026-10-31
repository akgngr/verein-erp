-- DÜZELTME: Üye aidat ödemeleri (MemberPayment.amount) kuruş değeri avro olarak yazılıyordu
-- (create-payment.ts: `cents.toFixed(2)` → 50 € = 5000.00). Bu migration'a kadar ödemeyi yazan
-- TEK yol o eylemdi; bu yüzden mevcut tüm kayıtlar 100 katıdır ve 100'e bölünür (tam sayı → kesin).
UPDATE "MemberPayment" SET "amount" = ROUND("amount" / 100, 2);

-- Aidat satırlarının durumu ödemelere göre yeniden hesaplanır (deriveDueStatus ile aynı kural).
WITH paid AS (
  SELECT d."id",
         d."status",
         d."amountDue",
         COALESCE((SELECT SUM(p."amount") FROM "MemberPayment" p
                   WHERE p."memberId" = d."memberId" AND p."dueYear" = d."year" AND p."voidedAt" IS NULL), 0) AS "paidSum"
  FROM "MemberDue" d
)
UPDATE "MemberDue" d
SET "status" = (CASE
  WHEN paid."status" = 'WAIVED' AND paid."paidSum" = 0 THEN 'WAIVED'
  WHEN paid."amountDue" > 0 AND paid."paidSum" >= paid."amountDue" THEN 'PAID'
  WHEN paid."paidSum" > 0 THEN 'PARTIAL'
  ELSE 'OPEN'
END)::"MemberDueStatus"
FROM paid
WHERE paid."id" = d."id";
