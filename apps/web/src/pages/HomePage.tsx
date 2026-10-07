import LivingNebula from "../components/LivingNebula";
import { useSession, signOut } from "../lib/auth-client";
import { Link, useNavigate } from "react-router-dom";
import { Compass, Plus, LogOut } from "lucide-react";
import FuzzyText from "../components/TextEffect";

export default function HomePage() {
    const { data: session, isPending } = useSession();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await signOut();
        navigate("/login");
    };

    if (isPending) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-[#030014] text-slate-400">
                <div className="flex items-center gap-3">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                    <span>Loading Alterverse...</span>
                </div>
            </div>
        );
    }

    return (
        <LivingNebula
            particleCount={1400}
            trailLength={0.16}
            canvasGlow={25}
        >
            <div className="flex flex-col h-full w-full text-white">

                {/* ──────────────────── Nav ────────────────────── */}
                <header className="flex-none w-full px-8 py-5 flex items-center justify-between">
                    {/* Wordmark */}
                    <span
                        className="select-none font-black uppercase tracking-[0.18em] text-white/80"
                        style={{ fontSize: '0.85rem', letterSpacing: '0.2em' }}
                    >
                        ALTERVERSE
                    </span>

                    {/* User pill / sign-in */}
                    { session?.user && 
                        <div
                            className="flex items-center gap-2.5 px-4 py-1.5 backdrop-blur-md border border-white/10 rounded-lg"
                            style={{ background: 'rgba(255,255,255,0.05)' }}
                        >
                            <span className="text-xs text-slate-300 font-medium">
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
                    }
                </header>

                {/* ── Hero ──────────────────────────────────── */}
                <main className="flex-1 flex flex-col items-center justify-center text-center px-4">

                    {/* Main Title — bottom margin only on heading */}
                    <div className="mb-6">
                        <FuzzyText
                            fontSize="clamp(3rem, 9vw, 7rem)"
                            fontWeight={900}
                            color="#fff"
                            baseIntensity={0.2}
                            hoverIntensity={0.5}
                            enableHover
                            letterSpacing={4}
                            fuzzRange={22}
                        >
                            ALTERVERSE
                        </FuzzyText>
                    </div>

                    {/* Sub-description */}
                    <p
                        className="text-slate-300 max-w-lg leading-relaxed select-none"
                        style={{ fontSize: 'clamp(0.9rem, 1.6vw, 1.05rem)' }}
                    >
                        Your alternate universe is live. Move your avatar, find your crowd,
                        and start hanging out instantly.
                    </p>

                    {/* CTA Buttons — glass morphism */}
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">

                        {/* Primary glass button */}
                        <Link
                            to="/spaces"
                            className="group inline-flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                            style={{
                                background: 'rgba(139,92,246,0.18)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                border: '1px solid rgba(167,139,250,0.35)',
                                boxShadow: '0 0 24px rgba(139,92,246,0.2), inset 0 1px 0 rgba(255,255,255,0.08)',
                            }}
                        >
                            <Compass className="w-4 h-4 group-hover:rotate-45 transition-transform duration-300" />
                            Explore Spaces
                        </Link>

                        {/* Secondary glass button */}
                        <Link
                            to="/app/create-space"
                            className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                            }}
                        >
                            <Plus className="w-4 h-4" />
                            Create Space
                        </Link>
                    </div>
                </main>

                {/* Slim footer */}
                <footer className="flex-none pb-5 text-center" style={{ fontSize: '0.7rem', color: 'rgba(148,163,184,0.35)', letterSpacing: '0.06em' }}>
                    ALTERVERSE ENGINE &nbsp;·&nbsp; REAL-TIME 2D WORLD
                </footer>
            </div>
        </LivingNebula>
    );
}



export const LivingNebulaDemo = () => (
  <LivingNebula
    particleCount={1200}
    trailLength={0.15}
    canvasGlow={20}
    className="flex flex-col items-center justify-center text-center px-4 py-8"
  >
    <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-300">
      Living Nebula
    </h1>
    <p className="mt-4 text-lg text-gray-300 max-w-xl">
      A generative star nursery that pulses with creative energy at the heart of the cosmos.
    </p>
    <button className="mt-8 px-6 py-3 bg-white/10 text-white rounded-lg backdrop-blur-sm border border-white/20 shadow-lg hover:bg-white/20 transition">
      Witness Creation
    </button>
  </LivingNebula>
)