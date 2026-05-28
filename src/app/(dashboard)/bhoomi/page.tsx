'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, Landmark, Plus, Home } from 'lucide-react';
import dynamic from 'next/dynamic';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { NotificationStore } from '@/lib/stores/notificationStore';
import { Vault } from '@/lib/vault';

const PageGuide = dynamic(() => import('@/components/ui/PageGuide').then(mod => mod.PageGuide), { ssr: false });
const VideoTutorialPlaceholder = dynamic(() => import('@/components/ui/VideoTutorialPlaceholder').then(mod => mod.VideoTutorialPlaceholder), { ssr: false });

type PropertyType = 'Residential' | 'Commercial' | 'Agricultural' | 'Land';
type OwnershipType = 'Solo' | 'Co-owned';

type BhoomiProperty = {
  id: string;
  propertyTitle: string;
  propertyType: PropertyType;
  ownershipType: OwnershipType;
  marketValue: number | null;
  loanLinked: boolean;
  vaultFileIds?: {
    saleDeed?: string;
    taxReceipt?: string;
  } | null;
  rentalIncomeAnnual?: number | null;
  carryingCostsAnnual?: number | null;
  createdAt?: string;
};

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
};

const getDocumentPreviewUrl = async (fileId: string): Promise<string | null> => {
  try {
    return await Vault.getPreviewUrl(fileId);
  } catch (error) {
    console.error('[Bhoomi] failed to resolve document preview URL', error);
    return null;
  }
};

const openDocument = async (fileId: string, label: string) => {
  if (!fileId) {
    NotificationStore.push({
      type: 'warning',
      title: 'Unable to open document',
      message: `${label} is not available for preview.`,
    });
    return;
  }

  const url = await getDocumentPreviewUrl(fileId);
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  NotificationStore.push({
    type: 'warning',
    title: 'Unable to open document',
    message: `${label} is not available for preview.`,
  });
};

const parseJsonResponse = async (response: Response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  throw new Error(`Unexpected response format (${response.status}): ${text.slice(0, 200)}`);
};

