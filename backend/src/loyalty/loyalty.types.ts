export const loyaltyEarningTypes = [
  "INHERIT",
  "NONE",
  "FIXED",
  "AMOUNT_MULTIPLIER",
  "BOTH",
] as const;

export type LoyaltyEarningType = (typeof loyaltyEarningTypes)[number];

export interface LoyaltyRuleSnapshot {
  type: Exclude<LoyaltyEarningType, "INHERIT">;
  fixedPoints: number | null;
  pointsPerCurrencyUnit: number | null;
}
