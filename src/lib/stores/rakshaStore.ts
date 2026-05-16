import { create } from 'zustand';
import { InsurancePolicyResponse } from '@/lib/types/api.types';

interface RakshaState {
  policies: InsurancePolicyResponse[];
  stats: {
    totalPolicies: number;
    totalSumAssured: number;
    totalAnnualPremium: number;
    byType: Record<string, number>;
    healthStatus: 'critical' | 'warning' | 'secure';
  } | null;
  loading: boolean;
  error: string | null;

  fetchPolicies: () => Promise<void>;
  addPolicy: (policy: InsurancePolicyResponse) => void;
  updatePolicy: (policy: InsurancePolicyResponse) => void;
  deletePolicy: (id: string) => void;
}

export const useRakshaStore = create<RakshaState>((set, get) => ({
  policies: [],
  stats: null,
  loading: false,
  error: null,

  fetchPolicies: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch('/api/insurance');
      const result = await response.json();

      if (result.data) {
        set({ 
          policies: result.data.policies, 
          stats: result.data.stats,
          loading: false 
        });
      } else {
        set({ error: result.message || 'Failed to fetch policies', loading: false });
      }
    } catch (error) {
      set({ error: 'An unexpected error occurred', loading: false });
    }
  },

  addPolicy: (policy) => {
    set((state) => ({
      policies: [...state.policies, policy],
    }));
    // Re-fetch to update stats
    get().fetchPolicies();
  },

  updatePolicy: (policy) => {
    set((state) => ({
      policies: state.policies.map((p) => (p.id === policy.id ? policy : p)),
    }));
    // Re-fetch to update stats
    get().fetchPolicies();
  },

  deletePolicy: (id) => {
    set((state) => ({
      policies: state.policies.filter((p) => p.id !== id),
    }));
    // Re-fetch to update stats
    get().fetchPolicies();
  },
}));
