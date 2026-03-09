# NFT Marketplace Checkout

A checkout system for an NFT marketplace that calculates cart totals applying configurable discount rules against live-fetched prices.

Built as part of the [Fuul](https://fuul.xyz) backend code challenge.  
Challenge instructions can be found in the [official repo](https://github.com/kuyen-labs/code-challenges/blob/main/Backend.md).  
A local copy is included as [`CHALLENGE.md`](./CHALLENGE.md) for convenience.

## Setup

```bash
npm install
```

## Usage

```bash
npm run start     # run the example scenarios
npm test          # run the full test suite
npm run build     # compile to dist/
```

## How it works

```typescript
const priceSource = new MockPriceSource();
const rules = [
  new BuyTwoGetOneFreeRule(["APE", "AZUKI"]),
  new BulkDiscountRule(["PUNK", "AZUKI"]),
];

const co = new Checkout(rules, priceSource);

co.scan("APE");
co.scan("APE");
co.scan("PUNK");
co.remove("APE");

const total = await co.total(); // 135 ETH
```

## Project structure

```
src/
├── pricing/
│   ├── PriceSource.ts           # interface — abstracts external price feed
│   └── MockPriceSource.ts       # mock implementation for dev and tests
├── rules/
│   ├── DiscountRule.ts          # interface — all rules implement this
│   ├── BuyTwoGetOneFreeRule.ts
│   └── BulkDiscountRule.ts
├── Checkout.ts                  # core class
├── index.ts                     # runnable examples from the challenge
└── __tests__/
    └── checkout.test.ts
```

## Decisions

The challenge contains several intentionally ambiguous requirements. All of them are documented with reasoning in [`DECISIONS.md`](./DECISIONS.md) — that's the most interesting part of this solution.

## How I used Claude Code

I used [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (Anthropic's CLI agent) as a development partner for this project. Here's how the workflow went:

1. **I wrote the docs first.** `DECISIONS.md`, `IMPLEMENTATION_PLAN.md`, and `CLAUDE.md` were written by me before any code existed. Every ambiguous requirement was analyzed, options weighed, and a decision made — that thinking is mine.
2. **Claude Code implemented from the plan.** I gave it the docs as context and had it generate the TypeScript code, tests, and project config. It followed the architecture and decisions I laid out.
3. **I reviewed and iterated.** I caught issues in the output, questioned assumptions, and had Claude Code fix them. The final code reflects that back-and-forth.

The intent: show that I can think through a problem, make defensible decisions, and use AI tooling effectively — not as a shortcut, but as a multiplier.