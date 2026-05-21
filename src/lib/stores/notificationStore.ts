// Unified Notification Store with database persistence and API synchronization.

export type NotificationType = "info" | "warning" | "action" | "milestone";

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    route?: string; // optional deep link
    link?: string;  // targeted deep link
    read: boolean;
    createdAt: number;
}

let _notifications: Notification[] = [];
let _loading = false;
let _fetched = false;
type Listener = () => void;
const _listeners = new Set<Listener>();

// Helper to map database model to frontend interface
function mapNotification(db: any): Notification {
    const title = db.subject || "Alert";
    const message = db.body || "";
    
    // Dynamic categorizations
    let type: NotificationType = "info";
    if (
        title.toLowerCase().includes("risk") || 
        title.toLowerCase().includes("vulnerable") || 
        title.toLowerCase().includes("incomplete") || 
        title.toLowerCase().includes("overspend") || 
        title.toLowerCase().includes("expiry") || 
        title.toLowerCase().includes("idle")
    ) {
        type = "warning";
    } else if (
        title.toLowerCase().includes("complete") || 
        title.toLowerCase().includes("add") || 
        title.toLowerCase().includes("seal") || 
        title.toLowerCase().includes("action")
    ) {
        type = "action";
    } else if (
        title.toLowerCase().includes("milestone") || 
        title.toLowerCase().includes("welcome") || 
        title.toLowerCase().includes("congratulations")
    ) {
        type = "milestone";
    }
    
    // Dynamic routing deep links matching module configurations
    const providedLink = db.link || db.route;
    let link = providedLink || "";
    let route = providedLink || "";

    if (!providedLink) {
        link = "/rajya";

        if (
            title.toLowerCase().includes("vault") || 
            title.toLowerCase().includes("identity") || 
            title.toLowerCase().includes("pehchaan") || 
            title.toLowerCase().includes("document")
        ) {
            link = "/pehchaan/records";
        } else if (title.toLowerCase().includes("profile setup incomplete") || title.toLowerCase().includes("profile incomplete")) {
            link = "/foundation";
        } else if (title.toLowerCase().includes("family member review") || title.toLowerCase().includes("no family members")) {
            link = "/foundation/family";
        } else if (
            title.toLowerCase().includes("profile") || 
            title.toLowerCase().includes("foundation") || 
            title.toLowerCase().includes("family") || 
            title.toLowerCase().includes("dependent")
        ) {
            link = "/foundation";
        } else if (
            title.toLowerCase().includes("insurance") || 
            title.toLowerCase().includes("policy") || 
            title.toLowerCase().includes("raksha") ||
            title.toLowerCase().includes("shield") ||
            title.toLowerCase().includes("protection")
        ) {
            link = "/raksha/policies";
        } else if (
            title.toLowerCase().includes("budget") || 
            title.toLowerCase().includes("overspend") || 
            title.toLowerCase().includes("expense") || 
            title.toLowerCase().includes("vyaya")
        ) {
            link = "/vyaya/budget";
        } else if (title.toLowerCase().includes("subscription")) {
            link = "/vyaya/subscriptions";
        } else if (
            title.toLowerCase().includes("idle") || 
            title.toLowerCase().includes("bank") || 
            title.toLowerCase().includes("pravah")
        ) {
            link = "/khate/accounts/idle";
        } else if (title.toLowerCase().includes("will")) {
            link = "/mitra/will";
        } else if (
            title.toLowerCase().includes("income") || 
            title.toLowerCase().includes("kosh") || 
            title.toLowerCase().includes("stream")
        ) {
            link = "/kosh/sources";
        } else if (
            title.toLowerCase().includes("emi") || 
            title.toLowerCase().includes("loan") || 
            title.toLowerCase().includes("rin")
        ) {
            link = "/rin";
        } else if (
            title.toLowerCase().includes("tax") || 
            title.toLowerCase().includes("kar") || 
            title.toLowerCase().includes("itr")
        ) {
            link = "/kar";
        } else if (
            title.toLowerCase().includes("goal") || 
            title.toLowerCase().includes("lakshya") || 
            title.toLowerCase().includes("milestone")
        ) {
            link = "/lakshya";
        }

        route = link;
    }
    
    return {
        id: db.id,
        type,
        title,
        message,
        route,
        link,
        read: db.status === "OPENED" || db.status === "CLICKED",
        createdAt: new Date(db.createdAt).getTime(),
    };
}

