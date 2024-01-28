-- CreateEnum
CREATE TYPE "GateType" AS ENUM ('IS_FOLLOWING', 'FOLLOWED_BY', 'LIKE', 'RECAST');

-- AlterTable
ALTER TABLE "Messages" ADD COLUMN     "gateType" "GateType"[] DEFAULT ARRAY[]::"GateType"[];
