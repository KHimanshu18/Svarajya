"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FileUploader } from "@/components/vault/FileUploader";
import { useToast } from "@/components/providers/ToastProvider";

const FIELD_LABELS: Record<string, string> = {
  assessmentYear: "Assessment year",
  financialYear: "Financial year",
  filingStatus: "Filing status",
  itrType: "ITR type",
  filingDate: "Filing date",
  taxPayable: "Tax payable",
  taxPaid: "Tax paid",
  acknowledgementNumber: "Acknowledgement number",
};
const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => {
  const start = 2020 + i;
  const end = String(start + 1).slice(-2);
  return `${start}-${end}`;
});

// Validate year format YYYY-YY
const validateYearFormat = (year: string): boolean => {
  const regex = /^\d{4}-\d{2}$/;
  return regex.test(year);
};

export default function NewItrPage() {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  function onUploaded(id: string) {
    setForm((f: any) => ({ ...(f || {}), documentId: id }));
  }

  const errors = useMemo(() => {
    const fieldErrors: Record<string, string> = {};

    // Assessment Year validation
    if (!form.assessmentYear || form.assessmentYear.trim() === "") {
      fieldErrors.assessmentYear = "Assessment year is required.";
    } else if (!validateYearFormat(form.assessmentYear.trim())) {
      fieldErrors.assessmentYear = "Format must be YYYY-YY (e.g., 2024-25).";
    }

    // Financial Year validation
    if (!form.financialYear || form.financialYear.trim() === "") {
      fieldErrors.financialYear = "Financial year is required.";
    } else if (!validateYearFormat(form.financialYear.trim())) {
      fieldErrors.financialYear = "Format must be YYYY-YY (e.g., 2023-24).";
    }

    // Filing Status validation
    if (!form.filingStatus || form.filingStatus.trim() === "") {
      fieldErrors.filingStatus = "Filing status is required.";
    } else if (!["Filed", "Pending"].includes(form.filingStatus)) {
      fieldErrors.filingStatus = "Select a valid filing status.";
    }

    // ITR Type validation
    if (!form.itrType || form.itrType.trim() === "") {
      fieldErrors.itrType = "ITR type is required.";
    } else if (!["ITR-1", "ITR-2", "ITR-3", "ITR-4"].includes(form.itrType)) {
      fieldErrors.itrType = "Select a valid ITR type.";
    }

    // Filing Date validation
    if (!form.filingDate || form.filingDate.trim() === "") {
      fieldErrors.filingDate = "Filing date is required.";
    } else {
      const date = new Date(form.filingDate);
      if (Number.isNaN(date.getTime())) {
        fieldErrors.filingDate = "Enter a valid date.";
      } else if (date > new Date()) {
        fieldErrors.filingDate = "Filing date cannot be in the future.";
      }
    }

    // Tax Payable validation
    const taxPayable = Number(form.taxPayable);
    if (
      form.taxPayable === "" ||
      form.taxPayable === undefined ||
      form.taxPayable === null
    ) {
      fieldErrors.taxPayable = "Tax payable is required.";
    } else if (Number.isNaN(taxPayable) || taxPayable <= 0) {
      fieldErrors.taxPayable = "Tax payable must be greater than 0.";
    }

    // Tax Paid validation
    const taxPaid = Number(form.taxPaid);
    if (
      form.taxPaid === "" ||
      form.taxPaid === undefined ||
      form.taxPaid === null
    ) {
      fieldErrors.taxPaid = "Tax paid is required.";
    } else if (Number.isNaN(taxPaid) || taxPaid < 0) {
      fieldErrors.taxPaid = "Tax paid must be 0 or greater.";
    }

    // Acknowledgement Number validation (required only if filingStatus is "Filed")
    if (form.filingStatus === "Filed") {
      if (
        !form.acknowledgementNumber ||
        form.acknowledgementNumber.trim() === ""
      ) {
        fieldErrors.acknowledgementNumber =
          "Acknowledgement number is required for filed returns.";
      } else if (form.acknowledgementNumber.trim().length < 5) {
        fieldErrors.acknowledgementNumber =
          "Acknowledgement number must be at least 5 characters.";
      }
    }

    return fieldErrors;
  }, [
    form.assessmentYear,
    form.financialYear,
    form.filingStatus,
    form.itrType,
    form.filingDate,
    form.taxPayable,
    form.taxPaid,
    form.acknowledgementNumber,
  ]);

  const invalidFieldKeys = Object.keys(errors);
  const hasErrors = invalidFieldKeys.length > 0;
  const showSummary = submitAttempted && hasErrors;
  const isFormValid = !hasErrors;

  async function save() {
    setSubmitAttempted(true);

    if (!isFormValid) {
      toast("Please fix the errors before saving", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/tax/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error?.message || "Save failed");
      router.push("/kar/itr");
    } catch (e) {
      toast((e as Error).message || "Unable to save", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-2xl mx-auto bg-slate-900/80 rounded-2xl p-6">
        <h1 className="text-lg font-semibold text-white">Add ITR Record</h1>

        {showSummary && (
          <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-100">
            <p className="text-sm font-semibold">
              Please fix the following errors:
            </p>
            <ul className="mt-2 list-disc pl-5 text-sm space-y-1 text-rose-100/90">
              {invalidFieldKeys.map((field) => (
                <li key={field}>{FIELD_LABELS[field] || field}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-3 mt-4">
          {/* Assessment Year */}
          <div>
            <label className="text-sm text-slate-400 mb-1 block">
              Assessment year
            </label>
          <select
            value={form.assessmentYear || ""}
            onChange={(e) =>
            setForm((f: any) => ({
              ...(f || {}),
              assessmentYear: e.target.value,
          }))
        }
        className={`w-full p-3 rounded-md bg-white/5 text-white border transition ${
          submitAttempted && errors.assessmentYear
        ? "border-rose-500/60"
        : "border-white/10"
      }`}
    >
      <option value="">Select Assessment Year</option>

      {YEAR_OPTIONS.map((year) => (
        <option key={year} value={year}>
        {year}
      </option>
    ))}
  </select>
            {submitAttempted && errors.assessmentYear && (
              <p className="text-xs text-rose-400 mt-1">
                {errors.assessmentYear}
              </p>
            )}
          </div>

          {/* Financial Year */}
          <div>
            <label className="text-sm text-slate-400 mb-1 block">
              Financial year
            </label>
            <select
              value={form.financialYear || ""}
              onChange={(e) =>
              setForm((f: any) => ({
                ...(f || {}),
                financialYear: e.target.value,
              }))
            }
            className={`w-full p-3 rounded-md bg-white/5 text-white border transition ${
              submitAttempted && errors.financialYear
              ? "border-rose-500/60"
              : "border-white/10"
            }`}
          >
            <option value="">Select Financial Year</option>

            {YEAR_OPTIONS.map((year) => (
              <option key={year} value={year}>
              {year}
              </option>
            ))}
          </select>
            {submitAttempted && errors.financialYear && (
              <p className="text-xs text-rose-400 mt-1">
                {errors.financialYear}
              </p>
            )}
          </div>

          {/* Filing Status */}
          <div>
            <label className="text-sm text-slate-400 mb-1 block">
              Filing status
            </label>
            <select
              value={form.filingStatus || ""}
              onChange={(e) =>
                setForm((f: any) => ({
                  ...(f || {}),
                  filingStatus: e.target.value,
                }))
              }
              className={`w-full p-3 rounded-md bg-white/5 text-white border transition ${submitAttempted && errors.filingStatus ? "border-rose-500/60" : "border-white/10"}`}
            >
              <option value="">Filing status</option>
              <option value="Filed">Filed</option>
              <option value="Pending">Pending</option>
            </select>
            {submitAttempted && errors.filingStatus && (
              <p className="text-xs text-rose-400 mt-1">
                {errors.filingStatus}
              </p>
            )}
          </div>

          {/* ITR Type */}
          <div>
            <label className="text-sm text-slate-400 mb-1 block">
              ITR Type
            </label>
            <select
              value={form.itrType || ""}
              onChange={(e) =>
                setForm((f: any) => ({ ...(f || {}), itrType: e.target.value }))
              }
              className={`w-full p-3 rounded-md bg-white/5 text-white border transition ${submitAttempted && errors.itrType ? "border-rose-500/60" : "border-white/10"}`}
            >
              <option value="">ITR Type</option>
              <option>ITR-1</option>
              <option>ITR-2</option>
              <option>ITR-3</option>
              <option>ITR-4</option>
            </select>
            {submitAttempted && errors.itrType && (
              <p className="text-xs text-rose-400 mt-1">{errors.itrType}</p>
            )}
          </div>

          {/* Filing Date */}
          <div>
            <label className="text-sm text-slate-400 mb-1 block">
              Filing date
            </label>
            <input
              type="date"
              value={form.filingDate || ""}
              onChange={(e) =>
                setForm((f: any) => ({
                  ...(f || {}),
                  filingDate: e.target.value,
                }))
              }
              className={`w-full p-3 rounded-md bg-white/5 text-white border transition ${submitAttempted && errors.filingDate ? "border-rose-500/60" : "border-white/10"}`}
            />
            {submitAttempted && errors.filingDate && (
              <p className="text-xs text-rose-400 mt-1">{errors.filingDate}</p>
            )}
          </div>

          {/* Tax Payable */}
          <div>
            <label className="text-sm text-slate-400 mb-1 block">
              Tax payable
            </label>
            <input
              type="number"
              placeholder="₹0"
              value={form.taxPayable ?? ("" as any)}
              onChange={(e) =>
                setForm((f: any) => ({
                  ...(f || {}),
                  taxPayable: e.target.value ? Number(e.target.value) : "",
                }))
              }
              className={`w-full p-3 rounded-md bg-white/5 text-white border transition ${submitAttempted && errors.taxPayable ? "border-rose-500/60" : "border-white/10"}`}
            />
            {submitAttempted && errors.taxPayable && (
              <p className="text-xs text-rose-400 mt-1">{errors.taxPayable}</p>
            )}
          </div>

          {/* Tax Paid */}
          <div>
            <label className="text-sm text-slate-400 mb-1 block">
              Tax paid
            </label>
            <input
              type="number"
              placeholder="₹0"
              value={form.taxPaid ?? ("" as any)}
              onChange={(e) =>
                setForm((f: any) => ({
                  ...(f || {}),
                  taxPaid: e.target.value ? Number(e.target.value) : "",
                }))
              }
              className={`w-full p-3 rounded-md bg-white/5 text-white border transition ${submitAttempted && errors.taxPaid ? "border-rose-500/60" : "border-white/10"}`}
            />
            {submitAttempted && errors.taxPaid && (
              <p className="text-xs text-rose-400 mt-1">{errors.taxPaid}</p>
            )}
          </div>

          {/* Acknowledgement Number */}
          <div>
            <label className="text-sm text-slate-400 mb-1 block">
              Acknowledgement number{" "}
              {form.filingStatus === "Filed" && (
                <span className="text-rose-400">*</span>
              )}
            </label>
            <input
              placeholder="Required if status is 'Filed'"
              value={form.acknowledgementNumber || ""}
              onChange={(e) =>
                setForm((f: any) => ({
                  ...(f || {}),
                  acknowledgementNumber: e.target.value,
                }))
              }
              className={`w-full p-3 rounded-md bg-white/5 text-white border transition ${submitAttempted && errors.acknowledgementNumber ? "border-rose-500/60" : "border-white/10"}`}
            />
            {submitAttempted && errors.acknowledgementNumber && (
              <p className="text-xs text-rose-400 mt-1">
                {errors.acknowledgementNumber}
              </p>
            )}
          </div>

          {/* File Upload */}
          <div className="rounded-2xl p-3 bg-white/5">
            <FileUploader
              folder="tax"
              tags={["ITR"]}
              accept=".pdf,.png,.jpg,.jpeg"
              maxSizeMB={10}
              onUploaded={onUploaded}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => router.push("/kar/itr")}
              className="px-4 py-2 bg-white/5 rounded-md hover:bg-white/10 transition"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
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
