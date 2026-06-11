"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BellOff, CheckCheck, ChevronRight } from "lucide-react";
import { NotificationStore, Notification, NotificationType } from "@/lib/stores/notificationStore";

const TYPE_STYLES: Record<NotificationType, { dot: string; bg: string; border: string }> = {
    info: { dot: "bg-blue-400", bg: "bg-blue-500/5", border: "border-blue-500/15" },
    warning: { dot: "bg-amber-400", bg: "bg-amber-400/5", border: "border-amber-400/15" },
    action: { dot: "bg-emerald-400", bg: "bg-emerald-500/5", border: "border-emerald-500/15" },
    milestone: { dot: "bg-purple-400", bg: "bg-purple-500/5", border: "border-purple-500/15" },
};

function timeAgo(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>(NotificationStore.getAll());
    const unread = notifications.filter(n => !n.read).length;

    const handleTap = (n: Notification) => {
        NotificationStore.markRead(n.id);
        setNotifications(NotificationStore.getAll());
        if (n.route) {
            router.push(n.route);
        }
    };

    const handleMarkAllRead = () => {
        NotificationStore.markAllRead();
        setNotifications(NotificationStore.getAll());
    };

    return (
        <div className="flex flex-col min-h-screen p-6 pb-24 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
            <div className="relative z-10 flex flex-col min-h-screen">
                {/* Header */}
                <div className="flex items-center justify-between pt-8 mb-6">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.push("/rajya")} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center shrink-0">
                            <ArrowLeft className="w-4 h-4 text-white/60" />
                        </button>
                        <div>
                            <h1 className="text-lg font-semibold text-white">Notifications</h1>
                            <p className="text-xs text-white/35 mt-0.5">
                                {unread > 0 ? `${unread} unread` : "All caught up"}
                            </p>
                        </div>
                    </div>
                    {unread > 0 && (
                        <button onClick={handleMarkAllRead} className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300">
                            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                        </button>
                    )}
                </div>

                {/* List */}
                <div className="flex-1 space-y-2">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <BellOff className="w-10 h-10 text-white/10 mb-3" />
                            <p className="text-sm text-white/30">No notifications yet.</p>
                        </div>
                    ) : (
                        notifications.map(n => {
                            const style = TYPE_STYLES[n.type];
                            return (
                                <button
                                    key={n.id}
                                    onClick={() => handleTap(n)}
                                    className={`w-full text-left p-4 rounded-xl border transition-all ${style.bg} ${style.border} ${!n.read ? "opacity-100" : "opacity-50"
                                        } hover:opacity-100`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-2.5 h-2.5 rounded-full ${style.dot} mt-1.5 shrink-0 ${!n.read ? "animate-pulse" : ""}`} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className={`text-sm font-medium ${!n.read ? "text-white" : "text-white/60"}`}>{n.title}</p>
                                                <span className="text-[10px] text-white/25 shrink-0">{timeAgo(n.createdAt)}</span>
                                            </div>
                                            <p className="text-xs text-white/40 mt-1 line-clamp-2">{n.message}</p>
                                        </div>
                                        {n.route && <ChevronRight className="w-4 h-4 text-white/15 shrink-0 mt-1" />}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
