import { Checkout } from "./Checkout";
import { MockPriceSource } from "./pricing/MockPriceSource";
import { BuyTwoGetOneFreeRule } from "./rules/BuyTwoGetOneFreeRule";
import { BulkDiscountRule } from "./rules/BulkDiscountRule";

/**
 * Runs the five example scenarios from the challenge spec.
 * Prices come from MockPriceSource (spec defaults).
 */
async function main(): Promise<void> {
  const priceSource = new MockPriceSource();
  const rules = [
    new BuyTwoGetOneFreeRule(["APE", "AZUKI"]),
    new BulkDiscountRule(["PUNK", "AZUKI"]),
  ];

  // Helper: create a checkout, scan items, print total
  async function scenario(label: string, items: string[]): Promise<void> {
    const co = new Checkout(rules, priceSource);
    for (const item of items) {
      co.scan(item);
    }
    const total = await co.total();
    console.log(`Items: ${items.join(", ")}`);
    console.log(`Total: ${total} ETH\n`);
  }

  console.log("=== NFT Marketplace Checkout Examples ===\n");

  await scenario("Scenario 1", ["APE", "PUNK", "MEEBIT"]);
  // Expected: 139 ETH (no discounts apply)

  await scenario("Scenario 2", ["APE", "PUNK", "APE"]);
  // Expected: 210 ETH (only 2 APE — buy2get1free requires 3, see DECISIONS.md #1)

  await scenario("Scenario 3", ["PUNK", "PUNK", "PUNK", "APE", "PUNK"]);
  // Expected: 267 ETH (4 PUNK at bulk discount: 4×48=192, plus 1 APE: 75)

  await scenario("Scenario 4", ["APE", "PUNK", "APE", "APE", "MEEBIT", "PUNK", "PUNK"]);
  // Expected: 298 ETH (3 APE buy2get1free: 150, 3 PUNK bulk: 144, 1 MEEBIT: 4)

  await scenario("Scenario 5", ["AZUKI", "AZUKI", "AZUKI"]);
  // Expected: 60 ETH (best of: buy2get1free=60, bulk=72 → pick 60)
}

main().catch(console.error);
