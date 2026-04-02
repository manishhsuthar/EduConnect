-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "attachment" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "subjects" TEXT[],
ADD COLUMN     "year" TEXT;
