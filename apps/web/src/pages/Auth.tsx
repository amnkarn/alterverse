import * as React from "react";
import { useState, useId, useEffect } from "react";
import { ArrowLeft, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { signin, signup, type SignInPayload, type SignUpPayload } from "../api/auth.api";
import GithubIcon from "../assets/icons/Github";
import { signIn } from "../lib/auth-client";

type ClassValue = string | false | null | undefined;

function cn(...inputs: ClassValue[]) {
    return inputs.filter(Boolean).join(" ");
}

export interface TypewriterProps {
    text: string | string[];
    speed?: number;
    cursor?: string;
    loop?: boolean;
    deleteSpeed?: number;
    delay?: number;
    className?: string;
}

export function Typewriter({
    text,
    speed = 100,
    cursor = "|",
    loop = false,
    deleteSpeed = 50,
    delay = 1500,
    className,
}: TypewriterProps) {
    const [displayText, setDisplayText] = useState("");
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [textArrayIndex, setTextArrayIndex] = useState(0);

    const textArray = Array.isArray(text) ? text : [text];
    const currentText = textArray[textArrayIndex] || "";

    useEffect(() => {
        if (!currentText) return;

        const timeout = setTimeout(
            () => {
                if (!isDeleting) {
                    if (currentIndex < currentText.length) {
                        setDisplayText((prev) => prev + currentText[currentIndex]);
                        setCurrentIndex((prev) => prev + 1);
                    } else if (loop) {
                        setTimeout(() => setIsDeleting(true), delay);
                    }
                } else {
                    if (displayText.length > 0) {
                        setDisplayText((prev) => prev.slice(0, -1));
                    } else {
                        setIsDeleting(false);
                        setCurrentIndex(0);
                        setTextArrayIndex((prev) => (prev + 1) % textArray.length);
                    }
                }
            },
            isDeleting ? deleteSpeed : speed,
        );

        return () => clearTimeout(timeout);
    }, [
        currentIndex,
        isDeleting,
        currentText,
        loop,
        speed,
        deleteSpeed,
        delay,
        displayText,
        text,
        textArray.length,
    ]);

    return (
        <span className={className}>
            {displayText}
            <span className="animate-pulse">{cursor}</span>
        </span>
    );
}

const Label = React.forwardRef<
    HTMLLabelElement,
    React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
    <label
        ref={ref}
        className={cn("text-sm font-medium leading-none", className)}
        {...props}
    />
));
Label.displayName = "Label";

const buttonVariants = ({ variant, size, className }: { variant?: string; size?: string; className?: string }) => cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
    variant === "link" ? "text-red-300 underline-offset-4 hover:text-red-200 hover:underline" : "border border-slate-700 bg-transparent hover:bg-white/5",
    size === "lg" ? "h-12 rounded-md px-6" : "h-10 px-4 py-2",
    className,
);
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: string;
    size?: string;
}
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, ...props }, ref) => {
        return <button className={buttonVariants({ variant, size, className })} ref={ref} {...props} />;
    }
);
Button.displayName = "Button";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex h-10 w-full rounded-lg border border-slate-700 bg-transparent px-3 py-3 text-sm text-slate-200 shadow-sm shadow-black/5 transition-shadow placeholder:text-slate-600 focus:border-red-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
Input.displayName = "Input";

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}
const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
    ({ className, label, ...props }, ref) => {
        const id = useId();
        const [showPassword, setShowPassword] = useState(false);
        const togglePasswordVisibility = () => setShowPassword((prev) => !prev);
        return (
            <div className="grid w-full items-center gap-2">
                {label && <Label htmlFor={id}>{label}</Label>}
                <div className="relative">
                    <Input id={id} type={showPassword ? "text" : "password"} className={cn("pe-10", className)} ref={ref} {...props} />
                    <button type="button" onClick={togglePasswordVisibility} className="absolute inset-y-0 end-0 flex h-full w-10 items-center justify-center text-slate-500 transition-colors hover:text-slate-200 focus-visible:text-slate-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50" aria-label={showPassword ? "Hide password" : "Show password"}>
                        {showPassword ? (<EyeOff className="size-4" aria-hidden="true" />) : (<Eye className="size-4" aria-hidden="true" />)}
                    </button>
                </div>
            </div>
        );
    }
);
PasswordInput.displayName = "PasswordInput";



function GithubButton({ onClick, disabled }: { onClick?: () => void; disabled?: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="flex h-10 w-full items-center justify-center gap-2.5 rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500 active:scale-[0.99] disabled:opacity-50"
        >
            <GithubIcon className="h-4 w-4 fill-current" />
            <span>Continue with GitHub</span>
        </button>
    );
}

