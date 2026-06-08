"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";
import { FileUploader } from "@/components/vault/FileUploader";
import { useToast } from "@/components/providers/ToastProvider";

const PageGuide = dynamic(() => import("@/components/ui/PageGuide").then(mod => mod.PageGuide), { ssr: false });

interface SuccessionWill {
  id: string;
  willExists: boolean;
  executorName: string;
  executorContact: string;
  witnessNames: string[];
  digitalCopyUrl?: string;
  digitalCopyName?: string;
  linkedDocumentId?: string;
  lastSavedAt?: string;
}

export default function WillPage() {
  const router = useRouter();
  const toast = useToast();
  const [will, setWill] = useState<SuccessionWill | null>(null);
  const [executorName, setExecutorName] = useState("");
  const [executorContact, setExecutorContact] = useState("");
  const [witnessNames, setWitnessNames] = useState("");
  const [willExists, setWillExists] = useState(false);
  const [digitalCopyUrl, setDigitalCopyUrl] = useState("");
  const [documents, setDocuments] = useState<any[]>([]);
  const [linkedDocumentId, setLinkedDocumentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const getFileUrl = (fileRef?: string | null) => {
    if (!fileRef) return null;
    if (String(fileRef).startsWith('http')) return String(fileRef);
    const id = String(fileRef);
    const isGoogleDriveId = !id.startsWith('http') && id.length > 20 && !id.startsWith('opfs');
    if (isGoogleDriveId) return `https://drive.google.com/file/d/${id}/view`;
    return `/api/vault/download/${id}`;
  };
  const currentFileUrl = getFileUrl(digitalCopyUrl || will?.digitalCopyUrl);

  useEffect(() => {
    async function loadWill() {
      setLoading(true);
      try {
        const response = await fetch('/api/succession/will', { cache: 'no-store' });
        const result = await response.json();
        if (response.ok && result?.data) {
          setWill(result.data);
          setExecutorName(result.data.executorName || '');
          setExecutorContact(result.data.executorContact || '');
          setWitnessNames((result.data.witnessNames || []).join(', '));
          setWillExists(result.data.willExists ?? false);
          setDigitalCopyUrl(result.data.digitalCopyUrl || '');
          setLinkedDocumentId(result.data.linkedDocumentId || '');
        }
      } catch (error) {
        console.error('Failed to load will data', error);
        toast('Unable to load will details.', 'error');
      } finally {
        setLoading(false);
      }
    }

    loadWill();
  }, [toast]);

  useEffect(() => {
    async function loadDocuments() {
      try {
        const response = await fetch('/api/documents', { cache: 'no-store' });
        const result = await response.json();
        if (response.ok) {
          setDocuments(result?.data || []);
        }
      } catch (error) {
        console.error('Failed to load documents', error);
      }
    }

    loadDocuments();
  }, []);

  const saveWill = async () => {
    if (!executorName.trim() || !executorContact.trim()) {
      toast('Executor name and contact are required.', 'error');
      return;
    }
    if (!witnessNames.trim()) {
      toast('Enter at least one witness name.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        willExists,
        executorName: executorName.trim(),
        executorContact: executorContact.trim(),
        witnessNames: witnessNames.split(',').map(name => name.trim()).filter(Boolean),
        digitalCopyUrl,
        linkedDocumentId: linkedDocumentId || null,
      };

      const response = await fetch('/api/succession/will', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error?.message || 'Unable to save will details.');
      }
      setWill(result.data);
      setDigitalCopyUrl(result.data?.digitalCopyUrl || '');
      toast('Will details saved successfully.', 'success');
    } catch (error) {
      console.error('Save will failed', error);
      toast(error instanceof Error ? error.message : 'Unable to save will.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen p-6 pb-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />

      <div className="relative z-10 flex flex-col">
        <div className="flex items-center gap-3 pt-8 mb-6">
          <button onClick={() => router.push('/succession')} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 text-white/60" />
          </button>

          <div className="flex-1">
            <PageGuide
              title="Will & Executor"
              description="Capture executor details, witnesses and upload your will to the vault for safekeeping."
              actions={[{ emoji: '📜', label: 'Will' }]}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-lg font-semibold text-white">Executor & witness details</h2>
                <p className="mt-2 text-sm text-white/60">Your executor manages the estate, while witnesses make the will legally valid.</p>

                <div className="mt-6 grid gap-4">
                  <label className="space-y-2 text-sm text-white/70">
                    Executor name
                    <input
                      value={executorName}
                      onChange={e => setExecutorName(e.target.value)}
                      placeholder="Executor full name"
                      className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-white/70">
                    Executor contact
                    <input
                      value={executorContact}
                      onChange={e => setExecutorContact(e.target.value)}
                      placeholder="Phone number or email"
                      className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-white/70">
                    Witness names
                    <textarea
                      value={witnessNames}
                      onChange={e => setWitnessNames(e.target.value)}
                      placeholder="Separate names with commas"
                      rows={4}
                      className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white"
                    />
                  </label>

                  <label className="flex items-center gap-3 text-sm text-white/70">
                    <input
                      type="checkbox"
                      checked={willExists}
                      onChange={e => setWillExists(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-slate-900 text-emerald-500"
                    />
                    <span>I have a legally signed will document.</span>
                  </label>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-lg font-semibold text-white">Will document</h2>
                <p className="mt-2 text-sm text-white/60">Upload a digital copy to keep your succession file centralized.</p>
                <div className="mt-6">
                  <FileUploader
                    folder="will"
                    onUploaded={url => {
                      setDigitalCopyUrl(url);
                      toast('Will document uploaded.', 'success');
                    }}
                  />
                  {digitalCopyUrl && (
                    <div className="mt-3">
                      <p className="text-sm text-white/70">Uploaded document saved to your vault.</p>
                      {currentFileUrl && (
                        <a
                          href={currentFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-400 hover:text-sky-300 text-sm underline"
                        >
                          View uploaded will document
                        </a>
                      )}
                      {(will?.digitalCopyName || digitalCopyUrl) && (
                        <p className="text-xs text-white/50 mt-1">{will?.digitalCopyName ?? decodeURIComponent(String(digitalCopyUrl).split('/').pop() || '')}</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2 mt-4">
                    <label className="text-sm text-slate-400 mb-1 block">Linked Document (Optional)</label>
                    <select
                      value={linkedDocumentId}
                      onChange={(e) => setLinkedDocumentId(e.target.value)}
                      className="w-full p-3 rounded-md bg-white/5 text-white border border-white/10"
                    >
                      <option value="">Select a document</option>
                      {documents.map((doc: any) => (
                        <option key={doc.id} value={doc.id}>{`${doc.docType || 'Document'} - ${doc.fileName || doc.title || doc.id}`}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
                <h2 className="text-lg font-semibold text-white">Will readiness</h2>
                <div className="mt-4 space-y-4 text-sm text-white/70">
                  <div className="rounded-3xl bg-white/5 p-4">
                    <p className="font-medium text-white">Executor set</p>
                    <p>{executorName || 'Not set yet'}</p>
                  </div>
                  <div className="rounded-3xl bg-white/5 p-4">
                    <p className="font-medium text-white">Witnesses</p>
                    <p>{witnessNames || 'No witnesses added'}</p>
                  </div>
                  <div className="rounded-3xl bg-white/5 p-4">
                    <p className="font-medium text-white">Digital copy</p>
                    <div>
                      {digitalCopyUrl ? (
                        <>
                          {currentFileUrl && (
                            <a
                              href={currentFileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sky-400 hover:text-sky-300 text-sm underline"
                            >
                              View uploaded will document
                            </a>
                          )}
                          {(will?.digitalCopyName || digitalCopyUrl) && (
                            <p className="text-xs text-white/50 mt-1">{will?.digitalCopyName ?? decodeURIComponent(String(digitalCopyUrl).split('/').pop() || '')}</p>
                          )}
                        </>
                      ) : (
                        'Not uploaded'
                      )}
                    </div>
                  </div>
                  <div className="rounded-3xl bg-white/5 p-4">
                    <p className="font-medium text-white">Will declaration</p>
                    <p>{willExists ? 'Signed will exists' : 'No signed will declared'}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={saveWill}
                disabled={saving || loading}
                className="w-full rounded-3xl bg-emerald-500 px-5 py-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Will Details'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}