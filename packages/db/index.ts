import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaNeon } from "@prisma/adapter-neon";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("./.env", import.meta.url)) });

const connectionString = process.env.DATABASE_URL;
if (!connectionString || connectionString === "undefined") {
    throw new Error("connection string is required");
}

const adapter = new PrismaNeon({ connectionString });

const prismaClientSingleton = () => {
  return new PrismaClient({ adapter });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prismaClient = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prismaClient;
