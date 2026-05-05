import { useState } from "react";
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
}

const RELATION_OPTIONS = [
    "Spouse (Dampati)",
    "Child (Santati)", 
    "Parent (Pitri)",
    "Sibling (Bhratri)",
    "Other"
];
const ROLE_OPTIONS = ["Viewer", "Executor", "Emergency-only", "None"];

export function FamilyTreeGame({ members, onAddMember, onRemoveMember }: FamilyTreeProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        relationship: "Spouse (Dampati)",
        dob: "",
        phone: "",
        email: "",
        dependent: false,
        nomineeEligible: true,
        accessRole: "None" as FamilyMember["accessRole"]
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.dob) {
            setErrorMsg("Name and Janma Tithi (DOB) are required to forge a link.");
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
        console.log("DEBUG:", { formData, currentYear, targetBirthYear, spouseAge: currentYear - targetBirthYear, relationship: formData.relationship });
        if (targetBirthYear > currentYear) {
            setErrorMsg("Birth year cannot be in the future.");
            return;
        }
        if (targetBirthYear < 1900) {
            setErrorMsg("Birth year seems invalid.");
            return;
        }
        if (formData.relationship === "Spouse (Dampati)") {
            const spouseAge = currentYear - targetBirthYear;
            if (spouseAge < 18) {
                setErrorMsg("Spouse must be at least 18 years old.");
                return;
            }
        }
        const userDobStr = OnboardingStore.get().dob;
        if (userDobStr && formData.dob) {
            const userBirthYear = new Date(userDobStr).getFullYear();

            if (formData.relationship === "Child (Santati)") {
            if (!userDobStr) {
            setErrorMsg("Please complete your profile with your DOB first to add children.");
            return;
        }
           const userBirthYear = new Date(userDobStr).getFullYear();
           if (targetBirthYear >= userBirthYear) {
            setErrorMsg("A child's birth year must be after yours.");
           return;
    }
}
            if (formData.relationship === "Parent (Pitri)" && targetBirthYear >= userBirthYear) {
                setErrorMsg("A parent's birth year must be before yours.");
                return;
            }
        }

        onAddMember({ ...formData, phone: formData.phone || undefined, email: formData.email || undefined });
        setFormData({ name: "", relationship: "Spouse (Dampati)", dob: "", phone: "", email: "", dependent: false, nomineeEligible: true, accessRole: "None" });
        setIsAdding(false);
        setErrorMsg("");
    };

    return (
        <div className="w-full space-y-8">

            {/* Visual Tree Display */}
            <div className="relative min-h-[300px] flex flex-col items-center justify-center bg-black/20 rounded-2xl border border-white/5 p-6 overflow-hidden">
                {/* Background Mandala Hint */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                    <div className="w-64 h-64 border-[0.5px] border-[var(--color-rajya-accent)] rounded-full animate-[spin_60s_linear_infinite]" />
                    <div className="absolute w-48 h-48 border-[0.5px] border-[var(--color-rajya-accent)] rounded-full animate-[spin_45s_reverse_linear_infinite]" />
                </div>

                {/* Central User Node (Adhipati) */}
                <div className="z-10 bg-[var(--color-rajya-accent)]/20 border border-[var(--color-rajya-accent)] text-[var(--color-rajya-accent)] p-4 rounded-full shadow-[0_0_20px_rgba(251,191,36,0.3)] mb-8">
                    <UserIcon className="w-8 h-8 mx-auto mb-1" />
                    <span className="text-xs font-bold uppercase tracking-widest block text-center">Adhipati</span>
                </div>

                {/* Family Nodes Container */}
                <div className="z-10 flex flex-wrap justify-center gap-4 w-full">
                    <AnimatePresence>
                        {members.length === 0 && !isAdding && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="text-center text-[var(--color-rajya-muted)] text-sm italic w-full"
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
                                className="relative bg-[var(--color-rajya-card)] border border-[var(--color-rajya-accent-dim)] rounded-xl p-4 w-[140px] shadow-lg group"
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
                {members.length > 0 && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none -z-10">
                        {members.map((_, i) => (
                            <line
                                key={`line-${i}`}
                                x1="50%" y1="20%"
                                x2={`${20 + (i * (60 / Math.max(1, members.length - 1)))}%`} y2="60%"
                                stroke="rgba(251,191,36,0.2)" strokeWidth="2"
                                strokeDasharray="4 4"
                            />
                        ))}
                    </svg>
                )}
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
                                <input type="tel" placeholder="Mobile No. (Optional)" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-sm text-[var(--color-rajya-text)] focus:outline-none focus:border-[var(--color-rajya-accent)]" />
                                <input type="email" placeholder="Email ID (Optional)" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-sm text-[var(--color-rajya-text)] focus:outline-none focus:border-[var(--color-rajya-accent)]" />
                            </div>

                            <div className="flex items-center justify-between bg-black/30 p-4 rounded-xl border border-white/5">
                                <span className="text-sm text-[var(--color-rajya-muted)]">Dependent financially?</span>
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

                            <button type="submit" className="w-full bg-[var(--color-rajya-accent)]/10 text-[var(--color-rajya-accent)] border border-[var(--color-rajya-accent)]/50 py-3 rounded-xl font-medium mt-2 hover:bg-[var(--color-rajya-accent)] hover:text-black transition-colors">
                                Link to Profile
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}