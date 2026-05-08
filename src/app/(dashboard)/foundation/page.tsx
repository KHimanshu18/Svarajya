"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, GraduationCap, Camera, CheckCircle2, Trash2, Edit2 } from "lucide-react";
import { OnboardingStore } from "@/lib/stores/onboardingStore";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import dynamic from "next/dynamic";

const PageGuide = dynamic(() => import("@/components/ui/PageGuide").then(mod => mod.PageGuide), { ssr: false });
const VideoTutorialPlaceholder = dynamic(() => import("@/components/ui/VideoTutorialPlaceholder").then(mod => mod.VideoTutorialPlaceholder), { ssr: false });

const STEPS = [
    { id: "family", icon: <Users className="w-5 h-5" />, label: "Family Members", desc: "Who depends on you financially?", route: "/foundation/family" },
    { id: "education", icon: <GraduationCap className="w-5 h-5" />, label: "Education & Qualifications", desc: "Your background and any education loans", route: "/foundation/education" },
];

// Helper function to calculate life phase based on DOB
function getLifePhase(dob: string | null): string {
    if (!dob) return "Nirmaan"; // Default fallback

    try {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();

        // Adjust age if birthday hasn't occurred this year
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        if (age < 25) return "Yuva";
        if (age >= 25 && age < 40) return "Nirmaan";
        if (age >= 40 && age < 60) return "Sthirta";
        return "Parampara";
    } catch (error) {
        console.error("Error calculating life phase:", error);
        return "Nirmaan"; // Fallback on error
    }
}

