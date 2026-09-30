import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables from .env file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env"); //package level .env file
config({ path: envPath });

const connectionString = process.env.LOCAL_DB;
if (!connectionString || connectionString === "undefined") {
    throw new Error("connection string is required");
}

const adapter = new PrismaPg({ connectionString });
export const prismaClient = new PrismaClient({ adapter });