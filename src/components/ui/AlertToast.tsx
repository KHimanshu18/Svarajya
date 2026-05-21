"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AlertCircle, Bell, X, ChevronRight } from "lucide-react";
import { NotificationStore, Notification } from "@/lib/stores/notificationStore";

const TOAST_HIDDEN_PATHS = ["/", "/intro", "/start"];

/**
 * Global alert toast that slides in from the top when there
 * are unread critical ("action" or "warning") notifications.
 * Auto-dismisses after 6s. User can tap to navigate or dismiss.
 */
export function AlertToast() {
    const router = useRouter();
    const pathname = usePathname();
    const [alert, setAlert] = useState<Notification | null>(null);
    const [visible, setVisible] = useState(false);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());

    // Hide completely on intro/splash/onboarding screens
    const isHiddenPath = TOAST_HIDDEN_PATHS.includes(pathname) || pathname.startsWith("/onboarding");

    useEffect(() => {
        // Check for unread critical alerts every 2s
        const check = () => {
            const all = NotificationStore.getAll();
            const critical = all.find(
                n => !n.read && !dismissed.has(n.id) && (n.type === "action" || n.type === "warning")
            );
            if (critical && !visible) {
                setAlert(critical);
                setVisible(true);
            }
        };

        check();
        const interval = setInterval(check, 2000);
        return () => clearInterval(interval);
    }, [dismissed, visible]);

    // Auto-dismiss after 6s
    // Auto-dismiss after 6s
    useEffect(() => {
        if (!visible || !alert) return;
        const timer = setTimeout(() => {
            setDismissed(prev => new Set(prev).add(alert.id));
            setVisible(false);
        }, 6000);
        return () => clearTimeout(timer);
    }, [visible, alert]);

    const handleDismiss = () => {
        if (alert) {
            setDismissed(prev => new Set(prev).add(alert.id));
            NotificationStore.markRead(alert.id);
        }
        setVisible(false);
    };

    const handleTap = () => {
        if (alert) {
            NotificationStore.markRead(alert.id);
            setDismissed(prev => new Set(prev).add(alert.id));
            setVisible(false);
            if (alert.route) {
                router.push(alert.route);
            }
        }
    };

    if (!visible || !alert || isHiddenPath) return null;

    const isWarning = alert.type === "warning";

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-[60] animate-slide-down">
            <div
                className={`rounded-xl p-4 shadow-2xl border flex items-start gap-3 cursor-pointer transition-all ${isWarning
                    ? "bg-amber-50 border-amber-300 dark:bg-amber-950 dark:border-amber-700"
                    : "bg-blue-50 border-blue-300 dark:bg-blue-950 dark:border-blue-700"
                    }`}
                onClick={handleTap}
            >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isWarning ? "bg-amber-600" : "bg-blue-600"
                    }`}>
                    {isWarning
                        ? <AlertCircle className="w-4 h-4 text-white" />
                        : <Bell className="w-4 h-4 text-white" />
                    }
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${isWarning ? "text-amber-900 dark:text-amber-200" : "text-blue-900 dark:text-blue-200"
                        }`}>
                        {alert.title}
                    </p>
                    <p className={`text-xs mt-0.5 line-clamp-2 ${isWarning ? "text-amber-700 dark:text-amber-300" : "text-blue-700 dark:text-blue-300"
                        }`}>
                        {alert.message}
                    </p>
                    {alert.route && (
                        <div className={`flex items-center gap-1 mt-1.5 text-[10px] font-bold uppercase tracking-wider ${isWarning ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"
                            }`}>
                            Take action <ChevronRight className="w-3 h-3" />
                        </div>
                    )}
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
                    className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors shrink-0"
                >
                    <X className="w-3.5 h-3.5 text-[var(--color-rajya-muted)]" />
                </button>
            </div>
        </div>
    );
}
