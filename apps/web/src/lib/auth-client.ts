import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: "import.meta.env.VITE_BACKEND_URL"
});

export const { signIn, signOut, useSession } = authClient;