function FormDivider({ text = "or continue with email" }: { text?: string }) {
    return (
        <div className="relative my-0.5 flex items-center justify-center">
            <div className="w-full border-t border-slate-800" />
            <span className="absolute bg-[#030712] px-3 text-xs uppercase tracking-wider text-slate-500">
                {text}
            </span>
        </div>
    );
}

//===============================SIGNIN FORM==================================
function SignInForm({
    onSubmit,
    isSubmitting,
    onGithubLogin,
}: {
    onSubmit: (payload: SignInPayload) => Promise<void>;
    isSubmitting: boolean;
    onGithubLogin?: () => void;
}) {
    const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        await onSubmit({
            email: String(formData.get("email") || ""),
            password: String(formData.get("password") || ""),
        });
    };
    return (
        <form onSubmit={handleSignIn} autoComplete="on" className="flex flex-col gap-5">
            <div className="flex flex-col items-center gap-2 text-center w-full">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">Sign in to your account</h1>
                <p className="text-sm text-slate-400 max-w-sm leading-relaxed">Enter your credentials to connect with friends in the alterverse.</p>
            </div>

            <GithubButton onClick={onGithubLogin} disabled={isSubmitting} />

            <FormDivider text="or continue with email" />

            <div className="grid gap-3.5">
                <div className="grid gap-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" placeholder="m@example.com" required autoComplete="email" />
                </div>
                <PasswordInput name="password" label="Password" required minLength={6} autoComplete="current-password" placeholder="At least 6 characters" />
                <Button type="submit" variant="outline" className="mt-1 w-full" disabled={isSubmitting} aria-busy={isSubmitting}>
                    {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {isSubmitting ? "Signing in..." : "Sign In"}
                </Button>
            </div>
        </form>
    );
}


//===============================SIGNUP FORM==================================
function SignUpForm({
    onSubmit,
    isSubmitting,
    onGithubLogin,
}: {
    onSubmit: (payload: SignUpPayload) => Promise<void>;
    isSubmitting: boolean;
    onGithubLogin?: () => void;
}) {
    const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        await onSubmit({
            email: String(formData.get("email") || ""),
            name: String(formData.get("name") || ""),
            password: String(formData.get("password") || ""),
        });
    };
    return (
        <form onSubmit={handleSignUp} autoComplete="on" className="flex flex-col gap-3">
            <div className="flex flex-col items-center text-center w-full">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">Create an account</h1>
                <p className="text-sm text-slate-400 max-w-sm leading-relaxed">Join the alterverse to explore virtual spaces and hang out in real-time.</p>
            </div>

            <GithubButton onClick={onGithubLogin} disabled={isSubmitting} />

            <FormDivider text="or continue with email" />

            <div className="grid gap-3.5 mt-2">
                <div className="grid gap-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" placeholder="m@example.com" required autoComplete="email" />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" name="name" type="text" placeholder="Aman" required />
                </div>
                <PasswordInput name="password" label="Password" required minLength={6} autoComplete="new-password" placeholder="At least 6 characters" />
                <Button type="submit" variant="outline" className="mt-1 w-full" disabled={isSubmitting} aria-busy={isSubmitting}>
                    {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {isSubmitting ? "Creating account..." : "Sign Up"}
                </Button>
            </div>
        </form>
    );
}


