import { authClient } from "../lib/auth-client";

export interface SignInPayload {
    email: string;
    password: string;
}

export interface SignUpPayload {
    name: string;
    email: string;
    password: string;
}

export interface AuthResponse {
    success: boolean;
    user?: {
        id?: string;
        email?: string;
        name?: string;
        username?: string;
        role?: string;
    };
    message: string;
}


export async function signin(payload: SignInPayload): Promise<AuthResponse> {
    const { email, password } = payload;

    const { data, error } = await authClient.signIn.email({
        email: email,
        password: password,
    });

    if(error) {
        return { 
            success: false, 
            message: error.message || "Signin failed" 
        };
    }

    if (data?.user) {
        return {
            success: true,
            user: data.user,
            message: "Successfully loged in"
        };
    }

    return { success: false, message: "Something went wrong" }


}

export async function signup(payload: SignUpPayload): Promise<AuthResponse> {
    const email = payload.email;
    const name = payload.name;

    const { data, error } = await authClient.signUp.email({
        email,
        password: payload.password,
        name,
    });

    if(error) {
        return { 
            success: false, 
            message: error.message || "Signup failed" 
        };
    }
    
    if (data?.user) {
        return { 
            success: true, 
            user: data.user,
            message: "Successfully registered!" 
        };
    }

    return { success: false, message: "Something went wrong" };
}