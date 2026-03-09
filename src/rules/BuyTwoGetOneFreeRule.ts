import { DiscountRule } from "./DiscountRule";

/**
 * "Buy 2, get 1 free" — for every 3 units of an eligible product, the
 * customer pays for only 2.
 *
 * Interpretation choice (see DECISIONS.md #1): the discount requires a
 * minimum of 3 units. With only 2 units in the cart, no discount applies.
 * This matches standard retail semantics and the spec's worked example:
 * "3 APE items = 2 × 75 ETH = 150 ETH."
 *
 * Formula: chargeableQty = qty - Math.floor(qty / 3)
 *   - 1 → 1, 2 → 2, 3 → 2, 4 → 3, 5 → 4, 6 → 4
 */
export class BuyTwoGetOneFreeRule implements DiscountRule {
  private readonly eligible: ReadonlySet<string>;

  constructor(eligibleProducts: string[]) {
    this.eligible = new Set(eligibleProducts);
  }

  apply(items: Map<string, number>, prices: Map<string, number>): number {
    let total = 0;

    for (const [code, qty] of items) {
      const unitPrice = prices.get(code);
      if (unitPrice === undefined) {
        throw new Error(`Missing price for product "${code}"`);
      }

      if (this.eligible.has(code)) {
        // Every 3rd unit is free: pay for (qty - freeItems)
        const freeItems = Math.floor(qty / 3);
        total += (qty - freeItems) * unitPrice;
      } else {
        total += qty * unitPrice;
      }
    }

    return total;
  }
}
