-- This is a manual migration to denormalize the database
-- by removing OrderImport table and adding its fields to Order

-- 1. First fix the drift issue with the User table index
CREATE INDEX IF NOT EXISTS "User_selectedTeamid_idx" ON "User"("selectedTeamid");

-- 2. Fix the Order foreign key issue (first remove the problematic one if it exists)
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_orderImportId_fkey";
ALTER TABLE "Order" ADD CONSTRAINT "Order_orderImportId_fkey" 
FOREIGN KEY ("orderImportId") REFERENCES "OrderImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Now add new columns to Order table
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "fileName" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- 4. Copy data from OrderImport to Order
UPDATE "Order" AS o
SET 
  "fileName" = oi."fileName",
  "userId" = oi."userId"
FROM "OrderImport" AS oi
WHERE o."orderImportId" = oi."id";

-- 5. Verify data has been transferred
-- This is a safety check - run a count to verify all orders have fileName and userId
-- SELECT COUNT(*) FROM "Order" WHERE "fileName" IS NULL OR "userId" IS NULL;
-- If the count is 0, all data was transferred successfully

-- 6. Make the new columns NOT NULL
ALTER TABLE "Order" ALTER COLUMN "fileName" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "userId" SET NOT NULL;

-- 7. Add foreign key for userId
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 8. Create index for userId
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- 9. Remove orderImportId column from Order
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_orderImportId_fkey";
ALTER TABLE "Order" DROP COLUMN "orderImportId";

-- 10. Finally drop the OrderImport table
DROP TABLE "OrderImport";