"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash, Edit } from "lucide-react";
import { useRouter } from "next/navigation";

type ItrRecord = {
  id: string;
  assessmentYear: string;
  financialYear?: string;
  status?: string;           // Changed from filingStatus to status
  filingType?: string;
  filingDate?: string | null;
  taxDue?: number;
  taxPaid?: number;
  documentUrl?: string | null;
};

export default function ItrPage() {
  const router = useRouter();
  const [records, setRecords] = useState<ItrRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  const getFileUrl = (fileRef?: string | null) => {
    if (!fileRef) return null;
    if (String(fileRef).startsWith('http')) return String(fileRef);
    const id = String(fileRef);
    const isGoogleDriveId = !id.startsWith('http') && id.length > 20 && !id.startsWith('opfs');
    if (isGoogleDriveId) return `https://drive.google.com/file/d/${id}/view`;
    return `/api/vault/download/${id}`;
  };
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, []);

  async function fetchRecords() {
    setLoading(true);
    try {
      const res = await fetch("/api/tax/records");
      const j = await res.json();
      const responseData = j?.data?.records ?? j?.data ?? [];
      setRecords(Array.isArray(responseData) ? responseData : []);
    } catch (e) {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    router.push('/kar/itr/new');
  }

  function openDeleteModal(id: string) {
    setDeleteTargetId(id);
    setShowDeleteModal(true);
  }

  async function confirmDelete() {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      await fetch(`/api/tax/records/${deleteTargetId}`, { method: "DELETE" });
      setShowDeleteModal(false);
      setDeleteTargetId(null);
      fetchRecords();
    } catch (e) {
      alert("Unable to delete record");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/kar')} className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-white">ITR Records</h1>
              <p className="text-sm text-white/60">Manage your income tax return filings.</p>
            </div>
          </div>
          <div>
            <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400 text-black rounded-full">
              <Plus className="w-4 h-4" /> Add ITR Record
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-white/60">Loading…</div>
        ) : records.length === 0 ? (
          <div className="rounded-2xl p-6 bg-white/5 text-white/60">No ITR filings added yet</div>
        ) : (
          <div className="grid gap-4">
            {records.map((r) => (
              <div key={r.id} className="rounded-2xl p-4 bg-white/5 flex items-start justify-between">
                <div>
                  <div className="text-sm text-white/60">{r.assessmentYear} · {r.filingType || 'ITR type not set'}</div>
                  <div className="mt-1 text-lg font-semibold text-white">{r.status || 'Unknown'}</div>
                  <div className="mt-2 text-sm text-white/60">Paid: ₹{r.taxPaid ?? 0} · Payable: ₹{r.taxDue ?? 0}</div>
                  { (r.documentUrl || (r as any).documentId) ? (
                    <a className="mt-2 inline-block text-sky-300 underline" href={getFileUrl(r.documentUrl || (r as any).documentId)} target="_blank" rel="noreferrer">View Document</a>
                  ) : (
                    <div className="mt-2 text-sm text-white/40">No document</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => router.push(`/kar/itr/${r.id}/edit`)} className="px-3 py-2 bg-white/5 rounded-md"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => openDeleteModal(r.id)} className="px-3 py-2 bg-rose-500/10 rounded-md"><Trash className="w-4 h-4 text-rose-400" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-sm bg-slate-900/95 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center">
                <Trash className="w-6 h-6 text-rose-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Delete ITR Record</h2>
            </div>
            <p className="text-sm text-white/70 mb-6">Are you sure you want to delete this ITR record? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 bg-white/5 text-white rounded-md hover:bg-white/10 disabled:opacity-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 bg-rose-500 text-white rounded-md hover:bg-rose-600 disabled:opacity-50 transition"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}