-- A-1.2: Değişmezlik (append-only / GoBD) korumalarının idempotent yeniden tanımı.
--
-- Bu trigger'lar ilk olarak şu migration'larda tanımlandı:
--   20261026202000_audit_append_only, 20261027093000_f4_step7_accounting,
--   20261027110000_f5_step7_donations
-- `prisma db push` trigger'ları OLUŞTURMAZ. Push ile kurulmuş bir veritabanı
-- baseline edildiğinde (docs/operations/MIGRATION_BASELINE.md) bu migration
-- GERÇEKTEN çalıştırılır ve korumaları kurar. Zaten kurulu bir veritabanında
-- çalışması zararsızdır: fonksiyonlar CREATE OR REPLACE, trigger'lar
-- DROP IF EXISTS + CREATE ile aynı tanıma getirilir.
--
-- Fonksiyon gövdeleri kaynak migration'larla BİREBİR aynıdır; burada değiştirilirse
-- scripts/verify-db-integrity.mjs listesi de güncellenmelidir.

-- ---------------------------------------------------------------------------
-- Ortak: append-only koruması
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% on % is not allowed (append-only)', TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Denetim kaydı (AuditLog)
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS audit_log_no_update ON "AuditLog";
CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION prevent_mutation();

DROP TRIGGER IF EXISTS audit_log_no_delete ON "AuditLog";
CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION prevent_mutation();

-- ---------------------------------------------------------------------------
-- Muhasebe (AccountingBooking / AccountingBookingFile)
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS accounting_booking_no_delete ON "AccountingBooking";
CREATE TRIGGER accounting_booking_no_delete
  BEFORE DELETE ON "AccountingBooking"
  FOR EACH ROW EXECUTE FUNCTION prevent_mutation();

DROP TRIGGER IF EXISTS accounting_booking_file_no_delete ON "AccountingBookingFile";
CREATE TRIGGER accounting_booking_file_no_delete
  BEFORE DELETE ON "AccountingBookingFile"
  FOR EACH ROW EXECUTE FUNCTION prevent_mutation();

CREATE OR REPLACE FUNCTION accounting_booking_protected_columns() RETURNS trigger AS $$
BEGIN
  IF NEW."bookingNumber" <> OLD."bookingNumber"
     OR NEW."year" <> OLD."year"
     OR NEW."sequence" <> OLD."sequence"
     OR NEW."createdAt" <> OLD."createdAt" THEN
    RAISE EXCEPTION 'Protected columns of AccountingBooking are immutable (bookingNumber, year, sequence, createdAt)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS accounting_booking_no_renumber ON "AccountingBooking";
CREATE TRIGGER accounting_booking_no_renumber
  BEFORE UPDATE ON "AccountingBooking"
  FOR EACH ROW EXECUTE FUNCTION accounting_booking_protected_columns();

-- ---------------------------------------------------------------------------
-- Bağışlar ve bağış makbuzları (Donation / ZuwendungConfirmation[Item])
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS donations_no_delete ON "Donation";
CREATE TRIGGER donations_no_delete
  BEFORE DELETE ON "Donation"
  FOR EACH ROW EXECUTE FUNCTION prevent_mutation();

DROP TRIGGER IF EXISTS zuwendung_confirmation_no_delete ON "ZuwendungConfirmation";
CREATE TRIGGER zuwendung_confirmation_no_delete
  BEFORE DELETE ON "ZuwendungConfirmation"
  FOR EACH ROW EXECUTE FUNCTION prevent_mutation();

DROP TRIGGER IF EXISTS zuwendung_confirmation_item_no_delete ON "ZuwendungConfirmationItem";
CREATE TRIGGER zuwendung_confirmation_item_no_delete
  BEFORE DELETE ON "ZuwendungConfirmationItem"
  FOR EACH ROW EXECUTE FUNCTION prevent_mutation();

