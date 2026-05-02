"use client";

import React, { useState, useCallback, useRef, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, User as UserIcon, ShieldAlert } from "lucide-react";
import { OnboardingStore } from "@/lib/stores/onboardingStore";

export type FamilyMember = {
    id: string;
    name: string;
    relationship: string;
    dob: string;
    phone?: string;
    email?: string;
    dependent: boolean;
    nomineeEligible: boolean;
    accessRole: "Viewer" | "Executor" | "Emergency-only" | "None";
};

interface FamilyTreeProps {
    members: FamilyMember[];
    onAddMember: (member: Omit<FamilyMember, "id">) => void;
    onRemoveMember: (id: string) => void;
    isSaving?: boolean;
}

const RELATION_OPTIONS = ["Spouse", "Child", "Parent", "Sibling", "Other"];
const ROLE_OPTIONS = ["Viewer", "Executor", "Emergency-only", "None"];

export const FamilyTreeGame = React.memo(function FamilyTreeGame({ members, onAddMember, onRemoveMember, isSaving }: FamilyTreeProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [mobileError, setMobileError] = useState("");
    const [emailError, setEmailError] = useState("");
    const containerRef = useRef<HTMLDivElement | null>(null);
    const centerRef = useRef<HTMLDivElement | null>(null);
    const memberRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [lines, setLines] = useState<Array<{ x1: number; y1: number; x2: number; y2: number }>>([]);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        relationship: "Spouse",
        dob: "",
        phone: "",
        email: "",
        dependent: false,
        nomineeEligible: true,
        accessRole: "None" as FamilyMember["accessRole"]
    });

    const handleMobileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        // Remove any non-digit characters and limit to 10 digits
        const value = e.target.value.replace(/\D/g, "").slice(0, 10);
        setFormData(prev => ({ ...prev, phone: value }));
        setMobileError("");
    }, []);

    const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setFormData(prev => ({ ...prev, email: value }));
        setEmailError("");
    }, []);

    const handleEmailBlur = useCallback(() => {
        if (formData.email && !formData.email.endsWith("@gmail.com")) {
            setEmailError("Only @gmail.com email addresses are allowed");
        }
    }, [formData.email]);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.name || !formData.dob) {
            setErrorMsg("Name and Janma Tithi (DOB) are required to forge a link.");
            return;
        }

        // Mobile validation if provided
        if (formData.phone && formData.phone.length !== 10) {
            setMobileError("Mobile number must be exactly 10 digits");
            return;
        }

        // Email validation if provided
        if (formData.email && !formData.email.endsWith("@gmail.com")) {
            setEmailError("Only @gmail.com email addresses are allowed");
            return;
        }

        // Duplicate detection
        const isDuplicate = members.some(m => m.name.toLowerCase() === formData.name.toLowerCase() && m.dob === formData.dob);
        if (isDuplicate) {
            setErrorMsg("This person already exists in your Mandal.");
            return;
        }

        // Age/Date validations
        const currentYear = new Date().getFullYear();
        const targetDate = new Date(formData.dob);
        const targetBirthYear = targetDate.getFullYear();

        if (targetBirthYear > currentYear) {
            setErrorMsg("Birth year cannot be in the future.");
            return;
        }
        if (targetBirthYear < 1900) {
            setErrorMsg("Birth year seems invalid.");
            return;
        }

        const userDobStr = OnboardingStore.get().dob;
        if (userDobStr && formData.dob) {
            const userBirthYear = new Date(userDobStr).getFullYear();

            if (formData.relationship === "Child" && targetBirthYear <= userBirthYear) {
                setErrorMsg("A child's birth year cannot be before or the same as yours.");
                return;
            }
            if (formData.relationship === "Parent" && targetBirthYear >= userBirthYear) {
                setErrorMsg("A parent's birth year must be before yours.");
                return;
            }
        }

        onAddMember({ ...formData, phone: formData.phone || undefined, email: formData.email || undefined });
        setFormData({ name: "", relationship: "Spouse", dob: "", phone: "", email: "", dependent: false, nomineeEligible: true, accessRole: "None" });
        setIsAdding(false);
        setErrorMsg("");
        setMobileError("");
        setEmailError("");
    }, [formData, members, onAddMember]);

    useLayoutEffect(() => {
        const calc = () => {
            const cont = containerRef.current;
            const center = centerRef.current;
            if (!cont || !center) return;

            const contRect = cont.getBoundingClientRect();
            const cRect = center.getBoundingClientRect();
            const cx = cRect.left + cRect.width / 2 - contRect.left;
            const cy = cRect.top + cRect.height / 2 - contRect.top;

            const newLines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

            members.forEach((m) => {
                const el = memberRefs.current[m.id];
                if (!el) return;

                const r = el.getBoundingClientRect();
                const mx = r.left + r.width / 2 - contRect.left;
                const my = r.top + r.height / 2 - contRect.top;
                newLines.push({ x1: cx, y1: cy, x2: mx, y2: my });
            });

            setLines(newLines);
        };

        calc();

        window.addEventListener("resize", calc);
        return () => window.removeEventListener("resize", calc);
    }, [members]);

    return (
        <div className="w-full space-y-8">

            {/* Visual Tree Display */}
                <div ref={containerRef} className="relative min-h-[300px] flex flex-col items-center justify-center bg-black/20 rounded-2xl border border-white/5 p-6 overflow-hidden">
                {/* Background Mandala Hint */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                    <div className="w-64 h-64 border-[0.5px] border-[var(--color-rajya-accent)] rounded-full animate-[spin_60s_linear_infinite]" />
                    <div className="absolute w-48 h-48 border-[0.5px] border-[var(--color-rajya-accent)] rounded-full animate-[spin_45s_reverse_linear_infinite]" />
                </div>

                {/* Central User Node (Adhipati) */}
                <div ref={centerRef} className="z-10 bg-[var(--color-rajya-accent)]/20 border border-[var(--color-rajya-accent)] text-[var(--color-rajya-accent)] p-4 rounded-full shadow-[0_0_20px_rgba(251,191,36,0.3)] mb-8">
                    <UserIcon className="w-8 h-8 mx-auto mb-1" />
                    <span className="text-xs font-bold uppercase tracking-widest block text-center">Adhipati</span>
                </div>

                {/* Family Nodes Container - Grid layout: 5 per row on large screens */}
                <div className="z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full">
                    <AnimatePresence>
                        {members.length === 0 && !isAdding && (
                            <motion.div
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }}
                                className="text-center text-[var(--color-rajya-muted)] text-sm italic col-span-full"
                            >
                                Your Mandal is empty. You govern alone.
                            </motion.div>
                        )}

                        {members.map((m, i) => (
                            <motion.div
                                key={m.id}
                                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                                transition={{ delay: i * 0.1 }}
                                className="relative bg-[var(--color-rajya-card)] border border-[var(--color-rajya-accent-dim)] rounded-xl p-4 w-full shadow-lg group"
                                ref={(el: HTMLDivElement | null) => { memberRefs.current[m.id] = el }}
                            >
                                <button
                                    onClick={() => onRemoveMember(m.id)}
                                    className="absolute -top-2 -right-2 bg-[var(--color-rajya-danger)] text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                                <div className="text-center">
                                    <h4 className="font-display font-bold text-[var(--color-rajya-text)] truncate">{m.name}</h4>
                                    <p className="text-[10px] text-[var(--color-rajya-accent)] uppercase tracking-wider mt-1">{m.relationship}</p>
                                    {m.dependent && (
                                        <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-[var(--color-rajya-danger)] bg-[var(--color-rajya-danger)]/10 py-1 rounded">
                                            <ShieldAlert className="w-3 h-3" /> Dependent
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Connection Lines simulation */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none -z-10">
                    {lines.map((ln, idx) => (
                        <line
                            key={`line-${idx}`}
                            x1={ln.x1}
                            y1={ln.y1}
                            x2={ln.x2}
                            y2={ln.y2}
                            stroke="rgba(251,191,36,0.2)"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            strokeLinecap="round"
                        />
                    ))}
                </svg>
            </div>

            {/* Add Member Flow */}
            <AnimatePresence mode="wait">
                {!isAdding ? (
                    <motion.div key="add-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {members.length < 5 && (
                            <button
                                onClick={() => setIsAdding(true)}
                                className="w-full border border-dashed border-[var(--color-rajya-accent-dim)] hover:border-[var(--color-rajya-accent)] text-[var(--color-rajya-muted)] hover:text-[var(--color-rajya-accent)] py-4 rounded-2xl flex items-center justify-center gap-2 transition-all transition-colors group bg-white/5"
                            >
                                <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                <span>Forge New Link (Max 5)</span>
                            </button>
                        )}
                        {members.length >= 5 && (
                            <div className="text-center text-amber-400/60 text-sm py-4 border border-amber-400/20 rounded-2xl bg-amber-400/5">
                                ✓ Maximum 5 members reached. Your Mandal is complete.
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="add-form"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-[var(--color-rajya-card)] border border-[var(--color-rajya-accent-dim)] rounded-2xl p-6 shadow-xl"
                    >
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-[var(--color-rajya-accent)] font-medium">Add to Mandal</h3>
                                <button type="button" onClick={() => setIsAdding(false)} className="text-[var(--color-rajya-muted)] hover:text-white"><X className="w-5 h-5" /></button>
                            </div>

                            <input type="text" placeholder="Full Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-[var(--color-rajya-text)] focus:outline-none focus:border-[var(--color-rajya-accent)]" />

                            <div className="grid grid-cols-2 gap-4">
                                <input type="date" value={formData.dob} onChange={e => setFormData({ ...formData, dob: e.target.value })} className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-sm text-[var(--color-rajya-text)] focus:outline-none focus:border-[var(--color-rajya-accent)]" />
                                <select value={formData.relationship} onChange={e => setFormData({ ...formData, relationship: e.target.value })} className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-sm text-[var(--color-rajya-text)] focus:outline-none focus:border-[var(--color-rajya-accent)]">
                                    {RELATION_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-[var(--color-rajya-card)]">{opt}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <input 
                                        type="tel" 
                                        placeholder="Mobile No. (10 digits)" 
                                        value={formData.phone} 
                                        onChange={handleMobileChange}
                                        maxLength={10}
                                        className={`w-full bg-black/50 border rounded-xl px-4 py-3 text-sm text-[var(--color-rajya-text)] focus:outline-none focus:border-[var(--color-rajya-accent)] ${mobileError ? 'border-red-500' : 'border-white/20'}`}
                                    />
                                    {mobileError && <p className="text-red-400 text-xs">{mobileError}</p>}
                                </div>
                                <div className="space-y-1">
                                    <input 
                                        type="email" 
                                        placeholder="Email ID (@gmail.com)" 
                                        value={formData.email} 
                                        onChange={handleEmailChange}
                                        onBlur={handleEmailBlur}
                                        className={`w-full bg-black/50 border rounded-xl px-4 py-3 text-sm text-[var(--color-rajya-text)] focus:outline-none focus:border-[var(--color-rajya-accent)] ${emailError ? 'border-red-500' : 'border-white/20'}`}
                                    />
                                    {emailError && <p className="text-red-400 text-xs">{emailError}</p>}
                                </div>
                            </div>

                            <div className="flex items-center justify-between bg-black/30 p-4 rounded-xl border border-white/5">
                                <span className={`text-sm transition-colors ${formData.dependent ? 'text-white' : 'text-white/40'}`}>
                                    Dependent financially?
                                </span>
                                <button type="button" onClick={() => setFormData({ ...formData, dependent: !formData.dependent })} className={`w-12 h-6 rounded-full transition-colors relative ${formData.dependent ? 'bg-[var(--color-rajya-danger)]' : 'bg-white/20'}`}>
                                    <motion.div animate={{ x: formData.dependent ? 24 : 2 }} className="w-5 h-5 bg-white rounded-full absolute top-0.5" />
                                </button>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-[var(--color-rajya-muted)] px-1">Rajya Access Level</label>
                                <select value={formData.accessRole} onChange={e => setFormData({ ...formData, accessRole: e.target.value as FamilyMember["accessRole"] })} className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-sm text-[var(--color-rajya-text)] focus:outline-none focus:border-[var(--color-rajya-accent)]">
                                    {ROLE_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-[var(--color-rajya-card)]">{opt}</option>)}
                                </select>
                            </div>

                            {errorMsg && <p className="text-[var(--color-rajya-danger)] text-xs text-center">{errorMsg}</p>}

                            <button 
                                type="submit" 
                                disabled={isSaving}
                                className="w-full bg-[var(--color-rajya-accent)]/10 text-[var(--color-rajya-accent)] border border-[var(--color-rajya-accent)]/50 py-3 rounded-xl font-medium mt-2 hover:bg-[var(--color-rajya-accent)] hover:text-black transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving && <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />}
                                Link to Profile
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});