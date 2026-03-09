# DECISIONS.md

Documents every ambiguous requirement found in the challenge spec, the options considered, and the decision taken. Each entry is meant to be a starting point for a conversation with the product team — not a final answer.

---

## 1. "APE, PUNK, APE" — 210 ETH or 135 ETH?

**The spec says:** `Total: 210 ETH (Or is it 135?)`

**The ambiguity:** The buy-2-get-1-free rule is described as "for every 2 items purchased, get 1 free." This can be read two ways:

| Interpretation | Logic | Result |
|---|---|---|
| A — Pay 2, get the 3rd free | Discount triggers at qty=3. With 2 APE, no discount. | **210 ETH** |
| B — Buy any 2, one is free | Discount triggers at qty=2. With 2 APE, pay for 1. | 135 ETH |

**Decision: 210 ETH (Interpretation A)**

Reasoning: "Buy 2, get 1 **free**" is standard retail language meaning the minimum qualifying purchase is 3 units — you buy 2 and receive a 3rd at no charge. Interpretation B would mean buying 2 items results in paying for 1, which is effectively a 50% flat discount — a materially different promotion that would need explicit naming. The worked example in the spec confirms this: "3 APE items = 2 × 75 ETH = 150 ETH."

**If the business intent is Interpretation B**, the `BuyTwoGetOneFreeRule` constructor accepts any eligible product list and the threshold logic is isolated — it can be changed in one place without touching `Checkout` or other rules.

---

## 2. AZUKI is eligible for both rules — which one applies?

**The spec says:** "AZUKI is eligible for both promotions."

**The ambiguity:** The spec does not say whether to apply both simultaneously, apply only one, or let the customer benefit from whichever is better.

**Options considered:**

| Option | 3 AZUKI result | Notes |
|---|---|---|
| Apply both | 2 × 30 × 0.80 = 48 ETH | Stacking discounts — generous but likely unintended |
| Apply buy2get1free only | 60 ETH | Ignores the bulk rule entirely |
| Apply bulk only | 72 ETH | Ignores the better deal |
| Apply best for customer | 60 ETH | Customer-friendly, defensible business logic |

**Decision: apply the rule that produces the lowest total (best for customer)**

Reasoning: stacking both discounts simultaneously (paying 20% less on already-free items) produces an unrealistically low price and is almost certainly not the intent. Picking the best single rule per evaluation is the most customer-friendly interpretation that doesn't require inventing business logic not present in the spec.

This is implemented as: evaluate all rules independently against the full cart, return `Math.min(...results)`.

**Open question for product:** should AZUKI ever stack discounts, or should it always use the better of the two? If stacking is intended, the `Checkout` strategy can be changed from "best rule" to "sequential application" without modifying any rule class.

---

## 3. Prices are fetched per `total()` call — not cached

**The spec says:** "Prices are obtained from an external source (like OpenSea) and can fluctuate."

**Decision:** `total()` fetches current prices on every invocation. No in-memory cache inside `Checkout`.

Reasoning: the spec explicitly flags that prices fluctuate. Caching would mean a cart opened at 75 ETH/APE might checkout at a stale price if the market moved. The cost of an extra HTTP call is acceptable compared to the risk of a pricing error.

**Trade-off:** if the price source is slow or rate-limited, calling `total()` repeatedly in a tight loop could be a problem. If that becomes an issue, caching should live in the `PriceSource` implementation (e.g. a TTL cache wrapping the real client) — not in `Checkout`. This keeps the separation of concerns clean.

---

## 4. Rule evaluation is per-cart, not per-product-group

**The ambiguity:** the spec defines rules per product code. It is not explicit about whether a rule that covers multiple products (e.g. a hypothetical "buy APE + PUNK together, get 10% off") would be possible in the future.

**Decision:** `DiscountRule.apply()` receives the full cart (all items and prices) and returns a complete total. Rules have full visibility over the cart.

Reasoning: a rule that only sees one product at a time cannot implement cross-product promotions. Passing the full cart costs nothing and keeps the interface future-proof. Current rules simply ignore products they don't cover.

