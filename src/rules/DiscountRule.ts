/**
 * Contract for all discount rules in the checkout system.
 *
 * Design decision (see DECISIONS.md #4): `apply()` receives the full cart —
 * not just one product — so that future rules can implement cross-product
 * promotions (e.g. "buy APE + PUNK together, get 10% off").
 *
 * Each rule returns the *complete* cart total after applying its discount.
 * `Checkout` picks the lowest total across all rules (best-deal strategy,
 * see DECISIONS.md #2).
 */
export interface DiscountRule {
  /**
   * Calculates the total cart price after applying this rule's discount.
   *
   * @param items  - Map of product code → quantity in the cart.
   * @param prices - Map of product code → current unit price (in ETH).
   * @returns The total price for the entire cart under this rule.
   */
  apply(items: Map<string, number>, prices: Map<string, number>): number;
}
