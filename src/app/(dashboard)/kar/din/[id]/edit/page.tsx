"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FileUploader } from "@/components/vault/FileUploader";
import { useToast } from "@/components/providers/ToastProvider";

type DinForm = {
  dinNumber?: string;
  companyName?: string;
  issueDate?: string;
  expiryDate?: string;
  dinKycStatus?: string;
  dscExpiryDate?: string;
  mcaFilingStatus?: string;
  directorSince?: string;
  status?: string;
  documentUrl?: string | null;
};

function isValidDate(value: string) {
  const date = new Date(value);
  return value.trim() !== "" && !Number.isNaN(date.getTime());
}

function isFutureDate(value: string) {
  const date = new Date(value);
  return date.getTime() > new Date().getTime();
}

function isDateAfter(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return end.getTime() > start.getTime();
}

export default function EditDinPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const id = String((params as { id?: string })?.id || "");
  const [form, setForm] = useState<Partial<DinForm>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchRecord = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/din/records/${id}`);
        const j = await res.json();
        const record = j?.data || j || {};

        setForm({
          dinNumber: record.dinNumber || "",
          companyName: record.companyName || "",
          issueDate: record.issueDate?.split("T")[0] || "",
          expiryDate: record.expiryDate?.split("T")[0] || "",
          dinKycStatus: record.dinKycStatus || "",
          dscExpiryDate: record.dscExpiryDate?.split("T")[0] || "",
          mcaFilingStatus: record.mcaFilingStatus || "",
          directorSince: record.directorSince?.split("T")[0] || "",
          status: record.status || "",
          documentUrl: record.documentUrl || "",
        });
      } catch {
        setForm({});
      } finally {
        setLoading(false);
      }
    };

    fetchRecord();
  }, [id]);

  const errors = useMemo(() => {
    const fieldErrors: Record<string, string> = {};
    const dinNumber = form.dinNumber?.trim() || "";
    const companyName = form.companyName?.trim() || "";

    if (!dinNumber) {
      fieldErrors.dinNumber = "DIN number is required.";
    } else if (!/^\d{8}[A-Z0-9]?$/.test(dinNumber)) {
      fieldErrors.dinNumber =
        "DIN must be 8 digits or 8 digits followed by an alphanumeric character.";
    }

    if (!companyName) {
      fieldErrors.companyName = "Company name is required.";
    } else if (companyName.length < 2) {
      fieldErrors.companyName = "Company name must be at least 2 characters.";
    }

    if (!form.issueDate) {
      fieldErrors.issueDate = "Issue date is required.";
    } else if (!isValidDate(form.issueDate)) {
      fieldErrors.issueDate = "Enter a valid issue date.";
    } else if (isFutureDate(form.issueDate)) {
      fieldErrors.issueDate = "Issue date cannot be in the future.";
    }

    if (!form.expiryDate) {
      fieldErrors.expiryDate = "Expiry date is required.";
    } else if (!isValidDate(form.expiryDate)) {
      fieldErrors.expiryDate = "Enter a valid expiry date.";
    } else if (
      form.issueDate &&
      !isDateAfter(form.issueDate, form.expiryDate)
    ) {
      fieldErrors.expiryDate = "Expiry date must be after issue date.";
    }

    if (!form.dinKycStatus) {
      fieldErrors.dinKycStatus = "DIN KYC Status is required.";
    }

    if (!form.dscExpiryDate) {
      fieldErrors.dscExpiryDate = "DSC Expiry Date is required.";
    } else if (!isValidDate(form.dscExpiryDate)) {
      fieldErrors.dscExpiryDate = "Enter a valid DSC expiry date.";
    }

    if (!form.mcaFilingStatus) {
      fieldErrors.mcaFilingStatus = "MCA Filing Status is required.";
    }

    if (!form.directorSince) {
      fieldErrors.directorSince = "Director Since date is required.";
    } else if (!isValidDate(form.directorSince)) {
      fieldErrors.directorSince = "Enter a valid director since date.";
    }

    if (!form.status) {
      fieldErrors.status = "Status is required.";
    }

    return fieldErrors;
  }, [form]);

  const invalidFieldKeys = Object.keys(errors);
  const hasErrors = invalidFieldKeys.length > 0;
  const isFormValid = !hasErrors;
  const showErrors =
    submitAttempted ||
    Object.values(form).some((value) => value !== undefined && value !== "");

  function onUploaded(url: string) {
    setForm((f) => ({ ...(f || {}), documentUrl: url }));
  }

  async function save() {
    setSubmitAttempted(true);
    if (!isFormValid) {
      toast("Please fix the errors before saving", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/din/records/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error?.message || "Save failed");
      router.push("/kar/din");
    } catch (e) {
      toast((e as Error).message || "Unable to save", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!id) return <div className="p-6 text-white/60">Invalid record id</div>;
  if (loading)
    return (
      <div className="p-6 flex items-center justify-center gap-3 text-white/60">
        <span className="inline-block h-5 w-5 rounded-full border-2 border-white/20 border-t-amber-400 animate-spin" />
        <span>Loading…</span>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-2xl mx-auto bg-slate-900/80 rounded-2xl p-6">
        <button
          onClick={() => router.push("/kar/din")}
          className="text-sm text-white/60 hover:text-white mb-5 inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to DIN records
        </button>

        <h1 className="text-xl font-semibold text-white">Edit DIN Record</h1>
        <p className="text-sm text-white/60 mt-1">
          Update the existing DIN record with the latest data.
        </p>

        <div className="grid gap-3 mt-6">
          <div>
            <label className="text-sm text-slate-400 mb-1 block">
              DIN number
            </label>
            <input
              placeholder="8-digit DIN"
              value={form.dinNumber || ""}
              onChange={(e) =>
                setForm((f) => ({ ...(f || {}), dinNumber: e.target.value }))
              }
              className={`w-full p-3 rounded-md bg-white/5 text-white border transition ${showErrors && errors.dinNumber ? "border-rose-500/60" : "border-white/10"}`}
            />
            {showErrors && errors.dinNumber && (
              <p className="text-xs text-rose-400 mt-1">{errors.dinNumber}</p>
            )}
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-1 block">
              Company name
            </label>
            <input
              placeholder="Company name"
              value={form.companyName || ""}
              onChange={(e) =>
                setForm((f) => ({ ...(f || {}), companyName: e.target.value }))
              }
              className={`w-full p-3 rounded-md bg-white/5 text-white border transition ${showErrors && errors.companyName ? "border-rose-500/60" : "border-white/10"}`}
            />
            {showErrors && errors.companyName && (
              <p className="text-xs text-rose-400 mt-1">{errors.companyName}</p>
            )}
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-1 block">
              Issue date
            </label>
            <input
              type="date"
              value={form.issueDate || ""}
              onChange={(e) =>
                setForm((f) => ({ ...(f || {}), issueDate: e.target.value }))
              }
              className={`w-full p-3 rounded-md bg-white/5 text-white border transition ${showErrors && errors.issueDate ? "border-rose-500/60" : "border-white/10"}`}
            />
            {showErrors && errors.issueDate && (
              <p className="text-xs text-rose-400 mt-1">{errors.issueDate}</p>
            )}
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-1 block">
              Expiry date
            </label>
            <input
              type="date"
              value={form.expiryDate || ""}
              onChange={(e) =>
                setForm((f) => ({ ...(f || {}), expiryDate: e.target.value }))
              }
              className={`w-full p-3 rounded-md bg-white/5 text-white border transition ${showErrors && errors.expiryDate ? "border-rose-500/60" : "border-white/10"}`}
            />
            {showErrors && errors.expiryDate && (
              <p className="text-xs text-rose-400 mt-1">{errors.expiryDate}</p>
            )}
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-1 block">
              DIN KYC Status
            </label>
            <select
              value={form.dinKycStatus || ""}
              onChange={(e) =>
                setForm((f) => ({ ...(f || {}), dinKycStatus: e.target.value }))
              }
              className={`w-full p-3 rounded-md bg-white/5 text-white border transition ${showErrors && errors.dinKycStatus ? "border-rose-500/60" : "border-white/10"}`}
            >
              <option value="">Select DIN KYC Status</option>
              <option value="Valid">Valid</option>
              <option value="Expired">Expired</option>
              <option value="Pending">Pending</option>
            </select>
            {showErrors && errors.dinKycStatus && (
              <p className="text-xs text-rose-400 mt-1">
                {errors.dinKycStatus}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-1 block">
              DSC Expiry Date
            </label>
            <input
              type="date"
              value={form.dscExpiryDate || ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...(f || {}),
                  dscExpiryDate: e.target.value,
                }))
              }
              className={`w-full p-3 rounded-md bg-white/5 text-white border transition ${showErrors && errors.dscExpiryDate ? "border-rose-500/60" : "border-white/10"}`}
            />
            {showErrors && errors.dscExpiryDate && (
              <p className="text-xs text-rose-400 mt-1">
                {errors.dscExpiryDate}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-1 block">
              MCA Filing Status
            </label>
            <select
              value={form.mcaFilingStatus || ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...(f || {}),
                  mcaFilingStatus: e.target.value,
                }))
              }
              className={`w-full p-3 rounded-md bg-white/5 text-white border transition ${showErrors && errors.mcaFilingStatus ? "border-rose-500/60" : "border-white/10"}`}
            >
              <option value="">Select MCA Filing Status</option>
              <option value="Filed">Filed</option>
              <option value="Pending">Pending</option>
              <option value="Not Applicable">Not Applicable</option>
            </select>
            {showErrors && errors.mcaFilingStatus && (
              <p className="text-xs text-rose-400 mt-1">
                {errors.mcaFilingStatus}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-1 block">
              Director Since
            </label>
            <input
              type="date"
              value={form.directorSince || ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...(f || {}),
                  directorSince: e.target.value,
                }))
              }
              className={`w-full p-3 rounded-md bg-white/5 text-white border transition ${showErrors && errors.directorSince ? "border-rose-500/60" : "border-white/10"}`}
            />
            {showErrors && errors.directorSince && (
              <p className="text-xs text-rose-400 mt-1">
                {errors.directorSince}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-1 block">Status</label>
            <select
              value={form.status || ""}
              onChange={(e) =>
                setForm((f) => ({ ...(f || {}), status: e.target.value }))
              }
              className={`w-full p-3 rounded-md bg-white/5 text-white border transition ${showErrors && errors.status ? "border-rose-500/60" : "border-white/10"}`}
            >
              <option value="">Select status</option>
              <option value="Active">Active</option>
              <option value="Expired">Expired</option>
            </select>
            {showErrors && errors.status && (
              <p className="text-xs text-rose-400 mt-1">{errors.status}</p>
            )}
          </div>

          <div className="rounded-2xl p-3 bg-white/5">
            <FileUploader
              folder="tax"
              tags={["DIN"]}
              accept=".pdf,.png,.jpg,.jpeg"
              maxSizeMB={10}
              onUploaded={onUploaded}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => router.push("/kar/din")}
              className="px-4 py-2 bg-white/5 rounded-md hover:bg-white/10 transition"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || !isFormValid}
              className="px-4 py-2 bg-amber-400 text-black rounded-md disabled:opacity-60 disabled:cursor-not-allowed hover:bg-amber-300 transition"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
