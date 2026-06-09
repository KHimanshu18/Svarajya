"use client";

import { useState } from "react";
import Image from "next/image";
import { PlayCircle, X, ExternalLink } from "lucide-react";

interface YouTubeTutorialProps {
    videoId: string;
    title: string;
    description?: string;
    channelName?: string;
}

/**
 * Embedded YouTube tutorial placeholder.
 * Shows a compact card that expands into an iframe on tap.
 * Links out to YouTube for full experience.
 */
export function YouTubeTutorial({ videoId, title, description, channelName }: YouTubeTutorialProps) {
    const [expanded, setExpanded] = useState(false);
    const thumbUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

    if (expanded) {
        return (
            <div className="bg-[var(--color-rajya-card)] border border-[var(--color-rajya-accent)]/20 rounded-xl overflow-hidden shadow-xs">
                {/* Embedded player frame */}
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                    <iframe
                        src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                        title={title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute inset-0 w-full h-full"
                    />
                </div>
                {/* Modified: Added flex-col on mobile viewports to prevent layout wrapping bugs */}
                <div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50 dark:bg-transparent">
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-[var(--color-rajya-text)] truncate">{title}</p>
                        {channelName && <p className="text-[10px] text-slate-500 dark:text-[var(--color-rajya-muted)]">{channelName}</p>}
                    </div>
                    {/* Actions container with mobile optimized sizing */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 mt-1 sm:mt-0 pt-2 sm:pt-0 border-t border-slate-200/60 sm:border-0 dark:border-white/5">
                        <a
                            href={watchUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-medium text-[var(--color-rajya-accent)] hover:underline flex items-center gap-1"
                        >
                            <ExternalLink className="w-3 h-3" /> YouTube
                        </a>
                        <button 
                            onClick={() => setExpanded(false)} 
                            className="p-1.5 rounded-lg bg-slate-200/50 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 transition-colors"
                            aria-label="Close Player"
                        >
                            <X className="w-3.5 h-3.5 text-slate-600 dark:text-[var(--color-rajya-muted)]" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <button
            onClick={() => setExpanded(true)}
            // Modified: Swapped border-white/8 to border-slate-200 for clean light mode tracking
            className="w-full bg-[var(--color-rajya-card)] border border-slate-200 dark:border-white/8 rounded-xl p-3 flex items-center gap-3 hover:border-slate-300 dark:hover:border-[var(--color-rajya-accent)]/30 transition-all text-left group shadow-xs"
        >
            {/* Thumbnail Box */}
            <div className="relative w-20 h-12 rounded-lg overflow-hidden shrink-0 bg-slate-100 dark:bg-white/5">
                <Image
                    src={thumbUrl}
                    alt={title}
                    fill
                    sizes="80px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/15 transition-colors">
                    <PlayCircle className="w-5 h-5 text-white drop-shadow-xs" />
                </div>
            </div>

            {/* Typography Info Box */}
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-[var(--color-rajya-text)] line-clamp-2 leading-tight">{title}</p>
                {description && <p className="text-[10px] text-slate-500 dark:text-[var(--color-rajya-muted)] mt-0.5 line-clamp-1">{description}</p>}
                {channelName && (
                    <p className="text-[9px] font-medium text-[var(--color-rajya-accent)] mt-1 flex items-center gap-1">
                        <span className="text-[8px]">▶</span> {channelName}
                    </p>
                )}
            </div>
        </button>
    );
}

/**
 * A section wrapper for grouping multiple tutorial videos.
 */
export function TutorialSection({ title, children }: { title?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            {/* Modified: Added text-slate-500 fallback so headings are fully legible during light mode states */}
            <p className="text-[10px] text-slate-500 dark:text-white/30 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                🎓 {title || "Learn More"}
            </p>
            <div className="grid grid-cols-1 gap-2.5">
                {children}
            </div>
        </div>
    );
}