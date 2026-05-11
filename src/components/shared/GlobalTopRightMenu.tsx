"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sun, Moon, LogOut } from "lucide-react";
import { ThemeStore, ThemeMode } from "@/lib/stores/themeStore";
import { createClient } from "@/lib/supabase/client";

const HIDDEN_PATHS = ["/", "/start", "/intro"];

export function GlobalTopRightMenu() {
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);
    const [theme, setTheme] = useState<ThemeMode>("dark");

    useEffect(() => {
        ThemeStore.init();
        setTheme(ThemeStore.get());
        setMounted(true);
    }, []);

    if (HIDDEN_PATHS.includes(pathname) || pathname.startsWith("/onboarding") || pathname === "/dashboard") {
        return null;
    }

    // Don't render anything until mounted on client (prevents hydration mismatch)
    if (!mounted) {
        return null;
    }

    const handleToggleTheme = () => {
        const next = ThemeStore.toggle();
        setTheme(next);
    };

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        if (typeof window !== "undefined") {
            localStorage.removeItem("svarajya_identity_v1");
            localStorage.removeItem("svarajya_credentials_v1");
            localStorage.removeItem("svarajya_treasury_v1");
            localStorage.removeItem("svarajya_onboarding_v1");
            localStorage.removeItem("svarajya_last_login");
            window.location.href = "/start";
        }
    };

    return (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 pointer-events-auto">
            <button
                onClick={handleToggleTheme}
                className="w-10 h-10 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-amber-400 hover:bg-white/10 transition-colors shadow-lg"
                title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
                onClick={handleLogout}
                className="w-10 h-10 rounded-full bg-slate-900/60 backdrop-blur-md border border-red-500/30 flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-colors shadow-lg"
                title="Log Out"
            >
                <LogOut className="w-4 h-4 ml-0.5" />
            </button>
        </div>
    );
}