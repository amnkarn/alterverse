import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import LivingNebula from "../components/LivingNebula";
import { useSession, signOut } from "../lib/auth-client";
import { 
    ArrowLeft, 
    ArrowRight, 
    Check, 
    LogOut, 
    RefreshCw 
} from "lucide-react";
import { fetchAllAvatar, type AvtarItem } from "../api/avatar.api";

export default function SpacePage() {
    const { spaceId } = useParams<{ spaceId: string }>();
    const navigate = useNavigate();
    const { data: session } = useSession();

    const [avatars, setAvatars] = useState<AvtarItem[]>([]);
    const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
    const [userEnteredName, setUserEnteredName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Default to stored name or session user name
    const defaultName = localStorage.getItem("alterverse_display_name") || session?.user?.name || "";
    const displayName = userEnteredName !== null ? userEnteredName : defaultName;

    const handleLogout = async () => {
        await signOut();
        navigate("/login");
    };

    useEffect(() => {
        let isMounted = true;
        fetchAllAvatar()
            .then((res) => {
                if (isMounted) {
                    const avatarList = res || [];
                    setAvatars(avatarList);
                    if (avatarList.length > 0) {
                        const storedAvatarId = localStorage.getItem("alterverse_avatar_id");
                        const matched = avatarList.find((a) => a.id === storedAvatarId);
                        setSelectedAvatarId(matched ? matched.id : avatarList[0].id);
                    }
                    setLoading(false);
                }
            })
            .catch((err) => {
                console.error("Failed to fetch avatars:", err);
                if (isMounted) {
                    setError("Failed to load avatars. Please try again.");
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const refreshAvatars = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchAllAvatar();
            const avatarList = res || [];
            setAvatars(avatarList);
            if (avatarList.length > 0 && !selectedAvatarId) {
                setSelectedAvatarId(avatarList[0].id);
            }
        } catch (err) {
            console.error("Failed to refresh avatars:", err);
            setError("Failed to refresh avatars");
        } finally {
            setLoading(false);
        }
    };

    const selectedAvatar = avatars.find((a) => a.id === selectedAvatarId);

    const handleJoinArena = () => {
        if (!spaceId) {
            setError("No space selected");
            return;
        }

        const trimmedName = displayName.trim();
        if (!trimmedName) {
            setError("Please enter a display name");
            return;
        }

        if (!selectedAvatarId) {
            setError("Please select an avatar");
            return;
        }

        localStorage.setItem("alterverse_display_name", trimmedName);
        localStorage.setItem("alterverse_avatar_id", selectedAvatarId);

        navigate(`/app/spaces/${spaceId}/arena`, {
            state: {
                spaceId,
                avatarId: selectedAvatarId,
                avatar: selectedAvatar,
                displayName: trimmedName,
            },
        });
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
                        <Link
                            to="/spaces"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all duration-200"
                            style={{
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.12)",
                            }}
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>All Spaces</span>
                        </Link>

                        {session?.user && (
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
                    {/* The Center Card Shell (Unscrollable, clean) */}
                    <div 
                        className="w-full max-w-[36rem] flex flex-col rounded-2xl overflow-hidden border border-white/10 shadow-2xl backdrop-blur-xl"
                        style={{
                            background: "rgba(9, 7, 24, 0.78)",
                            boxShadow: "0 22px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
                        }}
                    >
                        {/* Card Header */}
                        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                                Choose Your Character
                            </h2>

                            <button 
                                onClick={refreshAvatars}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                                title="Refresh avatars"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                            </button>
                        </div>

                        {/* Card Body */}
                        <div className="px-6 py-5 flex flex-col gap-4 overflow-hidden">
                            {/* Error notification */}
                            {error && (
                                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
                                    <span>{error}</span>
                                    <button 
                                        onClick={() => setError(null)}
                                        className="text-rose-400 hover:text-rose-200 text-xs ml-2 cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}

                            {/* Section 1: Avatar Selection (Big Images in a Single Row) */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-semibold text-slate-300">
                                    Select Avatar
                                </label>

                                {loading ? (
                                    /* Skeletons */
                                    <div className="flex flex-row items-center gap-4 overflow-x-auto py-2">
                                        {[1, 2, 3, 4].map((n) => (
                                            <div
                                                key={n}
                                                className="w-28 h-32 rounded-2xl shrink-0 animate-pulse"
                                                style={{ background: "rgba(255,255,255,0.05)" }}
                                            />
                                        ))}
                                    </div>
                                ) : avatars.length === 0 ? (
                                    <div className="py-6 px-4 text-center rounded-xl border border-white/5 bg-white/[0.02]">
                                        <p className="text-xs text-slate-400">
                                            No avatars available.
                                        </p>
                                    </div>
                                ) : (
                                    /* Single Row Avatar List */
                                    <div className="flex flex-row items-center gap-4 overflow-x-auto py-2 px-1 scrollbar-thin">
                                        {avatars.map((avatar) => {
                                            const isSelected = avatar.id === selectedAvatarId;
                                            return (
                                                <button
                                                    key={avatar.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedAvatarId(avatar.id);
                                                        if (error) setError(null);
                                                    }}
                                                    className={`group relative flex flex-col items-center gap-2 p-2 rounded-2xl shrink-0 transition-all duration-200 cursor-pointer text-center ${
                                                        isSelected
                                                            ? "bg-purple-500/20 border-purple-400 ring-2 ring-purple-500/40 shadow-lg shadow-purple-500/20 scale-[1.03]"
                                                            : "bg-white/[0.03] border-white/10 hover:border-white/25 hover:bg-white/[0.06] hover:scale-[1.01]"
                                                    } border`}
                                                    style={{ width: "112px" }}
                                                >
                                                    {/* Selected Check Badge */}
                                                    {isSelected && (
                                                        <div className="absolute top-2 right-2 z-10 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center shadow-md">
                                                            <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                                                        </div>
                                                    )}

                                                    {/* Big Avatar Image */}
                                                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-900/70 border border-white/10 shrink-0 flex items-center justify-center">
                                                        <img
                                                            src={avatar.imageUrl}
                                                            alt={avatar.name}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = 
                                                                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24' fill='none' stroke='%23a855f7' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E";
                                                            }}
                                                        />
                                                    </div>

                                                    {/* Avatar Name */}
                                                    <span 
                                                        className={`text-xs font-medium truncate w-full px-1 ${
                                                            isSelected ? "text-purple-200 font-semibold" : "text-slate-300"
                                                        }`}
                                                        title={avatar.name}
                                                    >
                                                        {avatar.name}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Section 2: Display Name */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-300">
                                    Display Name
                                </label>
                                <div 
                                    className="relative flex items-center rounded-xl border border-white/10 px-3.5 py-2.5 transition focus-within:border-purple-400/60 focus-within:ring-2 focus-within:ring-purple-500/20"
                                    style={{ background: "rgba(255, 255, 255, 0.04)" }}
                                >
                                    <input
                                        type="text"
                                        placeholder="Enter display name"
                                        value={displayName}
                                        maxLength={32}
                                        onChange={(e) => {
                                            setUserEnteredName(e.target.value);
                                            if (error) setError(null);
                                        }}
                                        className="bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none w-full font-medium"
                                    />
                                    {displayName && (
                                        <button
                                            type="button"
                                            onClick={() => setUserEnteredName("")}
                                            className="text-[11px] text-slate-400 hover:text-slate-200 ml-2 cursor-pointer"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Card Footer */}
                        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between bg-white/[0.01]">
                            <Link
                                to="/spaces"
                                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                <span>Change Space</span>
                            </Link>

                            <button
                                type="button"
                                onClick={handleJoinArena}
                                disabled={!selectedAvatarId || !displayName.trim()}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                                style={{
                                    background: "linear-gradient(135deg, rgba(139,92,246,0.9), rgba(124,58,237,0.9))",
                                    boxShadow: "0 0 20px rgba(139,92,246,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
                                }}
                            >
                                <span>Join Arena</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </LivingNebula>
    );
}