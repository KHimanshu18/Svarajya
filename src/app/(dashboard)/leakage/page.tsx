"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MicroLearningWrapper } from "@/components/module/MicroLearningWrapper";
import { SelectGridGame } from "@/components/module/SelectGridGame";
import { MonitorPlay, Music, Wifi, Box } from "lucide-react";
import { VideoTutorialPlaceholder } from "@/components/ui/VideoTutorialPlaceholder";

interface LeakageItem {
    id: string;
    label: string;
    icon: React.ReactNode;
}
const DEFAULT_SUBSCRIPTIONS: LeakageItem[] = [
    { id: 'video', label: 'Video Streaming', icon: <MonitorPlay /> },
    { id: 'audio', label: 'Audio & Music', icon: <Music /> },
    { id: 'internet', label: 'Internet', icon: <Wifi /> },
    { id: 'boxes', label: 'Delivery/Boxes', icon: <Box /> },
];

export default function LeakageModule() {
    const router = useRouter();

    const [subscriptions, setSubscriptions] =
        useState<LeakageItem[]>(DEFAULT_SUBSCRIPTIONS);
        useEffect(() => {
        fetch("/api/expenses")
            .then((res) => res.json())
            .then((data) => {
                const expenses = data.data || [];

                const recurringExpenses = expenses.filter(
                    (expense: any) => expense.isRecurring
                );

                if (recurringExpenses.length > 0) {
                    setSubscriptions(
                        recurringExpenses.map((expense: any) => ({
                            id: expense.id,
                            label: expense.description || expense.category,
                            icon: <MonitorPlay />,
                        }))
                    );
                }
            })
            .catch(() => {
                setSubscriptions(DEFAULT_SUBSCRIPTIONS);
            });
    }, []);

    const handleSave = (selectedIds: string[]) => {
        console.log("Leakages Identified:", selectedIds);
        // Move to next module or return to map
        router.push('/rajya');
    };

    return (
        <div className="min-h-screen py-12 px-6">
            <MicroLearningWrapper
                moduleTitle="The Matka (Leakage Audit)"
                contextText="A clay pot (Matka) with a microscopic hole will empty itself by dawn. Subscriptions and automatic renewals are the modern invisible holes."
                insightText="The average person underestimates their monthly subscription costs by $133. This silent drain erodes the foundation of the Rajya."
                quizQuestion="What makes a 'leak' more dangerous than a 'purchase'?"
                quizOptions={[
                    { label: "It happens silently and automatically every moon cycle.", isCorrect: true },
                    { label: "It costs more than buying a house.", isCorrect: false },
                    { label: "It is visible on the daily ledger.", isCorrect: false }
                ]}
                onDataCaptureUnlock={() => console.log("Leakage Unlocked!")}
            >
                <SelectGridGame
                    label="Identify The Holes"
                    description="Which of these automatic drains are currently drawing from your Kosh?"
                    items={subscriptions}
                    multiSelect={true}
                    onSave={handleSave}
                />
            </MicroLearningWrapper>

            {/* YouTube Tutorial */}
            <div className="mt-6">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">🎓 Learn More</p>
                <VideoTutorialPlaceholder youtubeId="PKisHOvFRow" label="Stop wasting money — hidden subscriptions & leakages" />
            </div>
        </div>
    );
}