//====================AUTH FORM CONTAINER STORING FORM AND SUBMIT BUTTON==========================
function AuthFormContainer({
    isSignIn,
    onToggle,
    onGithubLogin,
}: {
    isSignIn: boolean;
    onToggle: () => void;
    onGithubLogin?: () => void;
}) {
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleManualLogin = async (payload: SignInPayload) => {
        console.log(payload);
        setIsSubmitting(true);
        setError("");
        try {
            const response = await signin(payload);
            if (response.user) {
                navigate("/space");
            }
        } catch (requestError) {
            setError(requestError instanceof Error && requestError.message !== "Failed to fetch"
                ? requestError.message
                : "Unable to reach the authentication service. Make sure the backend is running.");
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleManualRegister = async (payload: SignUpPayload) => {
        console.log(payload);
        setIsSubmitting(true);
        setError("");
        try {
            const response = await signup(payload);
            if (response.user) {
                navigate("/space");
            }
        } catch (requestError) {
            setError(requestError instanceof Error && requestError.message !== "Failed to fetch"
                ? requestError.message
                : "Unable to reach the authentication service. Make sure the backend is running.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="mx-auto grid w-full max-w-105 px-4 sm:px-2 gap-3">
            {isSignIn ? (
                // onSubmit return's email and passowrd
                <SignInForm onSubmit={handleManualLogin} isSubmitting={isSubmitting} onGithubLogin={onGithubLogin} />
            ) : (
                // onSubmit return's email, name and passowrd
                <SignUpForm onSubmit={handleManualRegister} isSubmitting={isSubmitting} onGithubLogin={onGithubLogin} />
            )}
            {error && <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-sm text-red-300">{error}</p>}
            <div className="text-center text-sm">
                {isSignIn ? "Don't have an account?" : "Already have an account?"}{" "}
                <Button variant="link" className="pl-1 text-red-300" onClick={onToggle}>
                    {isSignIn ? "Sign up" : "Sign in"}
                </Button>
            </div>
        </div>
    );
}

interface AuthContentProps {
    image?: {
        src: string;
        alt: string;
    };
    quote?: {
        text: string;
        author: string;
    }
}

interface AuthUIProps {
    signInContent?: AuthContentProps;
    signUpContent?: AuthContentProps;
}

const defaultSignInContent = {
    image: {
        src: "https://cdn.21st.dev/assets/mirror/39/39e7b0edd6a7156713d08ec970769bf29360427d3dc8523ee32079885ccca5dd.png",
        alt: "Alterverse 2D virtual space"
    },
    quote: {
        text: "A living 2D virtual space to hang out, play, and connect with friends in real-time.",
        author: "Alterverse"
    }
};

const defaultSignUpContent = {
    image: {
        src: "https://cdn.21st.dev/assets/mirror/c7/c7cb3a073970aa03472c652391db88fbbe39f1e33c8deb336a9c8e53b039ee01.png",
        alt: "Alterverse avatar exploration"
    },
    quote: {
        text: "Step inside interactive virtual worlds and explore with your friends.",
        author: "Alterverse"
    }
};

//=============================AUTH MAIN COMPONENT===========================================

export default function AuthPage({ signInContent = {}, signUpContent = {} }: AuthUIProps) {
    const [loading, setLoading] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const isRegisterRoute = location.pathname === "/register" || location.pathname.includes("signup");
    const isSignIn = !isRegisterRoute;

    const toggleForm = () => {
        navigate(isSignIn ? "/register" : "/login");
    };

    const finalSignInContent = {
        image: { ...defaultSignInContent.image, ...signInContent.image },
        quote: { ...defaultSignInContent.quote, ...signInContent.quote },
    };
    const finalSignUpContent = {
        image: { ...defaultSignUpContent.image, ...signUpContent.image },
        quote: { ...defaultSignUpContent.quote, ...signUpContent.quote },
    };

    async function handleGithubLogin() {
        try {
            setLoading(true);
            await signIn.social({
                provider: "github",
                // The OAuth callback is handled by the backend, but the final
                // redirect must return the user to the frontend.
                callbackURL: "http://localhost:5173/"
            })
        } catch (error) {
            console.log(error);
            alert("Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    const currentContent = isSignIn ? finalSignInContent : finalSignUpContent;

    if(loading) {
        //console.log(loading);
    }

    return (
        <div className="w-full h-screen max-h-screen overflow-hidden bg-[#030712] text-slate-200 md:grid md:grid-cols-2">
            <style>{`
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear {
          display: none;
        }
      `}</style>
            <div className="relative flex h-full max-h-screen items-center justify-center overflow-hidden bg-[#030712] p-6 md:h-full md:p-0 md:py-12">
                <div className="pointer-events-none absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-red-600/15 blur-[120px]" aria-hidden="true" />
                <Link to="/" className="absolute left-6 top-6 inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-red-300 sm:left-10 lg:left-24">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Back to home
                </Link>
                <AuthFormContainer isSignIn={isSignIn} onToggle={toggleForm} onGithubLogin={handleGithubLogin} />
            </div>

            <div
                className="hidden md:block relative bg-cover bg-center transition-all duration-500 ease-in-out h-full max-h-screen overflow-hidden"
                style={{ backgroundImage: `url(${currentContent.image.src})` }}
                key={currentContent.image.src}
            >

                <div className="absolute inset-x-0 bottom-0 h-25 bg-linear-to-t from-[#030712] to-transparent" />

                <div className="relative z-10 flex h-full flex-col items-center justify-end p-2 pb-6">
                    <blockquote className="space-y-2 text-center text-slate-100">
                        <p className="text-lg font-medium">
                            “<Typewriter
                                key={currentContent.quote.text}
                                text={currentContent.quote.text}
                                speed={60}
                            />”
                        </p>
                        <cite className="block text-sm font-light text-slate-400 not-italic">
                            — {currentContent.quote.author}
                        </cite>
                    </blockquote>
                </div>
            </div>
        </div>
    );
}
