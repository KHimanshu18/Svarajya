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
        <div className="absolute top-3 right-4 z-50 flex items-center gap-1 pointer-events-auto">
            <button
                onClick={handleToggleTheme}
                // Added m-0 to override any global button margins
                className="m-0 w-8 h-8 p-0 rounded-full flex items-center justify-center transition-all shadow-sm backdrop-blur-md bg-white border border-gray-200 text-amber-500 hover:bg-gray-50 dark:bg-slate-900/60 dark:border-white/10 dark:text-amber-400 dark:hover:bg-white/10"
                title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
                {theme === "dark" ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
            </button>

            <button
                onClick={handleLogout}
                // Added m-0 here as well
                className="m-0 w-8 h-8 p-0 rounded-full flex items-center justify-center transition-all shadow-sm backdrop-blur-md bg-white border border-red-200 text-red-500 hover:bg-red-50 dark:bg-slate-900/60 dark:border-red-500/30 dark:text-red-500 dark:hover:bg-red-500/10"
                title="Log Out"
            >
                {/* Removed the ml-0.5 class that was pushing this icon off-center */}
                <LogOut className="w-4 h-4 shrink-0" />
            </button>
        </div>
    );
}