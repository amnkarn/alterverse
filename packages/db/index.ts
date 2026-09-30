import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(import.meta.dir, ".env") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString || connectionString === "undefined") {
    throw new Error("connection string is required");
}

const adapter = new PrismaPg({ connectionString });
export const prismaClient = new PrismaClient({ adapter });