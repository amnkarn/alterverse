import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import LivingNebula from "../components/LivingNebula";
import { fetchAllSpace, type SpaceItem } from "../api/space.api";
import { useSession, signOut } from "../lib/auth-client";
import { 
    Compass, 
    ArrowRight, 
    Users, 
    Layers, 
    Plus, 
    LogOut, 
    Search,
    RefreshCw
} from "lucide-react";

export default function SpaceListPage() {
    const [spaces, setSpaces] = useState<SpaceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const { data: session } = useSession();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await signOut();
        navigate("/login");
    };

    useEffect(() => {
        let isMounted = true;
        fetchAllSpace()
            .then((res) => {
                if (isMounted) {
                    setSpaces(res || []);
                    setLoading(false);
                }
            })
            .catch((err) => {
                console.error("Failed to fetch spaces:", err);
                if (isMounted) {
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const handleRefresh = async () => {
        setLoading(true);
        try {
            const res = await fetchAllSpace();
            setSpaces(res || []);
        } catch (error) {
            console.error("Failed to fetch spaces:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredSpaces = spaces.filter((space) => 
        space.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                        <Link
                            to="/app/create-space"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 hover:text-white transition-all duration-200"
                            style={{
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.12)",
                            }}
                        >
                            <Plus className="w-3.5 h-3.5 text-purple-400" />
                            <span>Create Space</span>
                        </Link>

                        {session?.user ? (
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
                        ) : (
                            <Link
                                to="/login"
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/25 backdrop-blur-md transition text-white/80 hover:text-white"
                                style={{ background: "rgba(255,255,255,0.05)" }}
                            >
                                Sign In
                            </Link>
                        )}
                    </div>
                </header>

                {/* ── Main Centered Window ──────────────────────────── */}
                <main className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                    {/* The Center Card Shell */}
                    <div 
                        className="w-full max-w-[37rem] max-h-[82vh] flex flex-col rounded-2xl overflow-hidden border border-white/10 shadow-2xl backdrop-blur-xl"
                        style={{
                            background: "rgba(9, 7, 24, 0.72)",
                            boxShadow: "0 18px 48px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
                        }}
                    >
                        {/* Card Header */}
                        <div className="px-5 pt-5 pb-3.5 border-b border-white/5 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                                        <span>Available Spaces</span>
                                        <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/25 text-purple-300">
                                            {filteredSpaces.length}
                                        </span>
                                    </h2>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Select any virtual space to enter and join live
                                    </p>
                                </div>

                                <button 
                                    onClick={handleRefresh}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
                                    title="Refresh spaces"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                                </button>
                            </div>

                            {/* Search Bar inside card */}
                            <div 
                                className="relative flex items-center rounded-lg border border-white/10 px-3 py-1.5 transition focus-within:border-purple-400/50"
                                style={{ background: "rgba(255,255,255,0.04)" }}
                            >
                                <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                                <input
                                    type="text"
                                    placeholder="Filter by name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
                                />
                                {searchQuery && (
                                    <button 
                                        onClick={() => setSearchQuery("")}
                                        className="text-[10px] text-slate-400 hover:text-slate-200"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Card Body: Scrollable list of spaces */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 divide-y divide-white/5">
                            {loading ? (
                                <div className="flex flex-col gap-2 py-3">
                                    {[1, 2, 3, 4].map((n) => (
                                        <div
                                            key={n}
                                            className="w-full h-16 rounded-xl animate-pulse"
                                            style={{ background: "rgba(255,255,255,0.04)" }}
                                        />
                                    ))}
                                </div>
                            ) : filteredSpaces.length === 0 ? (
                                <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3">
                                        <Compass className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <p className="text-sm font-semibold text-white">
                                        {searchQuery ? "No matching spaces found" : "No spaces available yet"}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1 max-w-xs mb-4">
                                        {searchQuery 
                                            ? `No space matches "${searchQuery}".`
                                            : "Create the very first universe room to start hanging out."}
                                    </p>
                                    <Link
                                        to="/app/create-space"
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition hover:scale-[1.02]"
                                        style={{
                                            background: "rgba(139,92,246,0.3)",
                                            border: "1px solid rgba(167,139,250,0.4)",
                                        }}
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Create a Space</span>
                                    </Link>
                                </div>
                            ) : (
                                filteredSpaces.map((space) => (
                                    <div
                                        key={space.id}
                                        className="group flex items-center justify-between py-3 px-2 hover:bg-white/[0.04] rounded-xl transition duration-150"
                                    >
                                        {/* Left: Thumbnail & Name */}
                                        <div className="flex items-center gap-3.5 min-w-0 pr-3">
                                            {/* Larger Image display */}
                                            <div className="relative w-16 h-16 sm:w-20 sm:h-16 shrink-0 rounded-xl overflow-hidden border border-white/10 bg-slate-900/60 shadow-inner">
                                                {space.thumbnail ? (
                                                    <img
                                                        src={space.thumbnail}
                                                        alt={space.name}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                                        onError={(e) => {
                                                            (e.target as HTMLElement).style.display = "none";
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/30 to-indigo-950/40">
                                                        <Layers className="w-6 h-6 text-purple-400/80" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm sm:text-base font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
                                                        {space.name}
                                                    </span>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Active Space" />
                                                </div>

                                                <div className="flex items-center gap-2.5 text-[11px] text-slate-400 mt-1">
                                                    {space.dimension && (
                                                        <span>{space.dimension}</span>
                                                    )}
                                                    {space.dimension && <span>•</span>}
                                                    <span className="flex items-center gap-1">
                                                        <Users className="w-3 h-3 text-slate-500" />
                                                        <span>Public</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Action button to enter */}
                                        <Link
                                            to={`/app/spaces/${space.id}`}
                                            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition hover:scale-[1.03] active:scale-[0.98]"
                                            style={{
                                                background: "rgba(139,92,246,0.22)",
                                                border: "1px solid rgba(167,139,250,0.38)",
                                                boxShadow: "0 0 14px rgba(139,92,246,0.18)",
                                            }}
                                        >
                                            <span>Enter</span>
                                            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                        </Link>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Card Footer */}
                        <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 bg-white/[0.01]">
                            <span>Alterverse Arena Engine</span>
                            <Link
                                to="/app/create-space"
                                className="text-purple-300 hover:text-purple-200 transition font-medium flex items-center gap-1"
                            >
                                <Plus className="w-3 h-3" />
                                <span>New Space</span>
                            </Link>
                        </div>
                    </div>
                </main>
            </div>
        </LivingNebula>
    );
}