"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Users, ShieldAlert, CheckCircle2, ArrowLeft } from "lucide-react";
import { FamilyTreeGame, FamilyMember } from "@/components/module1/FamilyTreeGame";
import { VideoTutorialPlaceholder } from "@/components/ui/VideoTutorialPlaceholder";
import { OnboardingStore } from "@/lib/stores/onboardingStore";
import { useToast } from "@/components/providers/ToastProvider";

export default function Submodule1B() {
    const router = useRouter();
    const [step, setStep] = useState<"tutorial" | "mandal" | "win">("tutorial");
    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const toast = useToast();

    /**
     * FETCH: Always gets fresh data from database
     */
    const fetchFamilyMembers = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/family', { cache: 'no-store' });
            if (response.ok) {
                const json = await response.json();
                // Handle both response formats: { data: [...] } or just [...]
                const profileData = json?.data || json;

                if (Array.isArray(profileData)) {
                    const loadedMembers = profileData.map((member: any) => ({
                        id: member.id,
                        name: member.name || "",
                        relationship: member.relation || "Other",
                        dob: member.dob ? new Date(member.dob).toISOString().split('T')[0] : "",
                        phone: member.phone || "",
                        email: member.email || "",
                        dependent: member.isDependent === true,
                        nomineeEligible: member.nomineeEligible ?? true,
                        accessRole: member.accessLevel === "write" ? "Executor" :
                            member.accessLevel === "read" ? "Viewer" :
                                member.accessLevel === "emergency" ? "Emergency-only" : "None",
                    }));

                    console.log("Synced members from DB:", loadedMembers);
                    setMembers(loadedMembers);
                    OnboardingStore.set({ familyMembers: loadedMembers }, { sync: false });
                } else {
                    setMembers([]);
                }
            } else {
                setMembers([]);
            }
        } catch (err) {
            console.error('Failed to sync family members:', err);
            setMembers([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        fetchFamilyMembers();
    }, [fetchFamilyMembers]);

    /**
     * CREATE: Saves directly to DB then refreshes
     */
    const handleAddMember = async (memberData: Omit<FamilyMember, "id">) => {
        // Max 5 members validation
        if (members.length >= 5) {
            toast("Maximum 5 family members allowed.", "error");
            return;
        }

        // Mobile validation (10 digits)
        if (memberData.phone && !/^\d{10}$/.test(memberData.phone)) {
            toast("Mobile number must be exactly 10 digits.", "error");
            return;
        }

        // Email validation (@gmail.com)
        if (memberData.email && !memberData.email.endsWith("@gmail.com")) {
            toast("Email must be @gmail.com", "error");
            return;
        }

        console.log("Saving new member to DB:", memberData);
        setIsSaving(true);

        try {
            const payload = {
                name: memberData.name,
                relation: memberData.relationship,
                dob: memberData.dob,
                isDependent: memberData.dependent,
                nomineeEligible: memberData.nomineeEligible,
                accessLevel: memberData.accessRole === "Executor" ? "write" :
                    memberData.accessRole === "Viewer" ? "read" :
                        memberData.accessRole === "Emergency-only" ? "emergency" : "read",
                phone: memberData.phone || "",
                email: memberData.email || "",
            };

            const response = await fetch('/api/family', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to save member");
            }

            toast("Family member added successfully", "success");
            await fetchFamilyMembers(); // Refresh to get the real ID
        } catch (error) {
            console.error("Add failed:", error);
            toast(error instanceof Error ? error.message : "Failed to add member", "error");
        } finally {
            setIsSaving(false);
        }
    };

    /**
     * UPDATE: Updates an existing member in DB then refreshes
     */
    const handleEditMember = async (id: string, memberData: Omit<FamilyMember, "id">) => {
        // Mobile validation (10 digits)
        if (memberData.phone && !/^\d{10}$/.test(memberData.phone)) {
            toast("Mobile number must be exactly 10 digits.", "error");
            return;
        }

        // Email validation (@gmail.com)
        if (memberData.email && !memberData.email.endsWith("@gmail.com")) {
            toast("Email must be @gmail.com", "error");
            return;
        }

        console.log("Updating member in DB:", id, memberData);
        setIsSaving(true);

        try {
            const payload = {
                name: memberData.name,
                relation: memberData.relationship,
                dob: memberData.dob,
                isDependent: memberData.dependent,
                nomineeEligible: memberData.nomineeEligible,
                accessLevel: memberData.accessRole === "Executor" ? "write" :
                    memberData.accessRole === "Viewer" ? "read" :
                        memberData.accessRole === "Emergency-only" ? "emergency" : "read",
                phone: memberData.phone || "",
                email: memberData.email || "",
            };

            const response = await fetch(`/api/family?id=${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to update member");
            }

            toast("Family member updated successfully", "success");
            await fetchFamilyMembers(); // Refresh to sync UI
        } catch (error) {
            console.error("Update failed:", error);
            toast(error instanceof Error ? error.message : "Failed to update member", "error");
        } finally {
            setIsSaving(false);
        }
    };

    /**
     * DELETE: Removes from DB via query param then refreshes
     */
    const handleRemoveMember = async (id: string) => {
        console.log("Deleting member from DB:", id);

        // Optimistic update: remove from local state immediately to trigger UI/Effect updates
        setMembers(prev => prev.filter(m => m.id !== id));

        setIsSaving(true);

        try {
            const response = await fetch(`/api/family?id=${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const error = await response.json();
                // If API fails, refresh to restore correct state
                await fetchFamilyMembers();
                throw new Error(error.message || "Failed to delete member");
            }

            toast("Family member removed successfully", "success");
            // Final sync with database
            await fetchFamilyMembers();
        } catch (error) {
            console.error("Delete failed:", error);
            toast(error instanceof Error ? error.message : "Failed to delete member", "error");
        } finally {
            setIsSaving(false);
        }
    };

    /**
     * SEAL MANDAL: Final sync and proceed
     */
    const handleSealMandal = async () => {
        setIsLoading(true);
        try {
            await fetchFamilyMembers(); // Final safety sync
            if (members.length > 0) {
                setStep("win");
            } else {
                router.push('/foundation/education');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleFinish = () => {
        router.push('/foundation/education');
    };

    const dependencyCount = members.filter(m => m.dependent).length;
    const loadIndex = members.length > 0 ? Math.round((dependencyCount / members.length) * 100) : 0;

    if (isLoading && step === "tutorial") {
        return (
            <div className="flex flex-col min-h-screen relative p-6">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />
                <div className="relative z-10 flex items-center justify-center min-h-screen">
                    <div className="text-amber-400 text-center">
                        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-white/60">Syncing with your Mandal...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen relative p-6">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center gap-3 pt-8 mb-6">
                    <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center shrink-0">
                        <ArrowLeft className="w-4 h-4 text-white/60" />
                    </button>
                    <div>
                        <h1 className="text-lg font-semibold text-white">Family Members</h1>
                        <p className="text-xs text-white/35 mt-0.5">Who depends on you financially?</p>
                        {members.length > 0 && (
                            <p className="text-xs text-amber-400 mt-1">{members.length}/5 members in sync</p>
                        )}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {step === "tutorial" && (
                        <motion.div
                            key="tutorial"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex-1 space-y-12 flex flex-col justify-center"
                        >
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center shrink-0">
                                        <Users className="w-5 h-5 text-amber-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-semibold text-white">Family Members — Step 2 of 4</h2>
                                        <p className="text-xs text-white/50 mt-0.5">Add up to 5 members</p>
                                    </div>
                                </div>
                                <p className="text-sm text-white/55 leading-relaxed">
                                    Indian financial planning is deeply family-linked. Knowing who depends on you helps us prioritise your insurance and nomination coverage correctly.
                                </p>
                            </div>

                            <VideoTutorialPlaceholder youtubeId="hU0V-FwTmWk" label="Why family planning matters for financial protection" />

                            <button
                                onClick={() => setStep("mandal")}
                                className="w-full bg-amber-400 text-black font-semibold py-4 rounded-xl text-sm hover:bg-amber-300 transition-colors"
                            >
                                Enter Mandal
                            </button>
                        </motion.div>
                    )}

                    {step === "mandal" && (
                        <motion.div
                            key="mandal"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            className="flex-1 flex flex-col pt-4 pb-20 justify-between"
                        >
                            <FamilyTreeGame
                                members={members}
                                onAddMember={handleAddMember}
                                onRemoveMember={handleRemoveMember}
                                onEditMember={handleEditMember}
                            />

                            <div className="pt-8">
                                <button
                                    onClick={handleSealMandal}
                                    className="w-full bg-amber-400 text-black font-semibold py-4 rounded-xl text-sm hover:bg-amber-300 transition-colors flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    ) : null}
                                    Save & Continue ({members.length}/5 members)
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === "win" && (
                        <motion.div
                            key="win"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex-1 flex flex-col justify-center space-y-8"
                        >
                            <div className="text-center space-y-3">
                                <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
                                <h2 className="text-2xl font-semibold text-white">Mandal Secured</h2>
                                <p className="text-white/40 text-sm">{members.length} members verified in database</p>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
                                <h3 className="text-xs uppercase tracking-widest text-amber-400 mb-3">Financial Dependency Summary</h3>
                                <div className="flex items-end justify-center gap-2 mb-4">
                                    <span className="text-5xl font-bold text-white">{dependencyCount}</span>
                                    <span className="text-base text-white/50 mb-1">dependants identified</span>
                                </div>

                                {dependencyCount > 0 ? (
                                    <div className="text-left bg-red-500/8 border border-red-500/20 p-4 rounded-xl flex gap-3">
                                        <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-red-400 mb-1">Insurance Gap Detected</p>
                                            <p className="text-xs text-white/50">
                                                {loadIndex}% of your family are financially dependent on you. We&apos;ll prioritise life and health insurance coverage in your next steps.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-white/50 px-4 py-2">
                                        No financial dependants. Your planning focus will be personal growth and investments.
                                    </p>
                                )}
                            </div>

                            <button
                                onClick={handleFinish}
                                className="w-full bg-amber-400 text-black font-semibold py-4 rounded-xl text-sm hover:bg-amber-300 transition-colors"
                            >
                                Next: Education & Qualifications
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}