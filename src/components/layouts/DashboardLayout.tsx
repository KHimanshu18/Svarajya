"use client";

import { BottomNav } from "@/components/layouts/BottomNav";
import { AlertToast } from "@/components/shared/AlertToast";
import { GlobalTopRightMenu } from "@/components/shared/GlobalTopRightMenu";
import { AuthSync } from "@/components/shared/AuthSync";
import { DesktopSidebar } from "@/components/layouts/DesktopSidebar";
import { DesktopRightPanel } from "@/components/layouts/DesktopRightPanel";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <AuthSync />
            <AlertToast />

            {/* Desktop: 3-column layout */}
            <div className="hidden lg:flex min-h-screen w-full">
                <DesktopSidebar />
                <main className="flex-1 min-w-0 overflow-y-auto min-h-screen">
                    <div className="relative">
                        {children}
                    </div>
                </main>
                <DesktopRightPanel />
            </div>

            {/* Mobile: Patched scrolling and navigation bar clipping bugs */}
            <div className="lg:hidden flex flex-col min-h-screen w-full bg-[var(--color-rajya-bg)]">
                <GlobalTopRightMenu />
                
                {/* Modified: Added a flex-1 main container with independent vertical scrolling and bottom buffer */}
                <main className="flex-1 w-full overflow-y-auto pb-24">
                    {children}
                </main>
                
                <BottomNav />
            </div>
        </>
    );
}