"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Home, Bell, Sun, Moon, FolderLock, User, MoreHorizontal, LayoutGrid, Settings, ShieldAlert, Cloud, HelpCircle, LogOut, Lock } from "lucide-react";
import { NotificationStore } from "@/lib/stores/notificationStore";
import { ThemeStore, ThemeMode } from "@/lib/themeStore";
import { createClient } from "@/lib/supabase/client";
import { OnboardingStore } from "@/lib/onboardingStore";

// Primary tabs always visible
const PRIMARY_TABS = [
    { id: "dashboard", label: "Home", icon: Home, route: "/rajya" },
    { id: "mandals", label: "Mandals", icon: LayoutGrid, route: "/rajya" },
    { id: "alerts", label: "Alerts", icon: Bell, route: "/notifications" },
    { id: "vault", label: "Nidhi", icon: FolderLock, route: "/vault" },
];

// Secondary tabs in "More" menu
const SECONDARY_TABS = [
    { id: "profile", label: "Profile", icon: User, route: "/foundation" },
    { id: "alerts-sec", label: "Alerts", icon: Bell, route: "/notifications" },
    { id: "emergency", label: "Emergency Access", icon: ShieldAlert, route: "/dwaar/portals/access" },
    { id: "backup", label: "Backup / Sync", icon: Cloud, route: "/vault" },
    // { id: "privacy", label: "Privacy", icon: Lock, route: "/rajya" },
    // { id: "settings", label: "Settings", icon: Settings, route: "/rajya" },
    // { id: "support", label: "Help & Support", icon: HelpCircle, route: "/rajya" },
];

// Pages where the bottom nav should NOT appear (onboarding, splash, etc.)
const HIDDEN_PATHS = ["/", "/start", "/intro"];

export function BottomNav() {
    const router = useRouter();
    const pathname = usePathname();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        setUnreadCount(NotificationStore.getUnreadCount());
        const unsubscribe = NotificationStore.subscribe(() => {
            setUnreadCount(NotificationStore.getUnreadCount());
        });
        return unsubscribe;
    }, []);

    const [theme, setTheme] = useState<ThemeMode>(() => {
        if (typeof window !== "undefined") {
            ThemeStore.init();
            return ThemeStore.get();
        }
        return "dark";
    });
    const [showMore, setShowMore] = useState(false);

    const handleToggleTheme = () => {
        const next = ThemeStore.toggle();
        setTheme(next);
    };

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        // Reset in-memory and local stores
        OnboardingStore.reset();
        if (typeof window !== "undefined") {
            localStorage.removeItem("svarajya_identity_v1");
            localStorage.removeItem("svarajya_credentials_v1");
            localStorage.removeItem("svarajya_treasury_v1");
            localStorage.removeItem("svarajya_onboarding_v1");
            localStorage.removeItem("svarajya_last_login");
            // Hard redirect — forces middleware to re-evaluate auth after signOut
            window.location.href = "/start";
        }
    };

    // Hide on onboarding/splash screens
    if (HIDDEN_PATHS.some(p => pathname === p) || pathname.startsWith("/onboarding")) {
        return null;
    }

    const isTabActive = (route: string) => pathname === route || pathname.startsWith(route + "/");

    const safeNavigate = (route: string) => {
        try {
            router.push(route);
            setShowMore(false);
        } catch (error) {
            console.error(`Navigation failed for route ${route}:`, error);
        }
    };

    return (
        <>
            {/* More menu overlay */}
            {showMore && (
                <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)}>
                    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-full max-w-md px-4" onClick={e => e.stopPropagation()}>
                        <div className="bg-slate-900 border border-white/15 rounded-2xl p-3 shadow-2xl space-y-1">
                            {SECONDARY_TABS.map(item => {
                                const Icon = item.icon;
                                const isActive = isTabActive(item.route);
                                const showBadge = item.id === "alerts-sec" && unreadCount > 0;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => safeNavigate(item.route)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive ? "bg-amber-400/10 text-amber-400" : "text-white/50 hover:bg-white/5"}`}
                                    >
                                        <div className="relative">
                                            <Icon className="w-5 h-5" />
                                            {showBadge && (
                                                <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">
                                                    {unreadCount > 9 ? "9+" : unreadCount}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-sm">{item.label}</span>
                                    </button>
                                );
                            })}
                            
                            {/* Actions in More Menu */}
                            <div className="pt-2 border-t border-white/10 space-y-1">
                                <button
                                    onClick={() => { handleToggleTheme(); setShowMore(false); }}
                                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors text-white/50 hover:bg-white/5"
                                >
                                    <div className="flex items-center gap-3">
                                        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                                        <span className="text-sm">Toggle Theme</span>
                                    </div>
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-red-500 hover:bg-red-500/10"
                                >
                                    <LogOut className="w-5 h-5" />
                                    <span className="text-sm">Logout</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Nav bar */}
            <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 lg:hidden">
                <div className="bg-slate-950/95 backdrop-blur-md border-t border-white/10 px-2 pb-[env(safe-area-inset-bottom)] flex items-center justify-around">
                    {PRIMARY_TABS.map(item => {
                        const isActive = isTabActive(item.route);
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                onClick={() => safeNavigate(item.route)}
                                className={`relative flex flex-col items-center gap-0.5 py-2.5 px-2 transition-colors ${isActive ? "text-amber-400" : "text-white/30 hover:text-white/55"
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                <span className="text-[9px] tracking-wide">{item.label}</span>
                                {isActive && <div className="w-1 h-1 rounded-full bg-amber-400 mt-0.5" />}
                            </button>
                        );
                    })}
                    {/* More button */}
                    <button
                        onClick={() => setShowMore(!showMore)}
                        className={`relative flex flex-col items-center gap-0.5 py-2.5 px-2 transition-colors ${showMore ? "text-amber-400" : "text-white/30 hover:text-white/55"}`}
                    >
                        <div className="relative">
                            <MoreHorizontal className="w-5 h-5" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] text-white font-bold">
                                    {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                            )}
                        </div>
                        <span className="text-[9px] tracking-wide">More</span>
                    </button>
                </div>
            </nav>
        </>
    );
}
