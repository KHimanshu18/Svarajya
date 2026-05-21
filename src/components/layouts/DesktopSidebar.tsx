"use client";

import { usePathname, useRouter } from "next/navigation";
import {
    Home, Bell, FolderLock, Sun, Moon, LogOut, Coins,
    FileText, AlertTriangle
} from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { createClient } from "@/lib/supabase/client";
import { OnboardingStore } from "@/lib/onboardingStore";
import { ThemeStore, ThemeMode } from "@/lib/themeStore";
import { NotificationStore } from "@/lib/stores/notificationStore";
import { useState, useEffect } from "react";
import { IncomeStore } from "@/lib/incomeStore";
import { IdentityStore } from "@/lib/identityStore";
import { useAuth } from "@/components/providers/AuthProvider";

const HIDDEN_PATHS = ["/", "/start", "/intro"];

function formatRupee(amount: number): string {
    if (amount < 0) return `-₹${formatRupee(-amount).slice(1)}`;
    const str = Math.round(amount).toString();
    if (str.length <= 3) return `₹${str}`;
    let result = str.slice(-3);
    let remaining = str.slice(0, -3);
    while (remaining.length > 0) {
        const chunk = remaining.slice(-2);
        result = chunk + "," + result;
        remaining = remaining.slice(0, -2);
    }
    return `₹${result}`;
}

