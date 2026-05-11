"use client";

import { useState } from "react";
import { Lock, Unlock, ShieldAlert } from "lucide-react";
import { CredentialStore, EncryptedSecret } from "@/lib/credentialStore";
import { encryptString, verifyPassphrase } from "@/lib/utils/crypto";

interface MasterPassphraseModalProps {
    mode: "create" | "unlock" | "reset";
    onClose: () => void;
    onUnlocked?: () => void;
}

export function MasterPassphraseModal({ mode, onClose, onUnlocked }: MasterPassphraseModalProps) {
    const [passphrase, setPassphrase] = useState("");
    const [confirm, setConfirm] = useState("");
    const [understood, setUnderstood] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (passphrase.length < 10) {
            setError("Passphrase must be at least 10 characters.");
            return;
        }
        if (passphrase !== confirm) {
            setError("Passphrases do not match.");
            return;
        }
        if (!understood) {
            setError("Please confirm you understand the no-recovery policy.");
            return;
        }
        setLoading(true);
        try {
            const result = await encryptString("RAJYA_VAULT_VERIFY", passphrase);
            const blob: EncryptedSecret = {
                version: 1,
                alg: "AES-GCM",
                kdf: "PBKDF2",
                iterations: result.iterations,
                saltB64: result.saltB64,
                ivB64: result.ivB64,
                cipherTextB64: result.cipherTextB64,
                createdAt: new Date().toISOString(),
            };
            CredentialStore.setMasterVerifyBlob(blob);
            CredentialStore.unlockVault();
            onUnlocked?.();
            onClose();
        } catch {
            setError("Failed to create vault. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleUnlock = async () => {
        if (!passphrase) { setError("Enter your master passphrase."); return; }
        setLoading(true);
        try {
            const blob = CredentialStore.getMasterVerifyBlob();
            if (!blob) { setError("Vault not found."); return; }
            const valid = await verifyPassphrase(blob, passphrase);
            if (!valid) { setError("Incorrect passphrase. Try again."); setLoading(false); return; }
            CredentialStore.unlockVault();
            onUnlocked?.();
            onClose();
        } catch {
            setError("Incorrect passphrase. Try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        CredentialStore.resetVault();
        onClose();
    };

    const lockLabel = CredentialStore.getLockDurationMs() === 5 * 60 * 1000 ? "5 minutes"
        : CredentialStore.getLockDurationMs() === 15 * 60 * 1000 ? "15 minutes" : "Until tab closes";

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-5" onClick={onClose}>
            <div className="bg-slate-900 border border-white/15 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>

                {/* â€”â€”â€” CREATE MODE â€”â€”â€” */}
                {mode === "create" && (
                    <>
                        <Lock className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                        <h2 className="text-white font-semibold text-center text-base">Create your Master Passphrase</h2>
                        <p className="text-xs text-white/40 text-center mt-1 mb-5">
                            This passphrase encrypts your stored passwords on your device. We never receive it.
                        </p>

                        <div className="space-y-3">
                            <input type="password" placeholder="Master Passphrase" value={passphrase}
                                onChange={e => { setPassphrase(e.target.value); setError(""); }}
                                className="w-full bg-white/6 border border-white/15 rounded-xl px-3 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/60" />
                            <input type="password" placeholder="Confirm Passphrase" value={confirm}
                                onChange={e => { setConfirm(e.target.value); setError(""); }}
                                className="w-full bg-white/6 border border-white/15 rounded-xl px-3 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/60" />

                            <div className="bg-white/3 rounded-xl p-3 space-y-1.5">
                                <p className="text-[10px] text-white/30">â€¢ Use at least 10 characters</p>
                                <p className="text-[10px] text-white/30">â€¢ Use a phrase you can remember</p>
                                <p className="text-[10px] text-white/30 italic">Example: &quot;My-first-car-was-a-Swift!&quot;</p>
                            </div>

                            <label className="flex items-start gap-2.5 cursor-pointer">
                                <input type="checkbox" checked={understood} onChange={e => setUnderstood(e.target.checked)}
                                    className="mt-1 accent-amber-400" />
                                <span className="text-[11px] text-white/40 leading-snug">
                                    I understand: If I forget this passphrase, encrypted passwords cannot be recovered.
                                </span>
                            </label>
                        </div>

                        {error && <p className="text-xs text-red-400 text-center mt-3">âš  {error}</p>}

                        <button onClick={handleCreate} disabled={loading}
                            className="w-full bg-amber-400 text-black font-semibold py-3.5 rounded-xl text-sm mt-4 hover:bg-amber-300 transition-colors disabled:opacity-50">
                            {loading ? "Creating..." : "Create & Lock Vault"}
                        </button>
                        <p className="text-[10px] text-white/20 text-center mt-3">
                            We do not store your passphrase. Only an encrypted lock is stored locally.
                        </p>
                    </>
                )}

                {/* â€”â€”â€” UNLOCK MODE â€”â€”â€” */}
                {mode === "unlock" && (
                    <>
                        <Unlock className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                        <h2 className="text-white font-semibold text-center text-base">Unlock to continue</h2>
                        <p className="text-xs text-white/40 text-center mt-1 mb-5">
                            Enter your Master Passphrase to reveal or edit stored passwords.
                        </p>

                        <input type="password" placeholder="Master Passphrase" value={passphrase}
                            onChange={e => { setPassphrase(e.target.value); setError(""); }}
                            className="w-full bg-white/6 border border-white/15 rounded-xl px-3 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/60" />

                        {error && <p className="text-xs text-red-400 text-center mt-3">âš  {error}</p>}

                        <div className="flex gap-3 mt-4">
                            <button onClick={onClose}
                                className="flex-1 py-3 rounded-xl border border-white/10 text-sm text-white/50">Cancel</button>
                            <button onClick={handleUnlock} disabled={loading}
                                className="flex-1 py-3 rounded-xl bg-amber-400 text-black text-sm font-semibold disabled:opacity-50">
                                {loading ? "..." : "Unlock"}
                            </button>
                        </div>

                        <p className="text-[10px] text-white/20 text-center mt-3">
                            Vault locks after {lockLabel}.
                        </p>
                    </>
                )}

                {/* â€”â€”â€” RESET MODE â€”â€”â€” */}
                {mode === "reset" && (
                    <>
                        <ShieldAlert className="w-10 h-10 text-red-400 mx-auto mb-3" />
                        <h2 className="text-white font-semibold text-center text-base">Passphrase can&apos;t be recovered</h2>
                        <p className="text-xs text-white/40 text-center mt-1 mb-5">
                            For security, we don&apos;t store your master passphrase. If you reset it, previously encrypted passwords will be deleted.
                        </p>

                        <div className="flex gap-3">
                            <button onClick={onClose}
                                className="flex-1 py-3 rounded-xl border border-white/10 text-sm text-white/50">Cancel</button>
                            <button onClick={handleReset}
                                className="flex-1 py-3 rounded-xl bg-red-500/15 border border-red-500/30 text-sm text-red-400 font-medium">
                                Reset Vault
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
