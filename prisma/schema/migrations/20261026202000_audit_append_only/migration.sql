-- Faz 4 (4.7): Denetim kaydı APEND-ONLY. UPDATE/DELETE veritabanı düzeyinde
-- engellenir (kötü amaçlı ya da kazara mutasyon koruması). Prisma şeması
-- trigger'ları modellemediği için SQL elle yazılır; prisma migrate bu dosyayı
-- sırayla uygular.

CREATE OR REPLACE FUNCTION prevent_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% on % is not allowed (append-only)', TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION prevent_mutation();

CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION prevent_mutation();