export function DesktopSidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const { user: authUser } = useAuth();
    const [user, setUser] = useState(authUser);
    const [theme, setTheme] = useState<ThemeMode>("dark");
    const [mounted, setMounted] = useState(false);
    const [alertCount, setAlertCount] = useState(0);
    const [monthlyIncome, setMonthlyIncome] = useState(0);
    const [docsCount, setDocsCount] = useState(0);

    // Hydrate income store and update monthly income state
    useEffect(() => {
        const loadIncome = async () => {
            await IncomeStore.hydrate();
            setMonthlyIncome(IncomeStore.getMonthlyNetIncome());
        };
        void loadIncome();

        window.addEventListener("focus", loadIncome);
        return () => window.removeEventListener("focus", loadIncome);
    }, []);

    useEffect(() => {
        setAlertCount(NotificationStore.getUnreadCount());
        const unsubscribe = NotificationStore.subscribe(() => {
            setAlertCount(NotificationStore.getUnreadCount());
        });
        return unsubscribe;
    }, []);

    // Hydrate identity store and update docs count state
    useEffect(() => {
        const loadIdentity = async () => {
            await IdentityStore.hydrate();
            const records = IdentityStore.getIdentityRecords?.() || IdentityStore.getAll?.() || IdentityStore.getRecords?.() || IdentityStore.getDocs?.() || [];
            console.log('Identity records count:', records.length);
            setDocsCount(records.length);
        };
        void loadIdentity();

        window.addEventListener("focus", loadIdentity);
        return () => window.removeEventListener("focus", loadIdentity);
    }, []);

    // Sync local user with auth user
    useEffect(() => {
        setUser(authUser);
    }, [authUser]);

    // Refresh user data on focus
    useEffect(() => {
        const refreshUser = async () => {
            const supabase = createClient();
            const { data: { user: freshUser } } = await supabase.auth.getUser();
            if (freshUser) setUser(freshUser);
        };

        window.addEventListener("focus", refreshUser);
        return () => window.removeEventListener("focus", refreshUser);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            ThemeStore.init();
            setTheme(ThemeStore.get());
            setMounted(true);
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    if (HIDDEN_PATHS.includes(pathname) || pathname.startsWith("/onboarding")) return null;

    const isActive = (route: string) => pathname === route || pathname.startsWith(route + "/");

    const safeNavigate = (route: string) => {
        try {
            router.push(route);
        } catch (error) {
            console.error(`Navigation failed for route ${route}:`, error);
        }
    };

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        OnboardingStore.reset();
        if (typeof window !== "undefined") {
            localStorage.removeItem("svarajya_last_login");
            window.location.href = "/start";
        }
    };

    const handleToggleTheme = () => {
        const next = ThemeStore.toggle();
        setTheme(next);
    };

    const quickStats = [
        { label: "Monthly Income", value: monthlyIncome > 0 ? formatRupee(monthlyIncome) : "—", icon: Coins, color: "text-emerald-400" },
        { label: "Identity Docs", value: docsCount > 0 ? `${docsCount} docs` : "None", icon: FileText, color: "text-amber-400" },
        { label: "Alerts", value: alertCount > 0 ? `${alertCount} pending` : "All clear", icon: AlertTriangle, color: alertCount > 0 ? "text-red-400" : "text-emerald-400" },
    ];

    const APP_NAV = [
        { label: "Rajya Map", icon: Home, route: "/rajya", badge: 0 },
        { label: "Notifications", icon: Bell, route: "/notifications", badge: alertCount },
        { label: "Nidhi Vault", icon: FolderLock, route: "/vault", badge: 0 },
    ];

    // User data for avatar
    const profilePhoto = user?.user_metadata?.profile_photo || user?.user_metadata?.avatar_url || null;
    const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User";
    const fallbackLetter = fullName.charAt(0).toUpperCase();

    return (
        <aside className="hidden lg:flex flex-col w-64 shrink-0 min-h-screen sticky top-0 h-screen border-r border-white/8 bg-[var(--color-rajya-bg)] overflow-y-auto">
            {/* Brand */}
            <div className="px-5 pt-8 pb-4 border-b border-white/8">
                <p className="font-display text-amber-400 text-xl tracking-widest uppercase">Sva-Rajya</p>
                <p className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">Financial Kingdom</p>
            </div>

            {/* User Avatar */}
            <div className="px-5 py-5 border-b border-white/8">
                <UserAvatar 
                    size="md" 
                    showName={true} 
                    src={profilePhoto} 
                    fallback={fallbackLetter}
                />
            </div>

            {/* Quick Stats — Kingdom Snapshot */}
            {mounted && (
                <div className="px-4 py-4 border-b border-white/8 space-y-2">
                    <p className="text-[9px] text-white/25 uppercase tracking-[0.15em] font-semibold px-1 mb-2">Kingdom Snapshot</p>
                    {quickStats.map(stat => {
                        const Icon = stat.icon;
                        return (
                            <div key={stat.label} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/4 border border-white/6">
                                <Icon className={`w-4 h-4 shrink-0 ${stat.color}`} />
                                <div className="min-w-0">
                                    <p className="text-[10px] text-white/30 leading-tight">{stat.label}</p>
                                    <p className={`text-sm font-bold leading-tight ${stat.color}`}>{stat.value}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* App Navigation — distinct from Mandal cards */}
            <nav className="flex-1 px-3 py-4">
                <p className="text-[9px] text-white/25 uppercase tracking-[0.15em] font-semibold px-3 mb-2">Navigation</p>
                <div className="space-y-0.5">
                    {APP_NAV.map(item => {
                        const Icon = item.icon;
                        const active = isActive(item.route);
                        return (
                            <button
                                key={item.route}
                                onClick={() => safeNavigate(item.route)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                                    active ? "bg-amber-400/10 text-amber-400" : "text-white/45 hover:bg-white/5 hover:text-white/80"
                                }`}
                            >
                                <Icon className="w-4 h-4 shrink-0" />
                                <span>{item.label}</span>
                                {item.badge > 0 && (
                                    <span className="ml-auto w-5 h-5 bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center">
                                        {item.badge > 9 ? "9+" : item.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </nav>

            {/* Rajya Health Score mini-card */}
            <div className="px-4 pb-3">
                <div className="px-3 py-3 rounded-xl bg-amber-400/6 border border-amber-400/15 cursor-pointer hover:bg-amber-400/10 transition-colors" onClick={() => safeNavigate("/rajya")}>
                    <p className="text-[9px] text-amber-400/60 uppercase tracking-widest mb-1">Rajya Health</p>
                    <p className="text-2xl font-display text-amber-400 leading-none">View →</p>
                    <p className="text-[10px] text-white/25 mt-1">Open Dashboard for full score</p>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="px-3 py-4 border-t border-white/8 space-y-1">
                <button onClick={handleToggleTheme} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-white/40 hover:bg-white/5 hover:text-white/70 transition-colors text-sm">
                    {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    <span>Toggle Theme</span>
                </button>
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-red-500/70 hover:bg-red-500/10 hover:text-red-500 transition-colors text-sm">
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
}

