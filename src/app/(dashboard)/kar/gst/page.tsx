"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash, Edit } from "lucide-react";
import { useRouter } from "next/navigation";
import { FileUploader } from "@/components/vault/FileUploader";

type GstRecord = {
  id: string;
  gstin: string;
  businessName?: string;
  filingFrequency?: string;
  lastFilingDate?: string | null;
  nextDueDate?: string | null;
  status?: string;
  documentUrl?: string | null;
  documentId?: string | null;
};

export default function GstPage() {
  const router = useRouter();
  const [records, setRecords] = useState<GstRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<GstRecord | null>(null);
  const [form, setForm] = useState<Partial<GstRecord>>({});

  const getFileUrl = (fileRef?: string | null) => {
    if (!fileRef) return null;
    if (String(fileRef).startsWith("http")) return String(fileRef);
    const id = String(fileRef);
    const isGoogleDriveId =
      !id.startsWith("http") && id.length > 20 && !id.startsWith("opfs");
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
      const res = await fetch("/api/gst/records");
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
    router.push("/kar/gst/new");
  }
  function onUploaded(id: string) {
    setForm((f) => ({ ...(f || {}), documentId: id }));
  }

  function daysUntil(dateStr?: string | null) {
    if (!dateStr) return Infinity;
    const d = new Date(dateStr);
    const diff = d.getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  async function save() {
    try {
      const res = await fetch(
        editing ? `/api/gst/records/${editing.id}` : "/api/gst/records",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error?.message || "Save failed");
      setShowForm(false);
      fetchRecords();
    } catch (e) {
      alert((e as Error).message || "Unable to save");
    }
  }

  function openDeleteModal(id: string) {
    setDeleteTargetId(id);
    setShowDeleteModal(true);
  }

  async function confirmDelete() {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      await fetch(`/api/gst/records/${deleteTargetId}`, { method: "DELETE" });
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
            <button
              onClick={() => router.push("/kar")}
              className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-white">
                GST Registrations
              </h1>
              <p className="text-sm text-white/60">
                Manage GSTINs and filing schedule.
              </p>
            </div>
          </div>
          <div>
            <button
              onClick={openNew}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400 text-black rounded-full"
            >
              <Plus className="w-4 h-4" /> Add GST Registration
            </button>
          </div>
        </div>

        {loading ?
          <div className="text-white/60">Loading…</div>
        : records.length === 0 ?
          <div className="rounded-2xl p-6 bg-white/5 text-white/60">
            No GST registrations added yet
          </div>
        : <div className="grid gap-4">
            {records.map((r) => {
              const days = daysUntil(r.nextDueDate);
              const badge =
                days <= 3 ? "bg-rose-500 text-white"
                : days <= 7 ? "bg-amber-400 text-black"
                : "bg-white/5 text-white/70";
              return (
                <div
                  key={r.id}
                  className="rounded-2xl p-4 bg-white/5 flex items-start justify-between"
                >
                  <div>
                    <div className="text-sm text-white/60">
                      {r.gstin} · {r.businessName}
                    </div>
                    <div className="mt-1 text-lg font-semibold text-white">
                      {r.filingFrequency}
                    </div>
                    <div className="mt-2 text-sm text-white/60">
                      Next due:{" "}
                      {r.nextDueDate ?
                        new Date(r.nextDueDate).toLocaleDateString("en-IN")
                      : "N/A"}{" "}
                    </div>
                    {r.documentUrl || r.documentId ?
                      <a
                        className="mt-2 inline-block text-sky-300 underline"
                        href={getFileUrl(r.documentUrl || r.documentId)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View Document
                      </a>
                    : <div className="mt-2 text-sm text-white/40">
                        No document
                      </div>
                    }
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`px-3 py-1 rounded-full text-sm ${badge}`}>
                      {r.status || "Unknown"}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/kar/gst/${r.id}/edit`)}
                        className="px-3 py-2 bg-white/5 rounded-md"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(r.id)}
                        className="px-3 py-2 bg-rose-500/10 rounded-md"
                      >
                        <Trash className="w-4 h-4 text-rose-400" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        }

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
            <div className="w-full max-w-2xl bg-slate-900/95 p-6 rounded-2xl">
              <h2 className="text-lg text-white font-semibold">
                {editing ? "Edit" : "Add"} GST Registration
              </h2>
              <div className="grid gap-3 mt-4">
                <input
                  placeholder="GSTIN"
                  value={form.gstin || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, gstin: e.target.value }))
                  }
                  className="p-3 rounded-md bg-white/5 text-white"
                />
                <input
                  placeholder="Business name"
                  value={form.businessName || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, businessName: e.target.value }))
                  }
                  className="p-3 rounded-md bg-white/5 text-white"
                />
                <select
                  value={form.filingFrequency || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, filingFrequency: e.target.value }))
                  }
                  className="p-3 rounded-md bg-white/5 text-white"
                >
                  <option value="">Filing frequency</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                </select>
                <input
                  type="date"
                  value={form.lastFilingDate || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lastFilingDate: e.target.value }))
                  }
                  className="p-3 rounded-md bg-white/5 text-white"
                />
                <input
                  type="date"
                  value={form.nextDueDate || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nextDueDate: e.target.value }))
                  }
                  className="p-3 rounded-md bg-white/5 text-white"
                />
                <select
                  value={form.status || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value }))
                  }
                  className="p-3 rounded-md bg-white/5 text-white"
                >
                  <option value="">Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <div className="rounded-2xl p-3 bg-white/5">
                  <FileUploader
                    folder="tax"
                    tags={["GST"]}
                    accept=".pdf,.png,.jpg,.jpeg"
                    maxSizeMB={10}
                    onUploaded={onUploaded}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 bg-white/5 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={save}
                    className="px-4 py-2 bg-amber-400 text-black rounded-md"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
            <div className="w-full max-w-sm bg-slate-900/95 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center">
                  <Trash className="w-6 h-6 text-rose-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">
                  Delete GST Registration
                </h2>
              </div>
              <p className="text-sm text-white/70 mb-6">
                Are you sure you want to delete this GST registration? This
                action cannot be undone.
              </p>
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
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
