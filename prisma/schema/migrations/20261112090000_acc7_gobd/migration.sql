-- ACC-7: GoBD journal (hash chain), cash closings
-- CreateTable
CREATE TABLE "AccountingJournal" (
    "seq" INTEGER NOT NULL,
    "bookingId" TEXT NOT NULL,
    "bookingNumber" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "snapshotHash" TEXT NOT NULL,
    "prevHash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "actorId" TEXT,
    "actorLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingJournal_pkey" PRIMARY KEY ("seq")
);

-- CreateTable
CREATE TABLE "AccountingCashClosing" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "closingDate" DATE NOT NULL,
    "bookBalanceCents" INTEGER NOT NULL,
    "countedBalanceCents" INTEGER NOT NULL,
    "differenceCents" INTEGER NOT NULL,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountingCashClosing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountingJournal_hash_key" ON "AccountingJournal"("hash");

-- CreateIndex
CREATE INDEX "AccountingJournal_bookingId_idx" ON "AccountingJournal"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingCashClosing_accountId_closingDate_key" ON "AccountingCashClosing"("accountId", "closingDate");


-- GoBD: journal is append-only (no UPDATE / DELETE)
CREATE OR REPLACE FUNCTION accounting_journal_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AccountingJournal is append-only (GoBD)';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER accounting_journal_no_update BEFORE UPDATE OR DELETE ON "AccountingJournal"
  FOR EACH ROW EXECUTE FUNCTION accounting_journal_append_only();

-- Cash closings are final (no UPDATE / DELETE)
CREATE TRIGGER accounting_cash_closing_no_update BEFORE UPDATE OR DELETE ON "AccountingCashClosing"
  FOR EACH ROW EXECUTE FUNCTION accounting_journal_append_only();
