import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import dotenv from "dotenv";
import { prismaClient } from "@repo/db/client";

dotenv.config();

export const auth = betterAuth({
  database: prismaAdapter(prismaClient, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "https://alterverse.amnkarn.com",
  trustedOrigins: [
    "http://localhost:5173",
    process.env.BETTER_AUTH_URL || "",
    "https://alterverse.amnkarn.com",
  ].filter(Boolean),
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "User" },
    },
  },
});