export default function BhoomiPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<BhoomiProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const loadProperties = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/bhoomi/properties', { cache: 'no-store' });
      const payload = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(payload?.error?.message || `Unable to load properties (${response.status})`);
      }

      setProperties(payload?.data?.properties || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load properties');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  const handleDeleteConfirmed = async (propertyId: string) => {
    setConfirmOpen(false);
    setPendingDeleteId(null);
    setDeleting((prev) => ({ ...prev, [propertyId]: true }));

    try {
      const response = await fetch(`/api/bhoomi/properties/${propertyId}`, { method: 'DELETE' });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error?.message || 'Unable to delete property');
      }

      setProperties((prev) => prev.filter((item) => item.id !== propertyId));
      NotificationStore.push({ type: 'action', title: 'Property removed', message: 'The property was removed successfully.', link: '/bhoomi' });
    } catch (err) {
      NotificationStore.push({ type: 'warning', title: 'Unable to remove', message: err instanceof Error ? err.message : 'Unable to delete property' });
    } finally {
      setDeleting((prev) => {
        const next = { ...prev };
        delete next[propertyId];
        return next;
      });
    }
  };

  const promptDelete = (propertyId: string) => {
    setPendingDeleteId(propertyId);
    setConfirmOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen p-6 pb-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a1628] to-slate-950 pointer-events-none" />

        <div className="relative z-10 flex flex-col">
      <div className="flex items-center gap-3 pt-8 mb-6">
          <button onClick={() => router.push('/rajya')} className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-white/60" />
          </button>

          <PageGuide
            title="Bhoomi (Real Estate)"
            description="Record and manage your properties, ownership and key documents. Attach sale deeds and tax receipts for secure record-keeping."
            actions={[{ emoji: '🏠', label: 'Properties' }, { emoji: '📄', label: 'Documents' }]}
          />
        </div>

            <div className="grid grid-cols-1 gap-3 flex-1 relative z-10">
              <section className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/40">Property registry</p>
                  <h2 className="text-sm font-medium text-[var(--color-rajya-text)] mt-1">Manage your properties</h2>
                </div>
                  <div className="flex items-center gap-2">
                      <button onClick={() => router.push('/bhoomi/add')} className="text-sm text-black font-semibold bg-amber-400 px-3 py-2 rounded-full shrink-0 uppercase tracking-wide hover:bg-amber-500 transition-colors inline-flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Add property
                      </button>
                    </div>
              </div>
            </div>

            <div className="space-y-4 pr-2">
              {loading ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-[var(--color-rajya-muted)]">
                  <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                  Loading properties...
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center text-sm text-red-200">
                  {error}
                </div>
              ) : properties.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-[var(--color-rajya-muted)]">
                  No properties added yet. Click 'Add property' to get started.
                </div>
              ) : (
                <div className="grid gap-4">
                  {properties.map((property, idx) => (
                    <div key={property.id} className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300 border border-blue-500/20">
                            <Home className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs text-[var(--color-rajya-muted)]">Property {idx + 1}</p>
                            <h3 className="mt-1 text-lg font-semibold text-[var(--color-rajya-text)]">{property.propertyTitle}</h3>
                            <div className="mt-3 flex flex-wrap gap-2 text-sm text-[var(--color-rajya-muted)]">
                              <span className="rounded-full bg-white/5 px-3 py-1">{property.propertyType}</span>
                              <span className="rounded-full bg-white/5 px-3 py-1">{property.ownershipType}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {property.loanLinked && (
                            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
                              Loan linked
                            </span>
                          )}
                          <button onClick={() => router.push(`/bhoomi/${property.id}/edit`)} className="rounded-full bg-amber-400 px-3 py-2 text-sm font-semibold text-black transition hover:bg-amber-500">
                            Edit
                          </button>
                          <button
                            onClick={() => promptDelete(property.id)}
                            disabled={deleting[property.id]}
                            className="rounded-full bg-white/6 px-3 py-2 text-sm font-semibold text-rose-400 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deleting[property.id] ? 'Removing...' : 'Remove'}
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-white/5 p-4">
                          <p className="text-xs uppercase tracking-wide text-white/40">Market value</p>
                          <p className="mt-2 text-sm font-semibold text-[var(--color-rajya-text)]">{formatCurrency(property.marketValue)}</p>
                        </div>
                        <div className="rounded-2xl bg-white/5 p-4">
                          <p className="text-xs uppercase tracking-wide text-white/40">Ownership</p>
                          <p className="mt-2 text-sm font-semibold text-[var(--color-rajya-text)]">{property.ownershipType}</p>

                          {/* ROI display below Ownership */}
                          {property.marketValue && property.marketValue > 0 ? (
                            (() => {
                              const rental = Number(property.rentalIncomeAnnual ?? 0);
                              const costs = Number(property.carryingCostsAnnual ?? 0);
                              const roi = ((rental - costs) / property.marketValue) * 100;
                              const formatted = `${roi >= 0 ? '' : ''}${roi.toFixed(2)}% per year`;
                              const colorClass = roi >= 0 ? 'text-emerald-300' : 'text-rose-400';
                              return (
                                <p className={`mt-2 text-sm font-medium ${colorClass}`}>ROI: {formatted}</p>
                              );
                            })()
                          ) : (
                            <p className="mt-2 text-sm text-[var(--color-rajya-muted)]">ROI: Enter market value</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-wide text-white/40">Documents</p>
                        <div className="mt-3 space-y-3 text-sm">
                          {property.vaultFileIds?.saleDeed ? (
                            <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 border border-white/10 px-3 py-3">
                              <p className="text-sm font-medium text-[var(--color-rajya-text)]">Sale Deed</p>
                              <button
                                type="button"
                                onClick={() => void openDocument(property.vaultFileIds?.saleDeed ?? '', 'Sale Deed')}
                                className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-amber-300 hover:bg-amber-400/10 transition-colors"
                              >
                                View
                                <ExternalLink className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="rounded-2xl bg-white/5 border border-dashed border-white/10 px-3 py-3 text-sm text-[var(--color-rajya-muted)]">
                              Sale Deed: Not uploaded
                            </div>
                          )}

                          {property.vaultFileIds?.taxReceipt ? (
                            <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 border border-white/10 px-3 py-3">
                              <p className="text-sm font-medium text-[var(--color-rajya-text)]">Tax Receipt</p>
                              <button
                                type="button"
                                onClick={() => void openDocument(property.vaultFileIds?.taxReceipt ?? '', 'Tax Receipt')}
                                className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-amber-300 hover:bg-amber-400/10 transition-colors"
                              >
                                View
                                <ExternalLink className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="rounded-2xl bg-white/5 border border-dashed border-white/10 px-3 py-3 text-sm text-[var(--color-rajya-muted)]">
                              Tax Receipt: Not uploaded
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="sticky top-6 bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20"><Landmark className="w-5 h-5" /></div>
                <div>
                <ConfirmModal
                  isOpen={confirmOpen}
                  title="Remove property"
                  message="Remove this property? This action cannot be undone."
                  onConfirm={() => pendingDeleteId && handleDeleteConfirmed(pendingDeleteId)}
                  onCancel={() => { setConfirmOpen(false); setPendingDeleteId(null); }}
                />
                  
                  <h4 className="text-sm font-semibold text-[var(--color-rajya-text)]">Bhoomi workflow</h4>
                </div>
              </div>

              <ul className="mt-3 text-sm text-[var(--color-rajya-muted)] space-y-2">
                <li>Keep a Sale Deed and Tax Receipt for each property.</li>
                <li>Record ownership type to help legal mapping.</li>
                <li>Use the secret field to store access codes securely.</li>
              </ul>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <p className="text-sm text-[var(--color-rajya-muted)]">Properties tracked</p>
              <p className="mt-2 text-xl font-semibold text-[var(--color-rajya-text)]">{properties.length}</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-xs uppercase text-white/40">Learn</p>
              <div className="mt-3">
                <VideoTutorialPlaceholder youtubeId="iWsQY6Ha4OE" label="Property record management" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