CREATE OR REPLACE FUNCTION confirmation_protected_columns() RETURNS trigger AS $$
BEGIN
  IF NEW."confirmationNumber" <> OLD."confirmationNumber"
     OR NEW."year" <> OLD."year"
     OR NEW."sequence" <> OLD."sequence"
     OR NEW."kind"::text <> OLD."kind"::text
     OR NEW."content"::text <> OLD."content"::text
     OR NEW."donorId" IS DISTINCT FROM OLD."donorId"
     OR NEW."memberId" IS DISTINCT FROM OLD."memberId"
     OR NEW."recipientName" <> OLD."recipientName"
     OR NEW."recipientStreet" <> OLD."recipientStreet"
     OR NEW."recipientPostalCode" <> OLD."recipientPostalCode"
     OR NEW."recipientCity" <> OLD."recipientCity"
     OR NEW."recipientCountry" IS DISTINCT FROM OLD."recipientCountry"
     OR NEW."periodFrom" <> OLD."periodFrom"
     OR NEW."periodTo" <> OLD."periodTo"
     OR NEW."totalAmount" <> OLD."totalAmount"
     OR NEW."amountInWords" <> OLD."amountInWords"
     OR NEW."waivedReimbursement" <> OLD."waivedReimbursement"
     OR NEW."issuerSnapshot" IS DISTINCT FROM OLD."issuerSnapshot"
     OR NEW."templateVersion" <> OLD."templateVersion"
     OR NEW."issuedAt" <> OLD."issuedAt"
     OR NEW."issuedPlace" <> OLD."issuedPlace"
     OR NEW."issuedById" <> OLD."issuedById"
     OR NEW."issuedByLabel" <> OLD."issuedByLabel" THEN
    RAISE EXCEPTION 'Protected columns of ZuwendungConfirmation are immutable';
  END IF;
  IF OLD."pdfStoragePath" IS NULL AND NEW."pdfStoragePath" IS NOT NULL THEN
    -- NULL → değer: depolanmış PDF yazımı (izinli; sonrası değişmez).
    NULL;
  ELSIF NEW."pdfStoragePath" IS DISTINCT FROM OLD."pdfStoragePath"
     OR NEW."pdfSha256" IS DISTINCT FROM OLD."pdfSha256"
     OR NEW."pdfSize" IS DISTINCT FROM OLD."pdfSize" THEN
    RAISE EXCEPTION 'PDF columns of ZuwendungConfirmation may only change from NULL to a value once';
  END IF;
  IF OLD."status"::text = 'ISSUED' AND NEW."status"::text = 'CANCELLED' THEN
    -- ISSUED → CANCELLED izinli.
    NULL;
  ELSIF OLD."status"::text <> NEW."status"::text THEN
    RAISE EXCEPTION 'Status of ZuwendungConfirmation may only change ISSUED to CANCELLED';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS zuwendung_confirmation_protected ON "ZuwendungConfirmation";
CREATE TRIGGER zuwendung_confirmation_protected
  BEFORE UPDATE ON "ZuwendungConfirmation"
  FOR EACH ROW EXECUTE FUNCTION confirmation_protected_columns();

CREATE OR REPLACE FUNCTION confirmation_item_protected() RETURNS trigger AS $$
BEGIN
  IF NEW."confirmationId" <> OLD."confirmationId"
     OR NEW."position" <> OLD."position"
     OR NEW."itemType"::text <> OLD."itemType"::text
     OR NEW."sourceId" <> OLD."sourceId"
     OR NEW."itemDate" <> OLD."itemDate"
     OR NEW."amount" <> OLD."amount"
     OR NEW."label" <> OLD."label"
     OR NEW."waived" <> OLD."waived" THEN
    RAISE EXCEPTION 'Columns of ZuwendungConfirmationItem other than activeKey are immutable';
  END IF;
  IF OLD."activeKey" IS NOT NULL AND NEW."activeKey" IS NOT NULL THEN
    RAISE EXCEPTION 'activeKey of ZuwendungConfirmationItem may only change to NULL';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS zuwendung_confirmation_item_protected ON "ZuwendungConfirmationItem";
CREATE TRIGGER zuwendung_confirmation_item_protected
  BEFORE UPDATE ON "ZuwendungConfirmationItem"
  FOR EACH ROW EXECUTE FUNCTION confirmation_item_protected();
