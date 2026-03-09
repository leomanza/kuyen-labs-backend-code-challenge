import { PriceSource } from "./pricing/PriceSource";
import { DiscountRule } from "./rules/DiscountRule";

/**
 * Core checkout class — accumulates scanned items and calculates the total
 * by evaluating all discount rules against live-fetched prices.
 *
 * Design:
 * - Dependency injection: rules and price source are provided at construction.
 *   `Checkout` never instantiates them internally (Open/Closed).
 * - Best-deal strategy (DECISIONS.md #2): each product is evaluated
 *   independently through all rules, and the rule producing the lowest
 *   subtotal for that product wins. This allows different rules to apply
 *   to different products in the same cart (e.g. buy2get1free on APE,
 *   bulk on PUNK). Discounts never stack on the same product.
 * - Fresh prices (DECISIONS.md #3): `total()` fetches prices on every call.
 *   No caching in this class — if caching is needed, it belongs in the
 *   `PriceSource` implementation.
 * - Cart is a `Map<string, number>` — scan order is irrelevant (DECISIONS.md #6).
 */
export class Checkout {
  private readonly rules: readonly DiscountRule[];
  private readonly priceSource: PriceSource;
  private readonly cart: Map<string, number> = new Map();

  constructor(rules: DiscountRule[], priceSource: PriceSource) {
    this.rules = rules;
    this.priceSource = priceSource;
  }

  /** Adds one unit of the given product to the cart. */
  scan(productCode: string): void {
    const current = this.cart.get(productCode) ?? 0;
    this.cart.set(productCode, current + 1);
  }

  /**
   * Removes one unit of the given product from the cart.
   *
   * No-op if the product is absent or quantity is already zero
   * (DECISIONS.md #5). This avoids forcing callers to pre-check cart state.
   */
  remove(productCode: string): void {
    const current = this.cart.get(productCode);
    if (current === undefined || current <= 0) {
      return;
    }
    if (current === 1) {
      this.cart.delete(productCode);
    } else {
      this.cart.set(productCode, current - 1);
    }
  }

  /** Returns a snapshot of the current cart (product code → quantity). */
  getCart(): Map<string, number> {
    return new Map(this.cart);
  }

  /**
   * Calculates the total price for the current cart.
   *
   * Fetches prices fresh from the price source on every call (no caching).
   *
   * Strategy: for each product in the cart, evaluate every rule on a
   * single-product sub-cart and pick the lowest subtotal (best deal for
   * the customer). This allows different rules to apply to different
   * products simultaneously — e.g. buy2get1free on APE while bulk
   * discount applies to PUNK in the same cart.
   *
   * When a product is eligible for multiple rules (AZUKI), the rule
   * producing the lowest subtotal wins (DECISIONS.md #2). Discounts are
   * never stacked on the same product.
   */
  async total(): Promise<number> {
    if (this.cart.size === 0) {
      return 0;
    }

    // Fetch current prices for all products in the cart
    const prices = new Map<string, number>();
    for (const code of this.cart.keys()) {
      prices.set(code, await this.priceSource.getPrice(code));
    }

    // Early return: no rules configured → undiscounted sum, skip rule evaluation
    if (this.rules.length === 0) {
      let sum = 0;
      for (const [code, qty] of this.cart) {
        sum += qty * (prices.get(code) as number);
      }
      return sum;
    }

    // For each product, evaluate all rules on a single-product sub-cart
    // and pick the minimum subtotal. This ensures each product gets the
    // best available discount without stacking (DECISIONS.md #2).
    let total = 0;
    for (const [code, qty] of this.cart) {
      const singleProductCart = new Map([[code, qty]]);
      const singleProductPrices = new Map([[code, prices.get(code) as number]]);

      const baseline = qty * (prices.get(code) as number);
      const ruleResults = this.rules.map((rule) =>
        rule.apply(singleProductCart, singleProductPrices)
      );

      total += Math.min(baseline, ...ruleResults);
    }

    return total;
  }
}
