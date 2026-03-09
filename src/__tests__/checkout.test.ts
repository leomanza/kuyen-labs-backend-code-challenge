import { Checkout } from "../Checkout";
import { MockPriceSource } from "../pricing/MockPriceSource";
import { PriceSource } from "../pricing/PriceSource";
import { BuyTwoGetOneFreeRule } from "../rules/BuyTwoGetOneFreeRule";
import { BulkDiscountRule } from "../rules/BulkDiscountRule";
import { DiscountRule } from "../rules/DiscountRule";

/** Standard rules from the challenge spec. */
function defaultRules(): DiscountRule[] {
  return [
    new BuyTwoGetOneFreeRule(["APE", "AZUKI"]),
    new BulkDiscountRule(["PUNK", "AZUKI"]),
  ];
}

/** Standard price source with spec defaults. */
function defaultPriceSource(): MockPriceSource {
  return new MockPriceSource();
}

// ---------------------------------------------------------------------------
// Challenge examples (from CHALLENGE.md)
// ---------------------------------------------------------------------------

describe("Challenge examples", () => {
  let co: Checkout;

  beforeEach(() => {
    co = new Checkout(defaultRules(), defaultPriceSource());
  });

  test("APE, PUNK, MEEBIT → 139 ETH", async () => {
    co.scan("APE");
    co.scan("PUNK");
    co.scan("MEEBIT");
    expect(await co.total()).toBe(139);
  });

  test("APE, PUNK, APE → 210 ETH (buy2get1free needs 3 units)", async () => {
    co.scan("APE");
    co.scan("PUNK");
    co.scan("APE");
    expect(await co.total()).toBe(210);
  });

  test("PUNK, PUNK, PUNK, APE, PUNK → 267 ETH", async () => {
    co.scan("PUNK");
    co.scan("PUNK");
    co.scan("PUNK");
    co.scan("APE");
    co.scan("PUNK");
    expect(await co.total()).toBe(267);
  });

  test("APE, PUNK, APE, APE, MEEBIT, PUNK, PUNK → 298 ETH", async () => {
    co.scan("APE");
    co.scan("PUNK");
    co.scan("APE");
    co.scan("APE");
    co.scan("MEEBIT");
    co.scan("PUNK");
    co.scan("PUNK");
    expect(await co.total()).toBe(298);
  });

  test("AZUKI, AZUKI, AZUKI → 60 ETH (best of buy2get1free vs bulk)", async () => {
    co.scan("AZUKI");
    co.scan("AZUKI");
    co.scan("AZUKI");
    // buy2get1free: pay for 2 → 60 ETH
    // bulk: 3 × 30 × 0.80 → 72 ETH
    // best deal: 60 ETH
    expect(await co.total()).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// Scan and remove
// ---------------------------------------------------------------------------

describe("scan and remove", () => {
  test("scan adds items to the cart", () => {
    const co = new Checkout([], defaultPriceSource());
    co.scan("APE");
    co.scan("APE");
    co.scan("PUNK");
    expect(co.getCart()).toEqual(new Map([["APE", 2], ["PUNK", 1]]));
  });

  test("remove decrements quantity", () => {
    const co = new Checkout([], defaultPriceSource());
    co.scan("APE");
    co.scan("APE");
    co.remove("APE");
    expect(co.getCart()).toEqual(new Map([["APE", 1]]));
  });

  test("remove deletes product at zero quantity", () => {
    const co = new Checkout([], defaultPriceSource());
    co.scan("APE");
    co.remove("APE");
    expect(co.getCart().size).toBe(0);
  });

  test("remove is a no-op for absent products (DECISIONS.md #5)", () => {
    const co = new Checkout([], defaultPriceSource());
    co.remove("APE"); // should not throw
    expect(co.getCart().size).toBe(0);
  });

  test("scan order does not affect total (DECISIONS.md #6)", async () => {
    const co1 = new Checkout(defaultRules(), defaultPriceSource());
    co1.scan("APE");
    co1.scan("PUNK");
    co1.scan("APE");
    co1.scan("APE");

    const co2 = new Checkout(defaultRules(), defaultPriceSource());
    co2.scan("APE");
    co2.scan("APE");
    co2.scan("APE");
    co2.scan("PUNK");

    expect(await co1.total()).toBe(await co2.total());
  });
});

// ---------------------------------------------------------------------------
// Empty cart
// ---------------------------------------------------------------------------

describe("empty cart", () => {
  test("total is 0 for empty cart", async () => {
    const co = new Checkout(defaultRules(), defaultPriceSource());
    expect(await co.total()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// No rules
// ---------------------------------------------------------------------------

describe("no discount rules", () => {
  test("total is undiscounted sum when no rules are configured", async () => {
    const co = new Checkout([], defaultPriceSource());
    co.scan("APE");
    co.scan("PUNK");
    expect(await co.total()).toBe(135);
  });
});

// ---------------------------------------------------------------------------
// BuyTwoGetOneFreeRule in isolation
// ---------------------------------------------------------------------------

describe("BuyTwoGetOneFreeRule", () => {
  const rule = new BuyTwoGetOneFreeRule(["APE"]);
  const prices = new Map([["APE", 75], ["PUNK", 60]]);

  test("no discount below 3 units", () => {
    expect(rule.apply(new Map([["APE", 2]]), prices)).toBe(150);
  });

  test("1 free item at 3 units", () => {
    expect(rule.apply(new Map([["APE", 3]]), prices)).toBe(150);
  });

  test("1 free item at 5 units", () => {
    // 5 - floor(5/3) = 5 - 1 = 4 chargeable
    expect(rule.apply(new Map([["APE", 5]]), prices)).toBe(300);
  });

  test("2 free items at 6 units", () => {
    expect(rule.apply(new Map([["APE", 6]]), prices)).toBe(300);
  });

  test("non-eligible products charged at full price", () => {
    expect(rule.apply(new Map([["PUNK", 3]]), prices)).toBe(180);
  });
});

// ---------------------------------------------------------------------------
// BulkDiscountRule in isolation
// ---------------------------------------------------------------------------

describe("BulkDiscountRule", () => {
  const rule = new BulkDiscountRule(["PUNK"], 3, 0.2);
  const prices = new Map([["APE", 75], ["PUNK", 60]]);

  test("no discount below threshold", () => {
    expect(rule.apply(new Map([["PUNK", 2]]), prices)).toBe(120);
  });

  test("20% discount at exactly threshold", () => {
    expect(rule.apply(new Map([["PUNK", 3]]), prices)).toBe(144);
  });

  test("20% discount above threshold", () => {
    expect(rule.apply(new Map([["PUNK", 4]]), prices)).toBe(192);
  });

  test("non-eligible products charged at full price", () => {
    expect(rule.apply(new Map([["APE", 4]]), prices)).toBe(300);
  });
});

// ---------------------------------------------------------------------------
// AZUKI dual-rule: best deal for customer (DECISIONS.md #2)
// ---------------------------------------------------------------------------

describe("AZUKI dual-rule — best deal for customer", () => {
  test("3 AZUKI: buy2get1free (60) beats bulk (72)", async () => {
    const co = new Checkout(defaultRules(), defaultPriceSource());
    co.scan("AZUKI");
    co.scan("AZUKI");
    co.scan("AZUKI");
    expect(await co.total()).toBe(60);
  });

  test("2 AZUKI: no discount applies → 60 ETH", async () => {
    const co = new Checkout(defaultRules(), defaultPriceSource());
    co.scan("AZUKI");
    co.scan("AZUKI");
    expect(await co.total()).toBe(60);
  });

  test("6 AZUKI: buy2get1free (120) beats bulk (144)", async () => {
    const co = new Checkout(defaultRules(), defaultPriceSource());
    for (let i = 0; i < 6; i++) co.scan("AZUKI");
    expect(await co.total()).toBe(120);
  });
});

// ---------------------------------------------------------------------------
// Price source: fresh fetch on every total() call (DECISIONS.md #3)
// ---------------------------------------------------------------------------

describe("prices fetched fresh on every total() call", () => {
  test("total reflects price changes between calls", async () => {
    // Custom price source that changes price after first call
    let apePrice = 75;
    const dynamicSource: PriceSource = {
      getPrice: async (code: string) => {
        if (code === "APE") return apePrice;
        throw new Error(`Unknown product: ${code}`);
      },
    };

    const co = new Checkout([], dynamicSource);
    co.scan("APE");

    expect(await co.total()).toBe(75);

    // Simulate price fluctuation
    apePrice = 100;
    expect(await co.total()).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// MockPriceSource
// ---------------------------------------------------------------------------

describe("MockPriceSource", () => {
  test("returns spec default prices", async () => {
    const src = defaultPriceSource();
    expect(await src.getPrice("APE")).toBe(75);
    expect(await src.getPrice("PUNK")).toBe(60);
    expect(await src.getPrice("AZUKI")).toBe(30);
    expect(await src.getPrice("MEEBIT")).toBe(4);
  });

  test("overrides replace defaults", async () => {
    const src = new MockPriceSource({ APE: 100 });
    expect(await src.getPrice("APE")).toBe(100);
    expect(await src.getPrice("PUNK")).toBe(60); // untouched
  });

  test("throws on unknown product code", async () => {
    const src = defaultPriceSource();
    await expect(src.getPrice("UNKNOWN")).rejects.toThrow('Unknown product code: "UNKNOWN"');
  });
});

// ---------------------------------------------------------------------------
// Extensibility: custom rule without modifying Checkout
// ---------------------------------------------------------------------------

describe("extensibility — custom rule", () => {
  test("new rule can be added without changing Checkout", async () => {
    /** Flat 10% off everything — hypothetical future promotion. */
    const flatDiscount: DiscountRule = {
      apply(items: Map<string, number>, prices: Map<string, number>): number {
        let total = 0;
        for (const [code, qty] of items) {
          total += qty * (prices.get(code) as number) * 0.9;
        }
        return total;
      },
    };

    const co = new Checkout([flatDiscount], defaultPriceSource());
    co.scan("APE"); // 75 × 0.9 = 67.5
    co.scan("PUNK"); // 60 × 0.9 = 54
    expect(await co.total()).toBeCloseTo(121.5);
  });
});
