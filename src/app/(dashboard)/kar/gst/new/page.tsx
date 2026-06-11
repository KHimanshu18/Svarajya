"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FileUploader } from "@/components/vault/FileUploader";
import { useToast } from "@/components/providers/ToastProvider";

type GstForm = {
  gstin?: string;
  businessName?: string;
  filingFrequency?: string;
  lastFilingDate?: string;
  nextDueDate?: string;
  gstr1Filed?: string;
  gstr3bFiled?: string;
  annualReturnFiled?: string;
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

export default function NewGstPage() {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<Partial<GstForm>>({});
  const [saving, setSaving] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const errors = useMemo(() => {
    const fieldErrors: Record<string, string> = {};
    const gstin = form.gstin?.trim() || "";
    const businessName = form.businessName?.trim() || "";

    if (!gstin) {
      fieldErrors.gstin = "GSTIN is required.";
    } else if (!/^[A-Za-z0-9]{15}$/.test(gstin)) {
      fieldErrors.gstin = "GSTIN must be 15 alphanumeric characters.";
    }

    if (!businessName) {
      fieldErrors.businessName = "Business name is required.";
    } else if (businessName.length < 2) {
      fieldErrors.businessName = "Business name must be at least 2 characters.";
    }

    if (!form.filingFrequency) {
      fieldErrors.filingFrequency = "Filing frequency is required.";
    }

    if (!form.lastFilingDate) {
      fieldErrors.lastFilingDate = "Last filing date is required.";
    } else if (!isValidDate(form.lastFilingDate)) {
      fieldErrors.lastFilingDate = "Enter a valid date.";
    } else if (isFutureDate(form.lastFilingDate)) {
      fieldErrors.lastFilingDate = "Last filing date cannot be in the future.";
    }

    if (!form.nextDueDate) {
      fieldErrors.nextDueDate = "Next due date is required.";
    } else if (!isValidDate(form.nextDueDate)) {
      fieldErrors.nextDueDate = "Enter a valid date.";
    }

    if (!form.gstr1Filed) {
      fieldErrors.gstr1Filed = "GSTR-1 filed status is required.";
    }

    if (!form.gstr3bFiled) {
      fieldErrors.gstr3bFiled = "GSTR-3B filed status is required.";
    }

    if (!form.annualReturnFiled) {
      fieldErrors.annualReturnFiled = "Annual return filed status is required.";
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
      const res = await fetch("/api/gst/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error?.message || "Save failed");
      router.push("/kar/gst");
    } catch (e) {
      toast((e as Error).message || "Unable to save", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-2xl mx-auto bg-slate-900/80 rounded-2xl p-6">
        <button
          onClick={() => router.push("/kar/gst")}
          className="text-sm text-white/60 hover:text-white mb-5 inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to GST registrations
        </button>

        <h1 className="text-xl font-semibold text-white">
          Add GST Registration
        </h1>
        <p className="text-sm text-white/60 mt-1">
          Create a new GST registration record on a separate page.
        </p>

        <div className="grid gap-3 mt-6">
          <div>
            <label className="text-sm text-slate-400 mb-1 block">GSTIN</label>
            <input
              placeholder="15-character GSTIN"
              value={form.gstin || ""}
              onChange={(e) =>
                setForm((f) => ({ ...(f || {}), gstin: e.target.value }))
              }
              className={`w-full p-3 rounded-md bg-white/5 text-white border transition ${submitAttempted && errors.gstin ? "border-rose-500/60" : "border-white/10"}`}
            />
            {showErrors && errors.gstin && (
              <p className="text-xs text-rose-400 mt-1">{errors.gstin}</p>
            )}
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-1 block">
              Business name
            </label>
            <input
              placeholder="Business name"
              value={form.businessName || ""}
              onChange={(e) =>
                setForm((f) => ({ ...(f || {}), businessName: e.target.value }))
              }
              className={`w-full p-3 rounded-md bg-white/5 text-white border transition ${submitAttempted && errors.businessName ? "border-rose-500/60" : "border-white/10"}`}
            />
            {showErrors && errors.businessName && (
              <p className="text-xs text-rose-400 mt-1">
                {errors.businessName}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-1 block">
              Filing frequency
            </label>
            <select
              value={form.filingFrequency || ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...(f || {}),
                  filingFrequency: e.target.value,
                }))
              }
              className={`w-full p-3 rounded-md bg-white/5 text-white border transition ${submitAttempted && errors.filingFrequency ? "border-rose-500/60" : "border-white/10"}`}
            >
              <option value="">Select filing frequency</option>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
            </select>
            {showErrors && errors.filingFrequency && (
              <p className="text-xs text-rose-400 mt-1">
                {errors.filingFrequency}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-1 block">
              Last filing date
            </label>
            <input
              type="date"
              value={form.lastFilingDate || ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...(f || {}),
                  lastFilingDate: e.target.value,
                }))
              }
              className={`w-full p-3 rounded-md bg-white/5 text-white border transition ${submitAttempted && errors.lastFilingDate ? "border-rose-500/60" : "border-white/10"}`}
            />
            {showErrors && errors.lastFilingDate && (
              <p className="text-xs text-rose-400 mt-1">
                {errors.lastFilingDate}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-1 block">
              Next due date
            </label>
            <input
              type="date"
              value={form.nextDueDate || ""}
              onChange={(e) =>
                setForm((f) => ({ ...(f || {}), nextDueDate: e.target.value }))
              }
              className={`w-full p-3 rounded-md bg-white/5 text-white border transition ${submitAttempted && errors.nextDueDate ? "border-rose-500/60" : "border-white/10"}`}
            />
            {showErrors && errors.nextDueDate && (
              <p className="text-xs text-rose-400 mt-1">{errors.nextDueDate}</p>
            )}
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-1 block">
              GSTR-1 Filed?
            </label>
            <select
              value={form.gstr1Filed || ""}
              onChange={(e) =>
                setForm((f) => ({ ...(f || {}), gstr1Filed: e.target.value }))
              }
              className={`w-full p-3 rounded-md bg-white/5 text-white border transition ${submitAttempted && errors.gstr1Filed ? "border-rose-500/60" : "border-white/10"}`}
            >
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
            {showErrors && errors.gstr1Filed && (
              <p className="text-xs text-rose-400 mt-1">{errors.gstr1Filed}</p>
            )}
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-1 block">
              GSTR-3B Filed?
            </label>
            <select
              value={form.gstr3bFiled || ""}
              onChange={(e) =>
                setForm((f) => ({ ...(f || {}), gstr3bFiled: e.target.value }))
              }
              className={`w-full p-3 rounded-md bg-white/5 text-white border transition ${submitAttempted && errors.gstr3bFiled ? "border-rose-500/60" : "border-white/10"}`}
            >
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
            {showErrors && errors.gstr3bFiled && (
              <p className="text-xs text-rose-400 mt-1">{errors.gstr3bFiled}</p>
            )}
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-1 block">
              Annual Return Filed?
            </label>
            <select
              value={form.annualReturnFiled || ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...(f || {}),
                  annualReturnFiled: e.target.value,
                }))
              }
              className={`w-full p-3 rounded-md bg-white/5 text-white border transition ${submitAttempted && errors.annualReturnFiled ? "border-rose-500/60" : "border-white/10"}`}
            >
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
            {showErrors && errors.annualReturnFiled && (
              <p className="text-xs text-rose-400 mt-1">
                {errors.annualReturnFiled}
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
              className={`w-full p-3 rounded-md bg-white/5 text-white border transition ${submitAttempted && errors.status ? "border-rose-500/60" : "border-white/10"}`}
            >
              <option value="">Select status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            {showErrors && errors.status && (
              <p className="text-xs text-rose-400 mt-1">{errors.status}</p>
            )}
          </div>

          <div className="rounded-2xl p-3 bg-white/5">
            <FileUploader
              folder="tax"
              tags={["GST"]}
              accept=".pdf,.png,.jpg,.jpeg"
              maxSizeMB={10}
              onUploaded={onUploaded}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => router.push("/kar/gst")}
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
