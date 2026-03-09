# CLAUDE.md

This file provides context and instructions for working on this codebase.

## Project

NFT Marketplace Checkout System for Fuul. Calculates cart totals applying configurable discount rules against live-fetched prices.

## Stack

- **Language:** TypeScript (strict mode)
- **Runtime:** Node.js
- **Test runner:** Jest + ts-jest
- **No framework** — this is a library, not a server

## Architecture

```
src/
├── pricing/
│   ├── PriceSource.ts          # interface — abstracts external price feed
│   └── MockPriceSource.ts      # mock implementation for dev and tests
├── rules/
│   ├── DiscountRule.ts         # interface — all rules implement this
│   ├── BuyTwoGetOneFreeRule.ts
│   └── BulkDiscountRule.ts
├── Checkout.ts                 # core class — scan, remove, total
├── index.ts                    # runnable examples from the challenge
└── __tests__/
    └── checkout.test.ts
```

## Key design principles

- **Open/Closed:** add new rules by implementing `DiscountRule`. Do not modify `Checkout`.
- **Dependency injection:** `Checkout` receives rules and price source at construction — never instantiates them internally.
- **Best-deal strategy:** when multiple rules apply to the same product, pick the one that produces the lowest total for the customer. See `DECISIONS.md` for full reasoning.
- **Prices are async:** `total()` is async because prices are fetched from an external source on each call. Do not cache prices inside `Checkout`.

## Commands

```bash
npm test              # run full test suite
npm test -- --watch   # watch mode
npm run start         # run index.ts examples
npm run build         # compile to dist/
```

## When adding a new discount rule

1. Create `src/rules/YourRule.ts` implementing `DiscountRule`
2. Add unit tests in `__tests__/checkout.test.ts`
3. Update `IMPLEMENTATION_PLAN.md` if the rule affects architecture
4. Document any ambiguous behavior in `DECISIONS.md`

## When changing the price source

Implement `PriceSource` and inject it into `Checkout`. The mock lives in `MockPriceSource.ts` — do not delete it, it is used by all tests.

## Code style

- Strict TypeScript — no `any`, no non-null assertions without comment
- JSDoc on all public methods and classes — explain the *why*, not the *what*
- Inline comments on every non-obvious business logic decision
- No side effects in rule constructors