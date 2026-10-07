import { Link, useNavigate } from "react-router-dom";
import LivingNebula from "../components/LivingNebula";
import { useSession, signOut } from "../lib/auth-client";
import {  
    LogOut, 
    ArrowLeft
} from "lucide-react";

export default function CreateSpacePage() {
    const { data: session } = useSession();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await signOut();
        navigate("/login");
    };

    return (
        <LivingNebula
            particleCount={1200}
            trailLength={0.16}
            canvasGlow={25}
        >
            <div className="flex flex-col h-full w-full text-white">
                {/* ── Top Navigation Bar ────────────────────────────── */}
                <header className="flex-none w-full px-6 sm:px-8 py-4 flex items-center justify-between border-b border-white/5 backdrop-blur-sm">
                    <Link 
                        to="/app"
                        className="select-none font-black uppercase tracking-[0.2em] text-white/90 hover:text-white transition text-xs sm:text-sm"
                    >
                        ALTERVERSE
                    </Link>

                    <div className="flex items-center gap-3">
                        { session?.user && (
                            <div
                                className="flex items-center gap-2 px-3 py-1.5 backdrop-blur-md border border-white/10 rounded-lg text-xs"
                                style={{ background: "rgba(255,255,255,0.05)" }}
                            >
                                <span className="text-slate-300 font-medium">
                                    {session.user.name || session.user.email}
                                </span>
                                <button
                                    onClick={handleLogout}
                                    className="text-slate-500 hover:text-rose-400 transition cursor-pointer"
                                    title="Sign out"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                {/* ── Main Centered Window ──────────────────────────── */}
                <main className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                    <div 
                        className="w-full max-w-[37rem] max-h-[82vh] flex flex-col rounded-2xl overflow-hidden border border-white/10 shadow-2xl backdrop-blur-xl"
                        style={{
                            background: "rgba(9, 7, 24, 0.72)",
                            boxShadow: "0 18px 48px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
                        }}
                    >
                        <div className="px-5 pt-5 pb-3.5 flex flex-col">
                            <ArrowLeft className="scale-100 hover:scale-125 transition-transform" onClick={() => navigate("/spaces")} />
                            <div className="py-5 place-self-center">
                                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                                    <span className="font-semibold pl-3">Create Custom Room</span>
                                </h2>
                                <p className="text-sm">Currently this feature is not available</p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </LivingNebula>
    );
}