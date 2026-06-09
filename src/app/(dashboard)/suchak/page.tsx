"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
    Shield, BookOpen, Coins, Activity, Users, AlertCircle, Fingerprint, Key,
    ChevronRight, Sun, Moon, Info, Droplets
} from "lucide-react";
import { IdentityStore } from "@/lib/stores/identityStore";
import { CredentialStore } from "@/lib/credentialStore";
import { IncomeStore, formatRupee } from "@/lib/stores/incomeStore";
import { ExpenseStore } from "@/lib/stores/expenseStore";
import { BankStore } from "@/lib/stores/bankStore";
import { OnboardingStore } from "@/lib/stores/onboardingStore";
import { ThemeStore, ThemeMode } from "@/lib/stores/themeStore";
import { VideoTutorialPlaceholder } from "@/components/tutorials/TutorialCard";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { fetchBankSummary } from "@/lib/bankApi";

export default function Dashboard() {
    const router = useRouter();
    const [theme, setTheme] = useState<ThemeMode>(() => {
        if (typeof window !== "undefined") {
            ThemeStore.init();
            return ThemeStore.get();
        }
        return "dark";
    });

    const [bankAccountCount, setBankAccountCount] = useState<number | null>(null);

    useEffect(() => {
        OnboardingStore.hydrate();

        let active = true;
        fetchBankSummary()
            .then((summary) => {
                if (active) setBankAccountCount(summary.accounts.length);
            })
            .catch(() => {
                if (active) setBankAccountCount(null);
            });
        return () => { active = false; };
    }, []);

    // Dynamic identity coverage
    const identityCoverage = IdentityStore.getCoverage();
    const identityCompletion = Math.round((identityCoverage.filled / identityCoverage.total) * 100);
    const identityStatus = identityCompletion >= 80 ? "secure" : identityCompletion >= 30 ? "warning" : "critical";

    // Dynamic credential health
    const credentialHealth = CredentialStore.getCredentialHealth({
        contactPointExists: (id: string) => !!IdentityStore.getContact(id),
        familyMemberExists: () => true,
    });
    const credCompletion = CredentialStore.getPortals().length > 0 ? credentialHealth.overall : 0;
    const credStatus = credCompletion >= 70 ? "secure" : credCompletion >= 30 ? "warning" : "critical";

    // Dynamic Kosh (Treasury) data
    const koshCompletion = IncomeStore.getKoshCompletion();
    const koshStatus = IncomeStore.getKoshStatus();
    const koshMonthly = IncomeStore.getMonthlyNetIncome();
    const koshDesc = koshMonthly > 0 ? `${formatRupee(koshMonthly)}/mo â€¢ Strength: ${IncomeStore.getStrengthIndex().overall}` : "Income & treasury management";

    // Dynamic Sthapana (Foundation) coverage
    const onboardingData = OnboardingStore.get();
    let sthapanaCompletion = 10; // Base score for starting
    if (onboardingData.fullName) sthapanaCompletion += 40; // Profile done
    if (onboardingData.familyMembers && onboardingData.familyMembers.length > 0) sthapanaCompletion += 50; // Family done

    // In the future, we'll check for education data as the final 10-20% gap. 
    // Right now, if they did profile + family they get 100% since education module isn't fully integrated into the store yet.
    const sthapanaStatus = sthapanaCompletion >= 80 ? "secure" : "warning";

    const KINGDOM_ZONES = [
        { id: 'foundation', title: 'Sthapana (Foundation)', route: '/foundation', icon: <BookOpen className="w-5 h-5" />, status: sthapanaStatus, completion: sthapanaCompletion, desc: 'Profile, family & education' },
        { id: 'identity', title: 'Pehchaan (Identity Records)', route: '/pehchaan/records', icon: <Fingerprint className="w-5 h-5" />, status: identityStatus, completion: identityCompletion, desc: 'Your identity documents' },
        { id: 'credentials', title: 'Kunji (Credentials & Access)', route: '/dwaar/portals', icon: <Key className="w-5 h-5" />, status: credStatus, completion: credCompletion, desc: 'Login portals & access' },
        { id: 'protection', title: 'Raksha (Insurance & Protection)', route: '/raksha', icon: <Shield className="w-5 h-5" />, status: 'warning', completion: 40, desc: 'Insurance & risk cover' },
        { id: 'growth', title: 'Kosh (Income & Treasury)', route: '/kosh', icon: <Coins className="w-5 h-5" />, status: koshStatus, completion: koshCompletion, desc: koshDesc },
        { id: 'bank', title: 'Pravah (Bank Accounts & Cashflow)', route: '/khate/accounts', icon: <Droplets className="w-5 h-5" />, status: 'secure', completion: 100, desc: 'Bank accounts & cashflow' },
        { id: 'control', title: 'Rin (Loans & Liabilities)', route: '/rin', icon: <Activity className="w-5 h-5" />, status: 'critical', completion: 10, desc: 'Debt & loan management' },
        { id: 'vyaya', title: 'Vyaya (Expenses & Leakage)', route: '/vyaya', icon: <Coins className="w-5 h-5" />, status: 'warning', completion: 40, desc: 'Track and control leakage' },
        { id: 'legacy', title: 'Mitra (Nominees & Legacy)', route: '/mitra', icon: <Users className="w-5 h-5" />, status: 'warning', completion: 30, desc: 'Trusted nominees & legacy' },
    ];

    // Recalculate global stability score based on actual current completions
    const totalCompletion = KINGDOM_ZONES.reduce((sum, zone) => sum + zone.completion, 0);
    const stabilityScore = Math.round(totalCompletion / KINGDOM_ZONES.length);

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'secure': return {
                text: 'text-emerald-700',
                border: 'border-emerald-500/30',
                bg: 'bg-emerald-50',
                iconBg: 'bg-emerald-600',
                statusLabel: 'Fortified',
                ctaBg: 'bg-emerald-600 hover:bg-emerald-700',
            };
            case 'warning': return {
                text: 'text-amber-700',
                border: 'border-amber-500/30',
                bg: 'bg-amber-50',
                iconBg: 'bg-amber-600',
                statusLabel: 'Warning',
                ctaBg: 'bg-amber-600 hover:bg-amber-700',
            };
            case 'critical': return {
                text: 'text-red-700',
                border: 'border-red-500/30',
                bg: 'bg-red-50',
                iconBg: 'bg-red-600',
                statusLabel: 'Critical',
                ctaBg: 'bg-red-600 hover:bg-red-700',
            };
            default: return {
                text: 'text-[var(--color-rajya-muted)]',
                border: 'border-white/10',
                bg: 'bg-white/5',
                iconBg: 'bg-slate-600',
                statusLabel: 'Pending',
                ctaBg: 'bg-slate-600 hover:bg-slate-700',
            };
        }
    };

    const handleToggleTheme = () => {
        const next = ThemeStore.toggle();
        setTheme(next);
    };

    const hasMinimalVyayaData = ExpenseStore.getEntryCount() >= 3;

    // Next Best Action Engine
    const getNextBestAction = () => {
        if (identityCoverage.filled < 2) return {
            title: "Secure your identity.",
            subtext: "Add your Aadhaar or PAN in the Pehchaan Mandal to establish your core financial anchor.",
            route: "/pehchaan/records"
        };
        if (bankAccountCount === 0) return {
            title: "Map your liquidity.",
            subtext: "Add your primary bank account in the Pravah Mandal to calculate your emergency reserves.",
            route: "/khate/accounts"
        };
        if (IncomeStore.getRecords().length === 0) return {
            title: "Define your treasury.",
            subtext: "Add your primary income source to track your Kosh stability and surplus capacity.",
            route: "/kosh"
        };
        if (!hasMinimalVyayaData) return {
            title: "Establish expense baselines.",
            subtext: "Log recent expenses in the Vyaya Mandal so the system can calculate your financial leakage.",
            route: "/vyaya"
        };
        // Fake logic until stores are built
        const rakshaCompletion = KINGDOM_ZONES.find(z => z.id === 'protection')?.completion || 0;
        if (rakshaCompletion < 50) return {
            title: "Shield your kingdom.",
            subtext: "Complete your health or life insurance coverage records to protect against sudden financial shocks.",
            route: "/raksha"
        };
        const legacyCompletion = KINGDOM_ZONES.find(z => z.id === 'legacy')?.completion || 0;
        if (legacyCompletion < 50) return {
            title: "Secure your succession.",
            subtext: "Assign nominees and log your Will in the Mitra Mandal. Unclaimed assets are a Rajya's greatest risk.",
            route: "/mitra"
        };
        return null;
    };

    const nextAction = getNextBestAction();

    return (
        <div className="flex flex-col min-h-screen p-6 pb-24 lg:pb-8 lg:px-10 lg:pt-10 relative">
            {/* Ambient glow â€” larger on desktop */}
            <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-[var(--color-rajya-accent)]/10 to-transparent pointer-events-none" />
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-400/5 blur-[120px] rounded-full pointer-events-none hidden lg:block" />

            {/* Header */}
            <header className="mb-8 relative z-10 pt-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="font-display text-3xl lg:text-5xl text-[var(--color-rajya-text)]">Rajya Map</h1>
                        <p className="text-[var(--color-rajya-muted)] text-sm uppercase tracking-widest mt-1">Oversee your Kingdom</p>
                    </div>
                </div>
            </header>

            {/* Constrain desktop width so content doesn't stretch to screen edge */}
            <div className="lg:max-w-5xl lg:w-full">

            {/* Guide Section â€” only show on mobile; sidebar has stats on desktop */}
            <div className="bg-[var(--color-rajya-card)] border border-[var(--color-rajya-accent)]/20 rounded-xl p-4 mb-6 flex items-start gap-3 relative z-10 lg:hidden">
                <Info className="w-5 h-5 text-[var(--color-rajya-accent)] shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-medium text-[var(--color-rajya-text)]">Your Financial Kingdom</p>
                    <p className="text-xs text-[var(--color-rajya-muted)] leading-relaxed mt-1">Mandals are the core pillars of your financial kingdom. Each Mandal manages one specific area of your financial life to ensure total governance and security.</p>
                </div>
            </div>

            {/* Next Best Action Card */}
            {nextAction && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-4 mb-6 relative z-10 shadow-[0_0_15px_rgba(251,191,36,0.05)] cursor-pointer hover:bg-amber-400/15 transition-colors"
                    onClick={() => router.push(nextAction.route)}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-amber-500" />
                        <h3 className="text-amber-500 font-bold text-[10px] uppercase tracking-widest">Next Recommended Step</h3>
                    </div>
                    <p className="font-semibold text-[var(--color-rajya-text)] text-sm">{nextAction.title}</p>
                    <p className="text-xs text-[var(--color-rajya-muted)] mt-1">{nextAction.subtext}</p>
                </motion.div>
            )}

            {/* YouTube Tutorial */}
            <div className="mb-6 relative z-10">
                <p className="text-xs md:text-sm tracking-wider text-[var(--color-rajya-muted)]/50 uppercase mb-2">ðŸŽ“ Getting Started</p>
                <VideoTutorialPlaceholder youtubeId="iWsQY6Ha4OE" label="Complete guide to managing your personal finances" />
            </div>

            {/* Stability Score HUD â€” enhanced glow on desktop */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[var(--color-rajya-card)] border border-[var(--color-rajya-accent-dim)] rounded-2xl p-6 mb-8 shadow-lg lg:shadow-[0_0_60px_rgba(251,191,36,0.08)] relative overflow-hidden"
            >
                {/* Glow blobs */}
                <div className="absolute right-0 top-0 w-32 h-32 bg-[var(--color-rajya-accent)]/10 blur-3xl rounded-full" />
                <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-[var(--color-rajya-accent)]/5 blur-[80px] rounded-full hidden lg:block" />

                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-[var(--color-rajya-text)] font-semibold tracking-wide lg:text-lg">RAJYA HEALTH SCORE</h2>
                    <span className="text-3xl lg:text-5xl font-display text-[var(--color-rajya-accent)]">{stabilityScore}%</span>
                </div>
                
                <p className="text-[10px] text-[var(--color-rajya-muted)] mb-4">This score represents overall financial health across Mandals.</p>

                <div className="h-2 lg:h-3 w-full bg-[var(--color-rajya-muted)]/20 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${stabilityScore}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-[var(--color-rajya-accent-dim)] to-[var(--color-rajya-accent)] shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                    />
                </div>

                {stabilityScore < 70 && (
                    <div className="mt-4 flex items-center gap-2 text-xs text-[var(--color-rajya-accent)]">
                        <AlertCircle className="w-4 h-4" />
                        <span>Several walls require reinforcement.</span>
                    </div>
                )}
            </motion.div>

            {/* Zone Cards â€” 1-col mobile, 2-col desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 relative z-10">
                {KINGDOM_ZONES.map((zone, i) => {
                    const config = getStatusConfig(zone.status);
                    return (
                        <motion.button
                            key={zone.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => router.push(zone.route)}
                            className={`w-full text-left p-4 rounded-xl border-2 flex items-center justify-between transition-all hover:scale-[1.01] hover:shadow-lg active:scale-[0.99] ${config.border} ${config.bg}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg ${config.iconBg} flex items-center justify-center text-white shadow-sm`}>
                                    {zone.icon}
                                </div>
                                <div>
                                    <h3 className={`font-semibold text-sm ${config.text}`}>{zone.title}</h3>
                                    <p className="text-xs text-[var(--color-rajya-muted)] mt-0.5">{zone.desc}</p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <div className="h-1.5 w-14 bg-[var(--color-rajya-muted)]/20 rounded-full overflow-hidden">
                                            <div className={`h-full ${config.iconBg} rounded-full`} style={{ width: `${zone.completion}%` }} />
                                        </div>
                                        <span className={`text-[10px] uppercase font-bold tracking-wider ${config.text}`}>
                                            {config.statusLabel}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className={`px-3 py-1.5 rounded-lg ${config.ctaBg} text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm`}>
                                Open
                                <ChevronRight className="w-3 h-3" />
                            </div>
                        </motion.button>
                    );
                })}
            </div>

            {/* Leakage Audit Quick Trigger */}
            {hasMinimalVyayaData && (
                <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    onClick={() => router.push('/leakage')}
                    className="mt-6 w-full bg-[var(--color-rajya-card)] border-2 border-[var(--color-rajya-accent)]/50 text-[var(--color-rajya-accent)] p-4 rounded-xl flex items-center justify-center gap-2 uppercase tracking-widest text-xs font-bold hover:bg-[var(--color-rajya-accent)]/10 transition-colors"
                >
                    <Activity className="w-4 h-4" /> Run Leakage Audit
                </motion.button>
            )}
            </div>{/* end lg:max-w-5xl constraint */}
        </div>
    );
}
