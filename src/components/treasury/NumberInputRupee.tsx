"use client";

import { useState } from "react";
import { formatRupee } from "@/lib/incomeStore";

interface NumberInputRupeeProps {
    label: string;
    value: number;
    onChange: (val: number) => void;
    placeholder?: string;
    optional?: boolean;
    error?: string;
}

/** Input with ₹ prefix and live Indian comma formatting */
export function NumberInputRupee({ label, value, onChange, placeholder, optional, error }: NumberInputRupeeProps) {
    const [raw, setRaw] = useState(value > 0 ? value.toString() : "");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value.replace(/[^0-9]/g, "");
        setRaw(v);
        onChange(v ? parseInt(v, 10) : 0);
    };

    const displayValue = raw ? formatRupee(parseInt(raw, 10)) : "";

    return (
        <div>
            <label className="text-xs text-[var(--color-rajya-muted)] mb-3 block">
                {label} {optional && <span className="opacity-50">(Optional)</span>}
            </label>
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-rajya-accent)] text-sm font-bold">₹</span>
                <input
                    type="text"
                    inputMode="numeric"
                    value={raw}
                    onChange={handleChange}
                    placeholder={placeholder || "0"}
                    className="w-full pl-8 pr-3 py-3 bg-white/5 border border-white/10 rounded-xl text-[var(--color-rajya-text)] text-sm focus:border-[var(--color-rajya-accent)]/50 focus:outline-none transition-colors"
                />
            </div>
            {raw && <p className="text-[10px] text-[var(--color-rajya-muted)] mt-1">{displayValue}</p>}
            {error && <p className="text-[10px] text-[var(--color-rajya-danger)] mt-1">⚠ {error}</p>}
        </div>
    );
}
