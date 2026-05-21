"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Plus, Bell, TrendingUp, Coins, FileText } from "lucide-react";
import { NotificationStore, Notification } from "@/lib/stores/notificationStore";

const HIDDEN_PATHS = ["/", "/start", "/intro"];

export function DesktopRightPanel() {
    const pathname = usePathname();
    const router = useRouter();
    const [alerts, setAlerts] = useState<Notification[]>([]);

    useEffect(() => {
        setAlerts(NotificationStore.getAll().slice(0, 3));
        const unsubscribe = NotificationStore.subscribe(() => {
            setAlerts(NotificationStore.getAll().slice(0, 3));
        });
        return unsubscribe;
    }, []);

    if (HIDDEN_PATHS.includes(pathname) || pathname.startsWith("/onboarding")) return null;

    return (
        <aside className="hidden xl:flex flex-col w-72 shrink-0 min-h-screen sticky top-0 h-screen border-l border-white/8 bg-[var(--color-rajya-bg)] overflow-y-auto">
            <div className="px-5 pt-8 pb-4 border-b border-white/8">
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">Quick Actions</p>
            </div>

            {/* Quick Add Buttons */}
            <div className="px-4 py-4 space-y-2.5 border-b border-white/8">
                {[
                    { label: "Add Income", icon: Coins, route: "/kosh/add", color: "text-emerald-400 border-emerald-400/20 hover:bg-emerald-400/8" },
                    { label: "Add Expense", icon: TrendingUp, route: "/vyaya/add", color: "text-red-400 border-red-400/20 hover:bg-red-400/8" },
                    { label: "Add Document", icon: FileText, route: "/pehchaan/records/add", color: "text-amber-400 border-amber-400/20 hover:bg-amber-400/8" },
                ].map(action => {
                    const Icon = action.icon;
                    return (
                        <button
                            key={action.route}
                            onClick={() => router.push(action.route)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${action.color}`}
                        >
                            <Plus className="w-4 h-4 shrink-0" />
                            <Icon className="w-4 h-4 shrink-0" />
                            {action.label}
                        </button>
                    );
                })}
            </div>

            {/* Recent Alerts */}
            <div className="px-5 py-4">
                <div className="flex items-center gap-2 mb-3">
                    <Bell className="w-4 h-4 text-white/30" />
                    <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">Recent Alerts</p>
                </div>
                {alerts.length === 0 ? (
                    <p className="text-xs text-white/20 italic">No recent alerts</p>
                ) : (
                    <div className="space-y-2">
                        {alerts.map(alert => (
                            <div key={alert.id} className="p-3 rounded-xl bg-white/4 border border-white/8">
                                <p className="text-xs font-medium text-[var(--color-rajya-text)] leading-tight">{alert.title}</p>
                                <p className="text-[10px] text-white/30 mt-0.5">{alert.message}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </aside>
    );
}
