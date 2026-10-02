import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prismaClient } from "@repo/db/client";


export const auth = betterAuth({
    database: prismaAdapter(prismaClient, {
        provider: "postgresql",
    }),
    trustedOrigins: [
        "http://localhost:5173"
    ],
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        github: {
            clientId: process.env.GITHUB_CLIENT_ID as string,
            clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
        },
    },
    user: {
        additionalFields: {
            role: {
                type: 'string',
                defaultValue: "User"
            }
        }
    }
});
