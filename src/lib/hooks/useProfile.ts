import useSWR from 'swr';
import { fetcher } from '@/lib/utils/fetcher';
import { useMemo } from 'react';

export function useProfile() {
  const { data, error, isLoading, mutate } = useSWR('/api/profile', fetcher, {
    revalidateOnFocus: true, 
    revalidateIfStale: true,
    dedupingInterval: 5000, // Reduced to 5 seconds to be more responsive but still dedup
  });

  const profileData = useMemo(() => data?.data || null, [data]);

  return {
    profile: profileData,
    error,
    isLoading,
    mutate,
  };
}
