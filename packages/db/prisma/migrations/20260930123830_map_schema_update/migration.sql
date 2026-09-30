/*
  Warnings:

  - Made the column `y` on table `MapElements` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "MapElements" ALTER COLUMN "y" SET NOT NULL;
