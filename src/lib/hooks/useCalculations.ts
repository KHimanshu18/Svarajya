"use client";

import { useCallback, useMemo } from "react";
import {
  runAllCalculations,
  type FinancialSnapshot,
  type RajyaCalculations,
} from "@/lib/engines/calculationEngine";

/**
 * useCalculations — hook to compute all Rajya financial metrics
 */
export function useCalculations(
  snapshot: FinancialSnapshot,
): RajyaCalculations {
  const calculations = useMemo(() => runAllCalculations(snapshot), [snapshot]);
  return calculations;
}

/**
 * useStabilityIndex — simplified hook to get just the stability index
 */
export function useStabilityIndex(snapshot: FinancialSnapshot): number {
  return useMemo(() => runAllCalculations(snapshot).stabilityIndex, [snapshot]);
}

/**
 * useEmptySnapshot — default empty snapshot for initial state
 */
export function useEmptySnapshot(): FinancialSnapshot {
  return useCallback<() => FinancialSnapshot>(
    () => ({
      monthlyIncome: 0,
      annualIncome: 0,
      bankBalances: 0,
      investments: 0,
      propertyValue: 0,
      otherAssets: 0,
      totalLoans: 0,
      monthlyEMIs: 0,
      creditCardDebt: 0,
      lifeInsuranceCover: 0,
      healthInsuranceCover: 0,
      monthlyExpenses: 0,
      monthlySubscriptions: 0,
    }),
    [],
  )();
}
