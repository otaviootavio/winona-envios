-- AlterTable
ALTER TABLE "User" ADD COLUMN     "selectedTeamid" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_selectedTeamid_fkey" FOREIGN KEY ("selectedTeamid") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
