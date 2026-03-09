# Fuul Backend Code Challenge

## Overview

Fuul is helping one of their projects that runs an NFT marketplace. You need to implement a checkout system that calculates the total price for a cart of items, applying various discount rules.

## Product Catalog

The marketplace currently sells 4 NFT products with the following base prices:

| Product Code | Product Name | Base Price |
|--------------|--------------|------------|
| APE          | Bored Apes   | 75 ETH     |
| PUNK         | Crypto Punks | 60 ETH     |
| AZUKI        | Azuki        | 30 ETH     |
| MEEBIT       | Meebits      | 4 ETH      |

**Note:** Prices are obtained from an external source (like OpenSea) and can fluctuate.

## Discount Rules

The marketplace offers two types of discounts:

### 1. Buy 2, get 1 free Promotion
- **Products:** APE, AZUKI
- **Rule:** For every 2 items purchased, get 1 free
- **Example:** 3 APE items = 2 × 75 ETH = 150 ETH

### 2. Bulk Purchase Discount
- **Products:** PUNK, AZUKI
- **Rule:** Buy 3 or more items, price per unit reduces 20%
- **Example:** 4 PUNK items = 4 × 48 ETH = 192 ETH

**Note:** AZUKI is eligible for both promotions.

## Checkout Interface

The checkout process should allow items to be scanned in any order and return the total amount to be paid.

### Example Usage

```typescript
// Initialize checkout with pricing rules
const co = new Checkout(pricingRules);

// Scan items in any order
co.scan("APE");
co.scan("APE");
co.scan("PUNK");

// Modify cart
co.remove("APE");  // Remove one APE from cart

// Get total price
const price = co.total();
```

## The Program

Using typescript, implement a checkout process that fulfills the requirements.

```
Items: APE, PUNK, MEEBIT
Total: 139 ETH

Items: APE, PUNK, APE
Total: 210 ETH (Or is it 135?)

Items: PUNK, PUNK, PUNK, APE, PUNK
Total: 267 ETH

Items: APE, PUNK, APE, APE, MEEBIT, PUNK, PUNK
Total: 298 ETH

Items: AZUKI, AZUKI, AZUKI
Total: ??? ETH
```

## Requirements

The code should:

* Be written as production-ready code
* Be easy to grow and easy to add new functionality
* Have notes explaining the solution and any decisions made around ambiguous requirements
* Mock the external price source integration