export default function FoundationHub() {
    const router = useRouter();
    const data = OnboardingStore.get();
    const { user } = useAuth();
    const [profile, setProfile] = useState<null | Record<string, any>>(null);
    const [photoUploaded, setPhotoUploaded] = useState(false);
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const supabase = createClient();
    const toast = useToast();
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        let isMounted = true;
        const fetchProfile = async () => {
            try {
                const response = await fetch('/api/profile');
                if (!response.ok || !isMounted) return;

                const json = await response.json();
                const profileData = json?.data;
                if (profileData) {
                    setProfile(profileData);
                    OnboardingStore.set({
                        fullName: profileData.name || data.fullName || "",
                        dob: profileData.dob || data.dob || "",
                        lifePhase: profileData.lifePhase || data.lifePhase || "",
                        occupationType: profileData.occupationType || data.occupationType || "",
                        email: profileData.email || data.email || "",
                        mobile: profileData.phone || data.mobile || "",
                        familyMembers: profileData.familyMembers || data.familyMembers || [],
                    }, { sync: false });
                }
            } catch (err) {
                console.error('Failed to load foundation profile:', err);
            }
        };

        fetchProfile();
        return () => { isMounted = false; };
    }, []);

    // Load existing profile photo from user metadata
    useEffect(() => {
        if (user?.user_metadata?.profile_photo) {
            setPhotoUrl(user.user_metadata.profile_photo);
            setPhotoUploaded(true);
        }
    }, [user]);

    const handlePhotoUpload = useCallback(async (file: File) => {
        // Check file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            setUploadError("File size exceeds 2MB. Please choose a smaller image.");
            return false;
        }

        // Check file type
        if (!file.type.startsWith("image/")) {
            setUploadError("Please upload an image file (JPEG, PNG, etc.)");
            return false;
        }

        setUploading(true);
        setUploadError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not found");

            // Generate unique file name
            const fileExt = file.name.split(".").pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload to Supabase Storage bucket
            const { error: uploadError } = await supabase.storage
                .from("profile-photos")
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from("profile-photos")
                .getPublicUrl(filePath);

            const publicUrl = urlData.publicUrl;

            // Save URL to user_metadata
            const { error: updateError } = await supabase.auth.updateUser({
                data: { profile_photo: publicUrl }
            });

            if (updateError) throw updateError;

            setPhotoUrl(publicUrl);
            setPhotoUploaded(true);
            setUploadError(null);
            return true;
        } catch (err) {
            console.error("Upload error:", err);
            setUploadError("Failed to upload photo. Please try again.");
            return false;
        } finally {
            setUploading(false);
        }
    }, [supabase]);

    const handleRemovePhoto = useCallback(async () => {
        setUploading(true);
        try {
            if (photoUrl) {
                // Extract file name from URL
                const fileName = photoUrl.split("/").pop();
                if (fileName) {
                    // Delete from storage
                    await supabase.storage
                        .from("profile-photos")
                        .remove([fileName]);
                }
            }

            // Remove from user_metadata
            const { error: updateError } = await supabase.auth.updateUser({
                data: { profile_photo: null }
            });

            if (updateError) throw updateError;

            setPhotoUrl(null);
            setPhotoUploaded(false);
            setUploadError(null);
        } catch (err) {
            console.error("Remove error:", err);
            setUploadError("Failed to remove photo. Please try again.");
        } finally {
            setUploading(false);
        }
    }, [photoUrl, supabase]);

    const saveFamilyMembers = useCallback(async (familyMembers: any[]) => {
        try {
            const response = await fetch('/api/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    familyMembers,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to save family members');
            }

            toast('Family members saved successfully', 'success');
            return true;
        } catch (error) {
            console.error('Error saving family members:', error);
            toast('Failed to save family members. Please try again.', 'error');
            return false;
        }
    }, [toast]);

    return (
        <div className="flex flex-col min-h-screen p-6 pb-24 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />

            <div className="relative z-10 flex flex-col min-h-screen">
                {/* Header */}
                <div className="flex items-center gap-3 pt-8 mb-8">
                    <button onClick={() => router.push("/rajya")} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center">
                        <ArrowLeft className="w-4 h-4 text-white/60" />
                    </button>

                    {/* Guide Section */}
                    <PageGuide
                        title="Your Foundation (Sthapana)"
                        description="Complete your personal profile, add family members, and record your education. This forms the base of your financial kingdom."
                        actions={[{ emoji: "👤", label: "Profile" }, { emoji: "👪", label: "Family" }, { emoji: "🎓", label: "Education" }]}
                    />
                </div>

                {/* User identity card — populated from onboarding */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
                    <div className="flex items-center gap-4">
                        {/* Profile photo upload */}
                        <div className="relative shrink-0 group">
                            {photoUploaded && photoUrl ? (
                                <div className="relative">
                                    <img
                                        src={photoUrl}
                                        alt="Profile"
                                        className="w-14 h-14 rounded-full object-cover border-2 border-amber-400"
                                    />
                                    <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                        <button
                                            onClick={() => document.getElementById("photo-upload")?.click()}
                                            className="p-1 hover:bg-white/20 rounded-full"
                                            title="Edit"
                                        >
                                            <Edit2 className="w-3 h-3 text-white" />
                                        </button>
                                        <button
                                            onClick={handleRemovePhoto}
                                            className="p-1 hover:bg-white/20 rounded-full"
                                            title="Remove"
                                            disabled={uploading}
                                        >
                                            <Trash2 className="w-3 h-3 text-red-400" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    onClick={() => document.getElementById("photo-upload")?.click()}
                                    className="w-14 h-14 rounded-full bg-white/8 border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-0.5 overflow-hidden cursor-pointer hover:border-amber-400/50 transition-colors"
                                >
                                    <Camera className="w-5 h-5 text-white/30" />
                                    <span className="text-[9px] text-white/30">Photo</span>
                                </div>
                            )}
                            {/* Hidden file input */}
                            <input
                                id="photo-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handlePhotoUpload(file);
                                }}
                            />
                        </div>

                        <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => window.location.href = "/onboarding/name"}
                        >
                            <p className="font-semibold text-white truncate">{profile?.name || data.fullName || "Your Name"}</p>
                            <p className="text-xs text-white/40 mt-0.5">
                                {profile?.occupationType || data.occupationType || "Occupation"} · {getLifePhase(profile?.dob || data.dob)} phase
                            </p>
                            {(profile?.phone || data.mobile) && (
                                <div 
                                    className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => window.location.href = "/onboarding/contact-info?t=" + Date.now()}
                                >
                                    <p className="text-xs text-white/30 mt-0.5">+91 {profile?.phone || data.mobile}</p>
                                    {profile?.isMobileVerified && (
                                        <span className="text-emerald-400 text-[10px] uppercase tracking-[0.15em] font-medium">Verified</span>
                                    )}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => window.location.href = "/onboarding/name"}
                            className="text-xs text-black font-semibold bg-amber-400 px-3 py-1.5 rounded-full shrink-0 uppercase tracking-wide hover:bg-amber-500 transition-colors"
                        >
                            Edit
                        </button>
                    </div>

                    {/* Upload error message */}
                    {uploadError && (
                        <p className="text-red-400 text-xs mt-3 text-center">{uploadError}</p>
                    )}

                    {/* Uploading indicator */}
                    {uploading && (
                        <p className="text-amber-400 text-xs mt-3 text-center">Uploading...</p>
                    )}

                    {!photoUploaded && !uploadError && (
                        <p className="text-xs text-white/25 mt-3 text-center">Tap the circle above to add your photo (Max 2MB)</p>
                    )}
                </div>

                {/* Remaining steps */}
                <p className="text-xs text-white/35 uppercase tracking-wider mb-3">Next steps</p>
                <div className="space-y-3 flex-1">
                    {STEPS.map((step, i) => (
                        <motion.button
                            key={step.id}
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            onClick={() => router.push(step.route)}
                            className="w-full bg-white/5 border border-white/10 hover:border-amber-400/40 rounded-2xl p-4 flex items-center gap-4 text-left transition-all"
                        >
                            <div className="w-10 h-10 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center text-amber-400 shrink-0">
                                {step.icon}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-white">{step.label}</p>
                                <p className="text-xs text-white/40 mt-0.5">{step.desc}</p>
                            </div>
                            <span className="text-white/20 text-xl">›</span>
                        </motion.button>
                    ))}
                </div>

                {/* YouTube Tutorial */}
                <div className="mt-4">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">🎓 Learn More</p>
                    <VideoTutorialPlaceholder youtubeId="hU0V-FwTmWk" label="How to build a strong financial foundation" />
                </div>

                <div className="pb-4 pt-6">
                    <button
                        onClick={() => router.push("/rajya")}
                        className="w-full bg-amber-400 text-black font-semibold py-4 rounded-xl text-sm hover:bg-amber-300 transition-colors"
                    >
                        Go to Dashboard
                    </button>
                    <p className="text-center text-xs text-white/25 mt-2">
                        Family & education can be added anytime
                    </p>
                </div>
            </div>
        </div>
    );
}