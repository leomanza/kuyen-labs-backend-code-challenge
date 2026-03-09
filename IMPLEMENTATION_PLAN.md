# Implementation Plan

## Core abstractions

Two interfaces drive the entire design. Everything else depends on them.

### `PriceSource`

```ts
interface PriceSource {
  getPrice(productCode: string): Promise<number>;
}
```

Abstracts the external price feed. Swap `MockPriceSource` for a real HTTP client without touching any other module.

### `DiscountRule`

```ts
interface DiscountRule {
  apply(items: Map<string, number>, prices: Map<string, number>): number;
}
```

Each rule receives the full cart and resolved prices, and returns a complete total. Rules are stateless. Adding a new promotion means adding a new file — nothing else changes (Open/Closed Principle).

---

## Classes

### `MockPriceSource`
- Implements `PriceSource`
- Prices stored in a `Map`, initialized from the spec defaults
- Accepts an `overrides` object in the constructor to simulate price fluctuations in tests

### `BuyTwoGetOneFreeRule`
- Constructor accepts `eligibleProducts: string[]`
- For each eligible product: `chargeableQty = qty - Math.floor(qty / 3)`
- Non-eligible products charged at full price

### `BulkDiscountRule`
- Constructor accepts `eligibleProducts`, `threshold` (default 3), `discountRate` (default 0.20)
- If `qty >= threshold`: apply discount to all units, otherwise full price

### `Checkout`
- Constructor: `(rules: DiscountRule[], priceSource: PriceSource)`
- `scan(code)` — increments quantity in cart map
- `remove(code)` — decrements quantity, deletes key at zero, no-op if absent
- `getCart()` — returns snapshot of current cart state
- `total()` — fetches current prices, evaluates all rules, returns `Math.min(...results)`

For the rule evaluation strategy and all other design decisions, see [`DECISIONS.md`](./DECISIONS.md).

---

## Extension points

**New discount rule** — implement `DiscountRule`, pass it to `Checkout`. No existing code changes.

**Real price source** — implement `PriceSource` with an HTTP client. Inject instead of `MockPriceSource`.

**Rule stacking** — change `Checkout.total()` from `Math.min(...results)` to sequential application. All rule classes remain unchanged.

**Per-product rule priority** — add a `priority` field to `DiscountRule` and sort before evaluation. No structural changes needed.