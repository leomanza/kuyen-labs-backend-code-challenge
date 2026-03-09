/**
 * Abstracts the external price feed for NFT products.
 *
 * Why an interface: the challenge requires mocking the price source, and the
 * spec explicitly states prices "can fluctuate." By depending on this
 * abstraction, `Checkout` is decoupled from any concrete price provider —
 * swap `MockPriceSource` for an OpenSea HTTP client without touching any
 * other module.
 */
export interface PriceSource {
  /** Fetches the current price (in ETH) for a single product code. */
  getPrice(productCode: string): Promise<number>;
}
