import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { prismaClient } from "@repo/db/client";

dotenv.config({
  path: fileURLToPath(new URL("../../backend/.env", import.meta.url)),
});

export const auth = betterAuth({
  database: prismaAdapter(prismaClient, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "User" },
    },
  },
});
