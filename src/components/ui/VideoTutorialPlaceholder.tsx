"use client";

import { Play, Youtube } from "lucide-react";

interface VideoTutorialPlaceholderProps {
    /** YouTube video ID — e.g. "dQw4w9WgXcQ". Leave empty to show placeholder. */
    youtubeId?: string;
    /** Short label shown below the thumbnail */
    label?: string;
}

export function VideoTutorialPlaceholder({
    youtubeId,
    label = "Watch tutorial",
}: VideoTutorialPlaceholderProps) {
    if (youtubeId) {
        return (
            <a
                href={`https://www.youtube.com/watch?v=${youtubeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group w-full flex flex-col md:flex-row gap-6 items-center justify-center text-center rounded-xl overflow-hidden transition-all p-4 sm:p-6 bg-gray-50 dark:bg-white/5"
            >
                {/* Mobile: full-width thumbnail. Desktop: wide-fit thumbnail. */}
                <div className="relative w-full md:w-2/5 overflow-hidden rounded-xl aspect-video">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                        alt={label}
                        className="w-full aspect-video rounded-xl object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors rounded-xl">
                        <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center transition-transform duration-300 hover:scale-110 shadow-xl">
                            <Play className="w-5 h-5 text-white fill-white" />
                        </div>
                    </div>
                </div>
                {/* Desktop only: text label next to thumbnail */}
                <div className="hidden md:flex flex-col items-start justify-center w-full md:w-3/5 text-left">
                    <p className="text-sm md:text-base font-medium text-slate-800 dark:text-slate-200">{label}</p>
                    <p className="text-[10px] text-amber-400/60 mt-3 uppercase tracking-wider">Click to watch on YouTube →</p>
                </div>
                {/* Mobile only: label section with breathing room */}
                <div className="md:hidden w-full rounded-xl bg-gray-50 dark:bg-white/5 p-4 mt-3 text-center">
                    <p className="text-sm md:text-base font-medium text-slate-800 dark:text-slate-200">{label}</p>
                </div>
            </a>
        );
    }

    // Placeholder state — no video set yet
    return (
        <div className="w-full rounded-xl border border-dashed border-white/15 bg-white/5 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Youtube className="w-6 h-6 text-white/40" />
            </div>
            <div>
                <p className="text-sm text-white/60 font-medium">{label}</p>
                <p className="text-xs text-white/30 mt-0.5">Video tutorial — coming soon</p>
            </div>
        </div>
    );
}
