export const servicePriceTypes = ["FIXED", "FROM"] as const;
export type ServicePriceType = (typeof servicePriceTypes)[number];
