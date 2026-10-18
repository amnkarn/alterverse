import { createAuthClient } from "better-auth/react";

export const getBackendUrl = (): string => {
    if (import.meta.env.VITE_BACKEND_URL && !import.meta.env.VITE_BACKEND_URL.includes("localhost")) {
        return import.meta.env.VITE_BACKEND_URL;
    }
    if (typeof window !== "undefined") {
        if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
            return "http://localhost:8080";
        }
        return window.location.origin;
    }
    return "http://localhost:8080";
};

export const authClient = createAuthClient({
    baseURL: getBackendUrl()
});

export const { signIn, signOut, useSession } = authClient;