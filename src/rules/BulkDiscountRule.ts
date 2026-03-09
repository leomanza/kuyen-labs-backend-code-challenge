import { DiscountRule } from "./DiscountRule";

/**
 * Bulk purchase discount — when a customer buys `threshold` or more units
 * of an eligible product, every unit of that product is charged at a
 * reduced rate.
 *
 * Spec defaults: threshold = 3, discountRate = 0.20 (20% off).
 * Example: 4 PUNK at 60 ETH → 4 × 48 ETH = 192 ETH.
 *
 * Constructor parameters are configurable so that the same class can
 * serve different promotion tiers without modification (Open/Closed).
 */
export class BulkDiscountRule implements DiscountRule {
  private readonly eligible: ReadonlySet<string>;
  private readonly threshold: number;
  private readonly discountRate: number;

  constructor(
    eligibleProducts: string[],
    threshold: number = 3,
    discountRate: number = 0.2
  ) {
    this.eligible = new Set(eligibleProducts);
    this.threshold = threshold;
    this.discountRate = discountRate;
  }

  apply(items: Map<string, number>, prices: Map<string, number>): number {
    let total = 0;

    for (const [code, qty] of items) {
      const unitPrice = prices.get(code);
      if (unitPrice === undefined) {
        throw new Error(`Missing price for product "${code}"`);
      }

      if (this.eligible.has(code) && qty >= this.threshold) {
        // Discount applies to ALL units once the threshold is met
        total += qty * unitPrice * (1 - this.discountRate);
      } else {
        total += qty * unitPrice;
      }
    }

    return total;
  }
}
