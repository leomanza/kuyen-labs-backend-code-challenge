import { PriceSource } from "./PriceSource";

/**
 * In-memory price source seeded with the catalogue defaults from the spec.
 *
 * Accepts an optional `overrides` map so tests can simulate price fluctuations
 * without subclassing or modifying the default catalogue.
 */
export class MockPriceSource implements PriceSource {
  /** Default catalogue from the challenge spec. */
  private static readonly DEFAULTS: ReadonlyMap<string, number> = new Map([
    ["APE", 75],
    ["PUNK", 60],
    ["AZUKI", 30],
    ["MEEBIT", 4],
  ]);

  private readonly prices: Map<string, number>;

  constructor(overrides?: Record<string, number>) {
    this.prices = new Map(MockPriceSource.DEFAULTS);
    if (overrides) {
      for (const [code, price] of Object.entries(overrides)) {
        this.prices.set(code, price);
      }
    }
  }

  async getPrice(productCode: string): Promise<number> {
    const price = this.prices.get(productCode);
    if (price === undefined) {
      throw new Error(`Unknown product code: "${productCode}"`);
    }
    return price;
  }
}