---

## 5. `remove()` on a product not in the cart

**The spec shows** `co.remove("APE")` but does not specify behavior when removing something that isn't there.

**Decision:** `remove()` is a no-op when the product is absent or quantity is already zero. No error is thrown.

Reasoning: in a UI-driven checkout, the client may call `remove()` defensively without checking cart state first. Throwing would push error-handling onto every caller. Silent no-op is the safer default. If strict cart validation is needed (e.g. to detect bugs), it should be opt-in via a flag or a separate validation layer.

---

## 6. Scan order must not affect total

**The spec says:** "allow items to be scanned in any order."

**Decision:** `Checkout` accumulates quantities in a `Map<string, number>`. Rules operate on quantities, not on the sequence of scans. Order is irrelevant by construction.

This is verified explicitly in the test suite.

---

## 7. Rule evaluation is per-product, not per-cart

**The problem:** evaluating each rule against the *full cart* and picking `Math.min(...fullCartTotals)` forces a single rule to win for the entire cart. In scenario 4 (3 APE, 3 PUNK, 1 MEEBIT), buy2get1free returns 334 and bulk returns 373 — but the correct answer is 298, which requires buy2get1free on APE (150) *and* bulk on PUNK (144) simultaneously.

**Decision:** `Checkout.total()` evaluates each product independently through all rules using a single-product sub-cart, then picks the minimum subtotal per product and sums.

```
for each product in cart:
  baseline = qty × unitPrice
  ruleResults = rules.map(rule => rule.apply({product: qty}, {product: price}))
  productTotal = Math.min(baseline, ...ruleResults)
total = sum of all productTotals
```

**Why this works:**
- Different rules apply to different products in the same cart (APE gets buy2get1free, PUNK gets bulk)
- When a product is eligible for multiple rules (AZUKI), the best single rule wins — no stacking
- The `DiscountRule` interface is unchanged — rules still receive a cart and prices, return a total

**Trade-off:** cross-product rules (e.g. "buy APE + PUNK together, get 10% off") would not work with per-product evaluation. If such rules are needed in the future, the evaluation strategy in `Checkout.total()` would need to change — but no rule classes would need modification.

---

## 8. This is a library, not an application

**The spec says:** "implement a checkout process that fulfills the requirements."

**Decision:** the deliverable is a library with a programmatic API — not a REST server, CLI app, or frontend.

```typescript
const co = new Checkout(rules, priceSource);
co.scan("APE");
const total = await co.total();
```

**Reasoning:** the challenge asks for a *checkout process*, not an application. A library is the right primitive:

- **A frontend or API layer** would import this library and call `new Checkout(rules, priceSource)`. The library doesn't assume *how* it will be consumed — it could be a REST endpoint, a GraphQL resolver, a serverless function, or a React hook. Adding a transport layer here would be coupling the solution to deployment assumptions not present in the spec.

- **Discount rules are code, not data.** The current rules (`BuyTwoGetOneFreeRule`, `BulkDiscountRule`) are injected at construction time via the `DiscountRule[]` array. If the business later needs rules stored in a database, the consuming application would hydrate `DiscountRule` instances from DB rows and pass them to `Checkout` — the library doesn't need to change. The interface already supports this.

- **The price source is swappable by design.** `PriceSource` is an interface with a single method: `getPrice(code): Promise<number>`. Connecting to OpenSea (or any external API) means implementing this interface — one class, no changes to `Checkout` or any rule. The `async` signature already accounts for network latency. Schema mismatches between an external API and the internal model are handled inside the concrete `PriceSource` implementation, keeping the mapping isolated.

**What this means for growth:**

| Need | Where it lives | Changes to Checkout? |
|---|---|---|
| New discount rule | New class implementing `DiscountRule` | None |
| Real price feed (OpenSea) | New class implementing `PriceSource` | None |
| Rules from a database | Application layer hydrates `DiscountRule[]` | None |
| REST/GraphQL API | Application layer wraps the library | None |
| Price caching (TTL) | Inside the `PriceSource` implementation | None |