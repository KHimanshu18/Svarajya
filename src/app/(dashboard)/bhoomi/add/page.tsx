"use client";

import React, { useMemo, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FileUploader } from "@/components/vault/FileUploader";

const PROPERTY_TYPES = [
  "Residential",
  "Commercial",
  "Agricultural",
  "Land",
] as const;
const OWNERSHIP_TYPES = ["Solo", "Co-owned"] as const;

const FIELD_LABELS: Record<string, string> = {
  propertyTitle: "Title",
  propertyType: "Type",
  ownershipType: "Ownership",
  marketValue: "Market value",
  purchaseDate: "Purchase date",
  purchasePrice: "Purchase price",
  carryingCostsAnnual: "Annual carrying costs",
  rentalIncomeAnnual: "Annual rental income",
};

export default function AddBhoomiPropertyPage() {
  const router = useRouter();
  const [propertyTitle, setPropertyTitle] = useState("");
  const [propertyType, setPropertyType] =
    useState<(typeof PROPERTY_TYPES)[number]>("Residential");
  const [ownershipType, setOwnershipType] =
    useState<(typeof OWNERSHIP_TYPES)[number]>("Solo");
  const [marketValue, setMarketValue] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [loanId, setLoanId] = useState<string | null>(null);
  const [carryingCostsAnnual, setCarryingCostsAnnual] = useState("");
  const [rentalIncomeAnnual, setRentalIncomeAnnual] = useState("");
  const [secretFieldValue, setSecretFieldValue] = useState("");
  const [showSecretValue, setShowSecretValue] = useState(false);
  const [loans, setLoans] = useState<any[]>([]);
  const [vaultFileIds, setVaultFileIds] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [requestError, setRequestError] = useState("");

  React.useEffect(() => {
    fetch("/api/loans")
      .then((r) => r.json())
      .then((j) =>
        setLoans((j?.data && (j.data.loans || j.data)) || j.loans || []),
      )
      .catch(() => setLoans([]));
  }, []);

  const errors = useMemo(() => {
    const fieldErrors: Record<string, string> = {};
    const trimmedTitle = propertyTitle.trim();
    const marketAmount = Number(marketValue);
    const purchaseAmount = Number(purchasePrice);
    const carryingAmount = Number(carryingCostsAnnual);
    const rentalAmount = Number(rentalIncomeAnnual);

    if (!trimmedTitle) {
      fieldErrors.propertyTitle = "Property title is required.";
    } else if (trimmedTitle.length < 2) {
      fieldErrors.propertyTitle = "Title must be at least 2 characters.";
    } else if (trimmedTitle.length > 100) {
      fieldErrors.propertyTitle = "Title cannot exceed 100 characters.";
    }

    if (!PROPERTY_TYPES.includes(propertyType)) {
      fieldErrors.propertyType = "Select a valid property type.";
    }

    if (!OWNERSHIP_TYPES.includes(ownershipType)) {
      fieldErrors.ownershipType = "Select an ownership type.";
    }

    if (marketValue.trim() === "") {
      fieldErrors.marketValue = "Market value is required.";
    } else if (Number.isNaN(marketAmount) || marketAmount <= 0) {
      fieldErrors.marketValue = "Market value must be greater than 0.";
    }

    if (purchaseDate.trim()) {
      const date = new Date(purchaseDate);
      if (Number.isNaN(date.getTime())) {
        fieldErrors.purchaseDate = "Enter a valid date.";
      } else if (date > new Date()) {
        fieldErrors.purchaseDate = "Purchase date cannot be in the future.";
      }
    }

    if (purchasePrice.trim()) {
      if (Number.isNaN(purchaseAmount) || purchaseAmount < 0) {
        fieldErrors.purchasePrice = "Purchase price must be 0 or greater.";
      }
    }

    if (carryingCostsAnnual.trim()) {
      if (Number.isNaN(carryingAmount) || carryingAmount < 0) {
        fieldErrors.carryingCostsAnnual =
          "Carrying costs must be 0 or greater.";
      }
    }

    if (rentalIncomeAnnual.trim()) {
      if (Number.isNaN(rentalAmount) || rentalAmount < 0) {
        fieldErrors.rentalIncomeAnnual = "Rental income must be 0 or greater.";
      }
    }

    return fieldErrors;
  }, [
    propertyTitle,
    propertyType,
    ownershipType,
    marketValue,
    purchasePrice,
    purchaseDate,
    carryingCostsAnnual,
    rentalIncomeAnnual,
  ]);

  const invalidFieldKeys = Object.keys(errors);
  const hasErrors = invalidFieldKeys.length > 0;
  const showSummary = submitAttempted && hasErrors;
  const isFormValid = !hasErrors;

  const hasRoiInputs =
    carryingCostsAnnual.trim() !== "" && rentalIncomeAnnual.trim() !== "";
  const roiValue = useMemo(() => {
    const marketAmount = Number(marketValue);
    const carryingAmount = Number(carryingCostsAnnual);
    const rentalAmount = Number(rentalIncomeAnnual);
    if (Number.isNaN(marketAmount) || marketAmount <= 0) return null;
    if (Number.isNaN(carryingAmount) || Number.isNaN(rentalAmount)) return null;
    return ((rentalAmount - carryingAmount) / marketAmount) * 100;
  }, [marketValue, carryingCostsAnnual, rentalIncomeAnnual]);

  const onFieldChange =
    (setter: (value: string) => void) => (value: string) => {
      setter(value);
    };

  const onUploaded = (key: string, id: string) => {
    setVaultFileIds((s: any) => ({ ...(s || {}), [key]: id }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setRequestError("");

    if (!isFormValid) {
      return;
    }

    setSaving(true);
    try {
      const payload = {
        propertyTitle: propertyTitle.trim(),
        propertyType,
        ownershipType,
        marketValue: Number(marketValue),
        purchasePrice: purchasePrice.trim() ? Number(purchasePrice) : undefined,
        purchaseDate: purchaseDate || null,
        loanId: loanId || null,
        carryingCostsAnnual:
          carryingCostsAnnual.trim() ? Number(carryingCostsAnnual) : undefined,
        rentalIncomeAnnual:
          rentalIncomeAnnual.trim() ? Number(rentalIncomeAnnual) : undefined,
        vaultFileIds,
        secretFieldId: secretFieldValue.trim() ? secretFieldValue.trim() : null,
      };

      const res = await fetch("/api/bhoomi/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setRequestError(
          json?.error?.message || json?.message || "Unable to save property",
        );
        return;
      }

      router.push("/bhoomi");
    } catch (err) {
      console.error(err);
      setRequestError("Unable to save property. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-4xl bg-slate-900/95 border border-white/10 shadow-2xl shadow-slate-950/40 rounded-3xl backdrop-blur-xl overflow-hidden">
        <div className="relative bg-slate-950/80 px-6 py-5 border-b border-white/10">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back to Bhoomi"
            className="absolute left-6 top-5 w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80 hover:bg-white/10 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="max-w-2xl mx-auto text-center pt-1 pb-3">
            <p className="text-sm text-white/50 uppercase tracking-[0.3em] mb-3">
              Bhoomi asset management
            </p>
            <h2 className="text-3xl font-semibold text-white">
              Add a new property
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              Capture property details, connect loans, and manage access codes
              securely.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 grid gap-6">
          {showSummary && (
            <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-100">
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

          {requestError && (
            <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-100">
              {requestError}
            </div>
          )}

          <div className="grid gap-6">
            <label className="block">
              <span className="text-sm text-slate-400 mb-2 block">
                Property title
              </span>
              <input
                value={propertyTitle}
                onChange={(e) =>
                  onFieldChange(setPropertyTitle)(e.target.value)
                }
                className={`w-full rounded-3xl p-4 bg-slate-950 border text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition ${submitAttempted && errors.propertyTitle ? "border-rose-500/60" : "border-white/10"}`}
                placeholder="Enter property name"
              />
              {submitAttempted && errors.propertyTitle && (
                <p className="text-xs text-rose-400 mt-2">
                  {errors.propertyTitle}
                </p>
              )}
            </label>

            <div className="grid gap-4 xl:grid-cols-2">
              <label className="block">
                <span className="text-sm text-slate-400 mb-2 block">Type</span>
                <select
                  value={propertyType}
                  onChange={(e) =>
                    onFieldChange(setPropertyType)(e.target.value)
                  }
                  className={`w-full rounded-3xl p-4 bg-slate-950 border text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition ${submitAttempted && errors.propertyType ? "border-rose-500/60" : "border-white/10"}`}
                >
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                {submitAttempted && errors.propertyType && (
                  <p className="text-xs text-rose-400 mt-2">
                    {errors.propertyType}
                  </p>
                )}
              </label>

              <label className="block">
                <span className="text-sm text-slate-400 mb-2 block">
                  Ownership
                </span>
                <select
                  value={ownershipType}
                  onChange={(e) =>
                    onFieldChange(setOwnershipType)(e.target.value)
                  }
                  className={`w-full rounded-3xl p-4 bg-slate-950 border text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition ${submitAttempted && errors.ownershipType ? "border-rose-500/60" : "border-white/10"}`}
                >
                  {OWNERSHIP_TYPES.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
                {submitAttempted && errors.ownershipType && (
                  <p className="text-xs text-rose-400 mt-2">
                    {errors.ownershipType}
                  </p>
                )}
              </label>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <label className="block">
                <span className="text-sm text-slate-400 mb-2 block">
                  Market value
                </span>
                <input
                  value={marketValue}
                  onChange={(e) =>
                    onFieldChange(setMarketValue)(e.target.value)
                  }
                  type="number"
                  min="0"
                  step="0.01"
                  className={`w-full rounded-3xl p-4 bg-slate-950 border text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition ${submitAttempted && errors.marketValue ? "border-rose-500/60" : "border-white/10"}`}
                  placeholder="₹0"
                />
                {submitAttempted && errors.marketValue && (
                  <p className="text-xs text-rose-400 mt-2">
                    {errors.marketValue}
                  </p>
                )}
              </label>
              <label className="block">
                <span className="text-sm text-slate-400 mb-2 block">
                  Purchase price
                </span>
                <input
                  value={purchasePrice}
                  onChange={(e) =>
                    onFieldChange(setPurchasePrice)(e.target.value)
                  }
                  type="number"
                  min="0"
                  step="0.01"
                  className={`w-full rounded-3xl p-4 bg-slate-950 border text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition ${submitAttempted && errors.purchasePrice ? "border-rose-500/60" : "border-white/10"}`}
                  placeholder="₹0"
                />
                {submitAttempted && errors.purchasePrice && (
                  <p className="text-xs text-rose-400 mt-2">
                    {errors.purchasePrice}
                  </p>
                )}
              </label>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <label className="block">
                <span className="text-sm text-slate-400 mb-2 block">
                  Purchase date
                </span>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) =>
                    onFieldChange(setPurchaseDate)(e.target.value)
                  }
                  className={`w-full rounded-3xl p-4 bg-slate-950 border text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition ${submitAttempted && errors.purchaseDate ? "border-rose-500/60" : "border-white/10"}`}
                />
                {submitAttempted && errors.purchaseDate && (
                  <p className="text-xs text-rose-400 mt-2">
                    {errors.purchaseDate}
                  </p>
                )}
              </label>
              <label className="block">
                <span className="text-sm text-slate-400 mb-2 block">
                  Link loan (optional)
                </span>
                <select
                  value={loanId ?? ""}
                  onChange={(e) =>
                    onFieldChange(setLoanId)(e.target.value || null)
                  }
                  className="w-full rounded-3xl p-4 bg-slate-950 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition"
                >
                  <option value="">None</option>
                  {loans.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.lenderName || l.type || l.id}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <label className="block">
                <span className="text-sm text-slate-400 mb-2 block">
                  Annual carrying costs (₹)
                </span>
                <input
                  value={carryingCostsAnnual}
                  onChange={(e) =>
                    onFieldChange(setCarryingCostsAnnual)(e.target.value)
                  }
                  type="number"
                  min="0"
                  step="0.01"
                  className={`w-full rounded-3xl p-4 bg-slate-950 border text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition ${submitAttempted && errors.carryingCostsAnnual ? "border-rose-500/60" : "border-white/10"}`}
                  placeholder="Tax + Maintenance + Insurance"
                />
                {submitAttempted && errors.carryingCostsAnnual && (
                  <p className="text-xs text-rose-400 mt-2">
                    {errors.carryingCostsAnnual}
                  </p>
                )}
              </label>
              <label className="block">
                <span className="text-sm text-slate-400 mb-2 block">
                  Annual rental income (₹)
                </span>
                <input
                  value={rentalIncomeAnnual}
                  onChange={(e) =>
                    onFieldChange(setRentalIncomeAnnual)(e.target.value)
                  }
                  type="number"
                  min="0"
                  step="0.01"
                  className={`w-full rounded-3xl p-4 bg-slate-950 border text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition ${submitAttempted && errors.rentalIncomeAnnual ? "border-rose-500/60" : "border-white/10"}`}
                  placeholder="If property generates rental income"
                />
                {submitAttempted && errors.rentalIncomeAnnual && (
                  <p className="text-xs text-rose-400 mt-2">
                    {errors.rentalIncomeAnnual}
                  </p>
                )}
              </label>
            </div>

            {hasRoiInputs && (
              <div className="rounded-3xl bg-slate-950/80 border border-white/10 p-4 text-slate-100">
                <p className="text-sm text-slate-400">Projected ROI</p>
                <p className="text-xl font-semibold mt-2 text-white">
                  {roiValue === null ?
                    "Enter market value to calculate ROI"
                  : `${roiValue.toFixed(2)}% per year`}
                </p>
              </div>
            )}

            <label className="block">
              <span className="text-sm text-slate-400 mb-2 block">
                Secret field
              </span>
              <div className="relative">
                <input
                  type={showSecretValue ? "text" : "password"}
                  value={secretFieldValue}
                  onChange={(e) =>
                    onFieldChange(setSecretFieldValue)(e.target.value)
                  }
                  className="w-full rounded-3xl p-4 pr-14 bg-slate-950 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition"
                  placeholder="Enter access code"
                />
                <button
                  type="button"
                  onClick={() => setShowSecretValue((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                >
                  {showSecretValue ?
                    <EyeOff className="w-5 h-5" />
                  : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Use this to store access codes or private property credentials.
              </p>
            </label>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-5">
                <div className="text-sm text-slate-300 mb-3">Sale deed</div>
                <FileUploader
                  folder="property"
                  accept=".pdf,.png,.jpg,.jpeg"
                  maxSizeMB={10}
                  onUploaded={(id) => onUploaded("saleDeed", id)}
                />
              </div>
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-5">
                <div className="text-sm text-slate-300 mb-3">Tax receipt</div>
                <FileUploader
                  folder="property"
                  accept=".pdf,.png,.jpg,.jpeg"
                  maxSizeMB={10}
                  onUploaded={(id) => onUploaded("taxReceipt", id)}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-400">
              Complete the form and save the property to continue.
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-full bg-amber-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ?
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                : "Save property"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/bhoomi")}
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 py-3 text-white transition hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
