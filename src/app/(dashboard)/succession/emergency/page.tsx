"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ShieldAlert, CheckCircle2, BellRing, ArrowLeft, Clock, Eye, FileText } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

const PageGuide = dynamic(() => import("@/components/ui/PageGuide").then(mod => mod.PageGuide), { ssr: false });

interface SuccessionEmergency {
  id: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  secondaryContactName?: string;
  secondaryContactPhone?: string;
  verificationMethod: string;
  activationWaitingPeriod: string;
  assetAccessScope: string[];
  otpVerified: boolean;
  updatedAt?: string;
}

const scopeLabels: Record<string, string> = {
  insurance: 'Insurance policies',
  investment: 'Investments',
  property: 'Property holdings',
  documents: 'Estate documents',
};

export default function EmergencyPage() {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<SuccessionEmergency | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSentTo, setOtpSentTo] = useState<string | null>(null);
  const [otpVerified, setOtpVerified] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    async function loadEmergency() {
      setLoading(true);
      try {
        const response = await fetch('/api/succession/emergency', { cache: 'no-store' });
        const result = await response.json();
        if (response.ok && result?.data) {
          setData(result.data);
          setOtpVerified(result.data.otpVerified ?? false);
        }
      } catch (error) {
        console.error('Load emergency failed', error);
        toast('Unable to load emergency access settings.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadEmergency();
  }, [toast]);

  const setField = (field: keyof SuccessionEmergency, value: string | string[]) => {
    setData(prev =>
      prev
        ? { ...prev, [field]: value }
        : {
            id: '',
            emergencyContactName: '',
            emergencyContactPhone: '',
            verificationMethod: 'SMS',
            activationWaitingPeriod: 'Immediately',
            assetAccessScope: [],
            otpVerified: false,
            ...{ [field]: value },
          }
    );
  };

  const sendOtp = async () => {
    if (!data?.emergencyContactPhone) {
      toast('Enter emergency contact phone before sending OTP.', 'error');
      return;
    }

    setSendingOtp(true);
    setOtpVerified(false);
    setOtpSentTo(null);

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error?.message || 'Unable to send OTP email.');
      }

      setOtpSentTo(result.data.email);
      setOtp('');
      toast(`OTP sent to ${result.data.email}.`, 'success');
    } catch (error) {
      console.error('Send OTP failed', error);
      toast(error instanceof Error ? error.message : 'Failed to send OTP.', 'error');
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp.trim()) {
      toast('Enter the 6-digit OTP sent to your email.', 'error');
      return;
    }

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otp.trim() }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error?.message || 'Invalid OTP code.');
      }

      setOtpVerified(true);
      toast('OTP verified successfully.', 'success');
    } catch (error) {
      console.error('Verify OTP failed', error);
      setOtpVerified(false);
      toast(error instanceof Error ? error.message : 'OTP verification failed.', 'error');
    }
  };

  const saveEmergency = async () => {
    if (!data?.emergencyContactName || !data?.emergencyContactPhone) {
      toast('Emergency contact name and phone are required.', 'error');
      return;
    }
    if (!otpVerified) {
      toast('Verify the OTP before saving emergency settings.', 'error');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/succession/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emergencyContactName: data.emergencyContactName,
          emergencyContactPhone: data.emergencyContactPhone,
          secondaryContactName: data.secondaryContactName || '',
          secondaryContactPhone: data.secondaryContactPhone || '',
          verificationMethod: data.verificationMethod || 'SMS',
          activationWaitingPeriod: data.activationWaitingPeriod || 'Immediately',
          assetAccessScope: data.assetAccessScope || [],
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error?.message || 'Unable to save emergency protocol.');
      }
      setData(result.data);
      toast('Emergency protocol saved successfully.', 'success');
    } catch (error) {
      console.error('Save emergency failed', error);
      toast(error instanceof Error ? error.message : 'Failed to save emergency access.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleScope = (scope: string) => {
    if (!data) return;
    const current = new Set(data.assetAccessScope || []);
    if (current.has(scope)) {
      current.delete(scope);
    } else {
      current.add(scope);
    }
    setField('assetAccessScope', Array.from(current));
  };

  const summaryCards = useMemo(() => {
    return [
      {
        label: 'OTP verified',
        value: otpVerified ? 'Yes' : 'No',
        accent: otpVerified ? 'emerald' : 'red',
      },
      {
        label: 'Contact phone',
        value: data?.emergencyContactPhone || 'Not set',
        accent: 'white',
      },
      {
        label: 'Activation delay',
        value: data?.activationWaitingPeriod || 'Immediately',
        accent: 'white',
      },
      {
        label: 'Protected scopes',
        value: data?.assetAccessScope?.length
          ? data.assetAccessScope.map(scope => scopeLabels[scope]).join(', ')
          : 'None selected',
        accent: 'white',
      },
    ];
  }, [data, otpVerified]);

  return (
    <div className="flex flex-col min-h-screen p-6 pb-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />

      <div className="relative z-10 mx-auto flex max-w-6xl w-full flex-col gap-6">

        {/* Header row */}
        <div className="flex items-center gap-3 pt-8 mb-6">
          <button
            onClick={() => router.push('/succession')}
            className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 text-white/60" />
          </button>
          <div className="flex-1">
            <PageGuide
              title="Emergency Protocol"
              description="Define urgent access rules, verification flow and asset scope for your succession plan."
              actions={[{ emoji: '🚨', label: 'Emergency' }]}
            />
          </div>
        </div>

        {/* Page hero */}
        <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-lg shadow-black/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white">Prepare urgent access controls</h1>
              <p className="mt-2 max-w-2xl text-xs text-white/70">
                Define who can act for you in an emergency, how they verify access, and what estate areas they can reach.
              </p>
            </div>
            <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/70 shrink-0">
              {data?.updatedAt
                ? `Saved ${new Date(data.updatedAt).toLocaleString()}`
                : 'No emergency protocol saved yet'}
            </div>
          </div>
        </div>

        {/* Two-column main layout */}
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.95fr] items-start">

          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-6">

            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
              <div className="flex items-center gap-3 mb-6">
                <BellRing className="h-5 w-5 text-white/60" />
                <h2 className="text-sm font-semibold text-white">Emergency contact</h2>
              </div>
              <div className="grid gap-4">
                <label className="flex flex-col gap-2 text-sm text-white/70">
                  Primary contact name
                  <input
                    value={data?.emergencyContactName || ''}
                    onChange={e => setField('emergencyContactName', e.target.value)}
                    placeholder="Name of primary emergency contact"
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-white/70">
                  Primary contact phone
                  <input
                    value={data?.emergencyContactPhone || ''}
                    onChange={e => setField('emergencyContactPhone', e.target.value)}
                    placeholder="Phone number"
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm text-white/70">
                    Secondary contact name
                    <input
                      value={data?.secondaryContactName || ''}
                      onChange={e => setField('secondaryContactName', e.target.value)}
                      placeholder="Backup contact name"
                      className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-white/70">
                    Secondary contact phone
                    <input
                      value={data?.secondaryContactPhone || ''}
                      onChange={e => setField('secondaryContactPhone', e.target.value)}
                      placeholder="Backup phone"
                      className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
              <h2 className="text-sm font-semibold text-white">Asset access scope</h2>
              <p className="mt-2 text-xs text-white/60">Allow this contact to reach only the estate areas you choose.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {Object.entries(scopeLabels).map(([scope, label]) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => toggleScope(scope)}
                    className={`rounded-3xl border px-4 py-3 text-left text-sm transition ${
                      data?.assetAccessScope?.includes(scope)
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-white/10 bg-slate-900/80 hover:border-white/20'
                    }`}
                  >
                    <span className="font-semibold text-white">{label}</span>
                    <p className="mt-1 text-xs text-white/60">
                      {data?.assetAccessScope?.includes(scope) ? 'Access enabled' : 'Not enabled'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Eye className="h-5 w-5 text-white/60" />
                <h2 className="text-sm font-semibold text-white">Access audit log</h2>
              </div>
              <p className="text-xs text-white/50 mb-4">A record of every time this emergency protocol was triggered or accessed.</p>
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-5 py-8 text-center">
                <FileText className="h-8 w-8 text-white/20 mx-auto mb-3" />
                <p className="text-sm text-white/40">No access events recorded yet.</p>
                <p className="text-xs text-white/25 mt-1">Events will appear here once the protocol is activated.</p>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-5 lg:sticky lg:top-24">

            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
              <div className="flex items-center gap-3 mb-5">
                <ShieldAlert className="h-5 w-5 text-white/60" />
                <h2 className="text-sm font-semibold text-white">Emergency readiness</h2>
              </div>
              <div className="grid gap-3">
                {summaryCards.map(card => (
                  <div key={card.label} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-white/50">{card.label}</p>
                    <p
                      className={`mt-2 text-sm font-semibold ${
                        card.accent === 'emerald'
                          ? 'text-emerald-100'
                          : card.accent === 'red'
                          ? 'text-rose-100'
                          : 'text-white'
                      }`}
                    >
                      {card.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-sm font-semibold text-white">Verification flow</h3>
              <p className="mt-2 text-xs text-white/60">Choose the method the emergency contact uses to validate access.</p>
              <div className="mt-6 grid gap-3 grid-cols-3">
                {['SMS', 'Email', 'Both'].map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setField('verificationMethod', option)}
                    className={`rounded-3xl border px-4 py-3 text-sm text-white transition ${
                      data?.verificationMethod === option
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-white/10 bg-slate-900/80 hover:border-white/20'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <label className="mt-6 flex flex-col gap-2 text-sm text-white/70">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-white/40" />
                  Activation waiting period
                </div>
                <select
                  value={data?.activationWaitingPeriod || 'Immediately'}
                  onChange={e => setField('activationWaitingPeriod', e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white focus:outline-none focus:border-white/30"
                >
                  <option>Immediately</option>
                  <option>After 24 hours</option>
                  <option>After 72 hours</option>
                  <option>After 7 days</option>
                </select>
              </label>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-3 mb-1">
                <CheckCircle2 className="h-5 w-5 text-white/60" />
                <h3 className="text-sm font-semibold text-white">Verification</h3>
              </div>
              <p className="text-xs text-white/60 mb-4">
                {otpSentTo
                  ? `OTP sent to ${otpSentTo}. It expires in 10 minutes.`
                  : 'Enter the 6-digit OTP sent to your registered email address to verify emergency access.'}
              </p>
              <div className="grid gap-3">
                <label className="flex flex-col gap-2 text-sm text-white/70">
                  Enter OTP code
                  <input
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                  />
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={sendOtp}
                    disabled={sendingOtp}
                    className="flex-1 rounded-3xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sendingOtp ? 'Sending…' : 'Send OTP'}
                  </button>
                  <button
                    onClick={verifyOtp}
                    className="flex-1 rounded-3xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                  >
                    Verify
                  </button>
                </div>
                {otpVerified && (
                  <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <p className="text-sm text-emerald-300 font-medium">OTP verified successfully</p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
              <h3 className="text-sm font-semibold text-white">Lock in your protocol</h3>
              <p className="mt-2 text-xs text-white/60">Save emergency access rules once verification is complete.</p>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={saving || loading || !otpVerified}
                className="mt-5 w-full rounded-3xl bg-emerald-500 px-5 py-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Emergency Protocol'}
              </button>
              {!otpVerified && (
                <p className="mt-3 text-xs text-white/60">
                  Save is locked until OTP verification is complete.
                </p>
              )}
            </div>

          </div>
        </section>

        <ConfirmModal
          isOpen={confirmOpen}
          title="Confirm emergency save"
          message="Save this emergency protocol and lock the current settings for your succession plan?"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => { setConfirmOpen(false); saveEmergency(); }}
        />
      </div>
    </div>
  );
}