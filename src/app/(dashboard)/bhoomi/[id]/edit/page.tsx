"use client";

import React, { useEffect, useState } from "react";
import { NotificationStore } from "@/lib/stores/notificationStore";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { FileUploader } from "@/components/vault/FileUploader";

const PROPERTY_TYPES = [
  "Residential",
  "Commercial",
  "Agricultural",
  "Land",
] as const;
const OWNERSHIP_TYPES = ["Solo", "Co-owned"] as const;

export default function EditBhoomiPropertyPage() {
  const router = useRouter();
  const params = useParams() as { id: string };
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [propertyTitle, setPropertyTitle] = useState("");
  const [propertyType, setPropertyType] =
    useState<(typeof PROPERTY_TYPES)[number]>("Residential");
  const [ownershipType, setOwnershipType] =
    useState<(typeof OWNERSHIP_TYPES)[number]>("Solo");
  const [marketValue, setMarketValue] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [loanId, setLoanId] = useState<string | null>(null);
  const [loans, setLoans] = useState<any[]>([]);
  const [vaultFileIds, setVaultFileIds] = useState<any>({});

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/bhoomi/properties`).then((r) => r.json()),
      fetch("/api/loans")
        .then((r) => r.json())
        .catch(() => ({ data: [] })),
    ])
      .then(async ([propsRes, loansRes]) => {
        const props = propsRes?.data?.properties || propsRes?.properties || [];
        const prop = props.find((p: any) => p.id === id) || null;
        if (prop) {
          setPropertyTitle(prop.propertyTitle || "");
          setPropertyType(prop.propertyType || "Residential");
          setOwnershipType(prop.ownershipType || "Solo");
          setMarketValue(prop.marketValue ? String(prop.marketValue) : "");
          setPurchasePrice(
            prop.purchasePrice ? String(prop.purchasePrice) : "",
          );
          setPurchaseDate(
            prop.purchaseDate ?
              new Date(prop.purchaseDate).toISOString().slice(0, 10)
            : "",
          );
          setLoanId(prop.loanId || null);
          setVaultFileIds(prop.vaultFileIds || {});
        }
        setLoans(
          (loansRes?.data && (loansRes.data.loans || loansRes.data)) ||
            loansRes.loans ||
            [],
        );
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [id]);

  const onUploaded = (key: string, fileId: string) => {
    setVaultFileIds((s: any) => ({ ...(s || {}), [key]: fileId }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      const payload = {
        propertyTitle,
        propertyType,
        ownershipType,
        marketValue: marketValue !== "" ? Number(marketValue) : undefined,
        purchasePrice: purchasePrice !== "" ? Number(purchasePrice) : undefined,
        purchaseDate: purchaseDate || null,
        loanId: loanId || null,
        vaultFileIds,
      };

      const res = await fetch(`/api/bhoomi/properties/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed");
      router.push("/bhoomi");
    } catch (err) {
      console.error(err);
      NotificationStore.push({
        type: "warning",
        title: "Unable to save",
        message: err instanceof Error ? err.message : "Unable to save property",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center text-white/60">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          <p>Loading property details...</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-4xl bg-slate-900/95 border border-white/10 shadow-2xl rounded-3xl backdrop-blur-xl overflow-hidden">
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
            <h2 className="text-3xl font-semibold text-white">Edit property</h2>
            <p className="mt-3 text-sm text-slate-400">
              Update property details, attach documents, and link loans.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-8 grid gap-6">
          <div className="grid gap-6">
            <label className="block">
              <span className="text-sm text-slate-400 mb-2 block">
                Property title
              </span>
              <input
                value={propertyTitle}
                onChange={(e) => setPropertyTitle(e.target.value)}
                className="w-full rounded-3xl p-4 bg-slate-950 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none"
                placeholder="Enter property name"
              />
            </label>

            <div className="grid gap-4 xl:grid-cols-2">
              <label className="block">
                <span className="text-sm text-slate-400 mb-2 block">Type</span>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value as any)}
                  className="w-full rounded-3xl p-4 bg-slate-950 border border-white/10 text-white focus:outline-none"
                >
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm text-slate-400 mb-2 block">
                  Ownership
                </span>
                <select
                  value={ownershipType}
                  onChange={(e) => setOwnershipType(e.target.value as any)}
                  className="w-full rounded-3xl p-4 bg-slate-950 border border-white/10 text-white focus:outline-none"
                >
                  {OWNERSHIP_TYPES.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <label className="block">
                <span className="text-sm text-slate-400 mb-2 block">
                  Market value
                </span>
                <input
                  value={marketValue}
                  onChange={(e) => setMarketValue(e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-3xl p-4 bg-slate-950 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none"
                  placeholder="₹0"
                />
              </label>

              <label className="block">
                <span className="text-sm text-slate-400 mb-2 block">
                  Purchase price
                </span>
                <input
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-3xl p-4 bg-slate-950 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none"
                  placeholder="₹0"
                />
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
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full rounded-3xl p-4 bg-slate-950 border border-white/10 text-white focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="text-sm text-slate-400 mb-2 block">
                  Link loan (optional)
                </span>
                <select
                  value={loanId ?? ""}
                  onChange={(e) => setLoanId(e.target.value || null)}
                  className="w-full rounded-3xl p-4 bg-slate-950 border border-white/10 text-white focus:outline-none"
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
              Update the property and save changes.
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-full bg-amber-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-300 disabled:opacity-60"
              >
                {saving ?
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                : "Save changes"}
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