export const NotificationStore = {
    subscribe(listener: Listener) {
        _listeners.add(listener);
        return () => _listeners.delete(listener);
    },

    notify() {
        _listeners.forEach(l => {
            try {
                l();
            } catch (err) {
                console.error("Error in store subscriber:", err);
            }
        });
    },

    async fetch() {
        if (typeof window === "undefined") return;
        try {
            const res = await fetch("/api/notifications");
            if (res.ok) {
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    _notifications = json.data.map(mapNotification);
                    _fetched = true;
                    this.notify();
                }
            }
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        }
    },

    getAll(): Notification[] {
        if (!_fetched && !_loading && typeof window !== "undefined") {
            _loading = true;
            this.fetch().finally(() => { _loading = false; });
        }
        return [..._notifications].sort((a, b) => b.createdAt - a.createdAt);
    },

    getUnreadCount(): number {
        if (!_fetched && !_loading && typeof window !== "undefined") {
            _loading = true;
            this.fetch().finally(() => { _loading = false; });
        }
        return _notifications.filter(n => !n.read).length;
    },

    async markRead(id: string) {
        const n = _notifications.find(n => n.id === id);
        if (n) {
            n.read = true;
            this.notify();
        }

        try {
            await fetch(`/api/notifications/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" }
            });
        } catch (error) {
            console.error("Failed to mark read:", error);
        }
    },

    async markAllRead() {
        _notifications.forEach(n => { n.read = true; });
        this.notify();

        try {
            await fetch("/api/notifications/read-all", {
                method: "PUT",
                headers: { "Content-Type": "application/json" }
            });
        } catch (error) {
            console.error("Failed to mark all read:", error);
        }
    },

    async push(partial: Omit<Notification, "id" | "read" | "createdAt">) {
        const tempId = `temp-${Date.now()}`;
        const newNotif: Notification = {
            id: tempId,
            ...partial,
            read: false,
            createdAt: Date.now(),
        };
        _notifications.unshift(newNotif);
        this.notify();

        try {
            const res = await fetch("/api/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subject: partial.title,
                    body: partial.message,
                    channel: "IN_APP",
                    link: partial.link || partial.route || null,
                })
            });
            if (res.ok) {
                const json = await res.json();
                if (json.success && json.data) {
                    const index = _notifications.findIndex(n => n.id === tempId);
                    if (index !== -1) {
                        _notifications[index] = mapNotification(json.data);
                        this.notify();
                    }
                }
            }
        } catch (error) {
            console.error("Failed to push notification:", error);
        }
    },

    generatePendingTaskNudges(identityCoverage: number, identityConfidence: number) {
        const existingTitles = new Set(_notifications.map(n => n.title));

        if (identityCoverage < 3 && !existingTitles.has("Add more identity documents")) {
            this.push({
                type: "action",
                title: "Add more identity documents",
                message: `You've added ${identityCoverage} of 6 documents. Add more to improve your identity readiness.`,
                route: "/pehchaan/records",
            });
        }

        if (identityConfidence > 0 && identityConfidence < 60 && !existingTitles.has("Strengthen your seals")) {
            this.push({
                type: "warning",
                title: "Strengthen your seals",
                message: "Your identity confidence is below 60%. Upload files and verify documents to improve.",
                route: "/pehchaan/records",
            });
        }
    },

    clear() {
        _notifications = [];
        _initialized = false;
        _fetched = false;
        _loading = false;
    },
};

let _initialized = false;
