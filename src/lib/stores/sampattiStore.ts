'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 🏺 Define the types of assets based on Artha Chakra categories
export type AssetCategory = 'Liquid' | 'Invested' | 'Fixed';

export interface Asset {
  id: string;
  name: string;
  amount: number;
  category: AssetCategory;
  lastUpdated: string;
}

interface SampattiState {
  assets: Asset[];
  addAsset: (asset: Omit<Asset, 'id' | 'lastUpdated'>) => void;
  removeAsset: (id: string) => void;
  getTotalAmount: () => number;
  getAssetsByCategory: (category: AssetCategory) => Asset[];
}

export const useSampattiStore = create<SampattiState>()(
  persist(
    (set, get) => ({
      assets: [],

      addAsset: (data) => {
        const newAsset: Asset = {
          ...data,
          id: Math.random().toString(36).substring(2, 9),
          lastUpdated: new Date().toISOString(),
        };
        set((state) => ({ assets: [...state.assets, newAsset] }));
      },

      removeAsset: (id) => {
        set((state) => ({
          assets: state.assets.filter((asset) => asset.id !== id),
        }));
      },

      getTotalAmount: () => {
        return get().assets.reduce((sum, asset) => sum + asset.amount, 0);
      },

      getAssetsByCategory: (category) => {
        return get().assets.filter((asset) => asset.category === category);
      },
    }),
    {
      name: 'sampatti-storage', // Saves data to local storage automatically
    }
  )
);