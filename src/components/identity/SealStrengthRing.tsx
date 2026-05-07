"use client";

interface SealStrengthRingProps {
    percentage: number;
    size?: number;
    strokeWidth?: number;
    label?: string;
}

export function SealStrengthRing({ percentage, size = 64, strokeWidth = 4, label }: SealStrengthRingProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    const getColor = () => {
        if (percentage >= 80) return "#22c55e";
        if (percentage >= 40) return "#f59e0b";
        return "#ef4444";
    };

    return (
        <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
                <circle
                    cx={size / 2} cy={size / 2} r={radius} fill="none"
                    stroke={getColor()} strokeWidth={strokeWidth}
                    strokeDasharray={circumference} strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs font-bold text-white">{percentage}%</span>
                {label && <span className="text-[8px] text-white/30 uppercase">{label}</span>}
            </div>
        </div>
    );
}
