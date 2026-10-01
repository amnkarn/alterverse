import { authClient } from "../lib/auth";

export interface SignInPayload {
    email?: string;
    username?: string;
    password: string;
}

export interface SignUpPayload {
    name?: string;
    email?: string;
    username?: string;
    password: string;
    type?: "user" | "admin";
}

export interface AuthResponse {
    user?: {
        id?: string;
        email?: string;
        name?: string;
        username?: string;
    };
    token?: string;
    userId?: string;
    message?: string;
}

const BACKEND_URL = "http://localhost:8080";

export async function signin(payload: SignInPayload): Promise<AuthResponse> {
    const identifier = payload.email || payload.username || "";
    
    // 1. Try better-auth client first if email format is provided
    try {
        if (identifier.includes("@")) {
            const res = await authClient.signIn.email({
                email: identifier,
                password: payload.password,
            });
            if (res.data?.user) {
                return { user: res.data.user };
            }
        }
    } catch {
        // Fallback to manual API
    }

    // 2. Direct REST fallback to backend /api/v1/signin or better-auth endpoint
    const response = await fetch(`${BACKEND_URL}/api/v1/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: identifier,
            password: payload.password,
        }),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || "Failed to sign in. Please verify your credentials.");
    }

    if (data.token) {
        localStorage.setItem("alterverse_token", data.token);
        return { token: data.token, user: { id: "user", username: identifier } };
    }

    return { user: data.user || { id: "user", username: identifier } };
}

export async function signup(payload: SignUpPayload): Promise<AuthResponse> {
    const email = payload.email || `${payload.username || "user"}@alterverse.dev`;
    const name = payload.name || payload.username || "Avatar";
    const username = payload.username || payload.name?.toLowerCase().replace(/\s+/g, "_") || email.split("@")[0] || "avatar";

    // 1. Try better-auth first
    try {
        const res = await authClient.signUp.email({
            email,
            password: payload.password,
            name,
        });
        if (res.data?.user) {
            return { user: res.data.user };
        }
    } catch {
        // Fallback to manual API
    }

    // 2. Direct REST fallback to backend /api/v1/signup
    const response = await fetch(`${BACKEND_URL}/api/v1/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username,
            password: payload.password,
            type: payload.type || "user",
        }),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || "Failed to create account. Please try another username.");
    }

    return { userId: data.userId, user: { id: data.userId, username, name } };
}