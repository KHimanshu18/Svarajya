"use client";

import { Info } from "lucide-react";

interface PageGuideProps {
    title: string;
    description: string;
    actions?: { emoji: string; label: string }[];
}

/**
 * Reusable guide section for page-level context.
 * Renders a highlighted info box with title, description,
 * and optional action chips.
 */
export function PageGuide({ title, description, actions }: PageGuideProps) {
    return (
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-4 w-full relative overflow-hidden transition-all duration-300 hover:bg-white/10">
            <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-amber-400 shrink-0" />
                <h3 className="text-base font-semibold text-white">{title}</h3>
            </div>

            <p className="text-xs text-white/50 leading-relaxed max-w-2xl">{description}</p>

            {actions && actions.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                    {actions.map((a, i) => (
                        <span key={i} className="text-[10px] bg-white/5 border border-white/10 rounded-full px-2.5 py-1 text-white/70">
                            {a.emoji} {a.label}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
