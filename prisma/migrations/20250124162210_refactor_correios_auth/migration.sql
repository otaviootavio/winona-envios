/*
  Warnings:

  - You are about to drop the column `userId` on the `CorreiosCredential` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[personalForId]` on the table `Team` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `createdById` to the `CorreiosCredential` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedById` to the `CorreiosCredential` table without a default value. This is not possible if the table is not empty.
  - Made the column `teamId` on table `CorreiosCredential` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "CorreiosCredential" DROP CONSTRAINT "CorreiosCredential_teamId_fkey";

-- DropForeignKey
ALTER TABLE "CorreiosCredential" DROP CONSTRAINT "CorreiosCredential_userId_fkey";

-- DropIndex
DROP INDEX "CorreiosCredential_userId_key";

-- AlterTable
ALTER TABLE "CorreiosCredential" DROP COLUMN "userId",
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "updatedById" TEXT NOT NULL,
ALTER COLUMN "teamId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "personalForId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Team_personalForId_key" ON "Team"("personalForId");

-- AddForeignKey
ALTER TABLE "CorreiosCredential" ADD CONSTRAINT "CorreiosCredential_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorreiosCredential" ADD CONSTRAINT "CorreiosCredential_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorreiosCredential" ADD CONSTRAINT "CorreiosCredential_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_personalForId_fkey" FOREIGN KEY ("personalForId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
