# Module 25 – Orders & Inventory Migration Blueprint

## Overview
Orders and Inventory represent the most critical and highest-risk subsystem in the application. Migrating from Mongoose (which tracks global product stock) to Prisma (which tracks accurate variant-level stock) requires a complete rewrite of the inventory deduction engine. This blueprint outlines the architectural changes, transaction boundaries, and execution roadmap necessary to transition cleanly without corrupting stock levels.

## 1. Order Architecture Analysis (Current Mongoose State)
- **Order Creation:** Verifies stock availability using `validateStockLevels`. If `status` is not `draft`, it invokes `deductStock` via Mongoose `$inc`.
- **Order Editing:** Extensively complex. Identifies if the order transitioned between active/inactive states. If staying active but items changed, it performs an application-level rollback: `restoreStock(oldItems)` -> `deductStock(newItems)`. If the new deduction fails, it re-deducts the old items.
- **Order Deletion:** Blocked if `shipped` or `completed`. Restores stock before deletion if `active`.
- **Draft Flow:** Bypasses inventory deduction. Reserved for quotations or incomplete transactions.
- **Order Completion:** Static status updates; inventory was already deducted during active creation.

## 2. Inventory Architecture Analysis
- **Stock Deduction:** Aggregates required quantities into a `stockMap`. Loops through map running `Product.findOneAndUpdate({ _id: id, quantity: { $gte: req } }, { $inc: { quantity: -req } })`. If any update fails, loops backward to `$inc` positive values (manual rollback).
- **Bundles:** `getAggregatedStockMap` dynamically queries each parent product, loops its embedded `bundles` array, and adds `bundle.quantity * item.quantity` to the stock map.
- **Hinges/Jambs:** Line items dynamically track `hingeProduct` and `jambProduct` references. Their quantities are natively added to the `stockMap`.

## 3. ProductVariant Impact Analysis
Transitioning to `ProductVariant` fundamentally shifts the inventory target.
- **OLD:** `Product.quantity` (Global scalar).
- **NEW:** `ProductVariant.quantity` (Specific relational row).
- **Impact on Validation:** Frontend/Backend validation can no longer query the base `Product` for available stock. It must strictly query `ProductVariant.quantity`.
- **Impact on Quotations/UI:** The legacy payload `{ product: "1", size: "3.0x8.0" }` must be mapped to a precise `variantId` before any transaction begins, utilizing the ProductVariant Adapter built in Module 24.

## 4. Transaction Strategy
The Mongoose manual rollback loop is dangerously prone to failure (e.g., if the Node server crashes mid-rollback). Prisma provides atomic transactions.
- All inventory mutations MUST occur within `prisma.$transaction`.
- **Order Creation (Active):**
  1. Resolve `variantId`s.
  2. Start `$transaction`.
  3. `updateMany` or loop `tx.productVariant.update` checking `{ quantity: { gte: requested } }`.
  4. If any `update` fails, the entire transaction instantly aborts and rolls back.
  5. `tx.order.create()`.
- **Order Editing:**
  1. Start `$transaction`.
  2. Restore old variants: `tx.productVariant.update({ increment })`.
  3. Deduct new variants: `tx.productVariant.update({ decrement, where: { quantity: { gte: req } } })`.
  4. `tx.order.update()`.
  5. If step 3 fails, the rollback automatically undoes step 2.

## 5. Bundle Deduction Strategy
- **Variant Resolution for Bundles:** When a Door is ordered, it has a specific size (Variant A). If the Door bundles a generic Hinge, the Hinge has no size (Variant B).
- **Workflow:**
  1. Map line item to its parent variant.
  2. Query `prisma.productBundle` for the parent product.
  3. For each child product, resolve its default sizeless `variantId`.
  4. Aggregate child variant quantities (`itemQty * bundleQty`) into the global transaction map.

## 6. Quotation Conversion Strategy
- **Current Bridge:** Converts Prisma Quotation to MongoDB Order by stripping `productId`s to bypass Mongoose `CastError`.
- **New Strategy:** Pure Prisma-to-Prisma conversion.
  1. Fetch `prisma.quotation` with deeply included `items`.
  2. Map items directly to `prisma.orderItem`. The `variantId`, `productId`, `hingeProductId`, and `jambProductId` migrate flawlessly.
  3. Process inventory deduction logic (since it moves from `DRAFT` quotation to `IN_PROCESSED` order).
  4. Update Quotation status to `CONVERTED`.

## 7. Order Editing Strategy
Editing orders carries the highest risk of ghost stock.
- **Rules:**
  1. Calculate `oldStockMap` (Variants + Bundles + Accessories).
  2. Calculate `newStockMap`.
  3. Calculate the delta (`diffMap`).
  4. Apply `diffMap` directly inside the transaction. If `variant.quantity + diff < 0`, abort transaction.
  5. This completely avoids the dangerous "restore all, deduct all" mechanism and mathematically ensures accuracy.

## 8. Risk Analysis
- **Highest Risk Method:** `updateOrder`. Calculating deltas across dynamically resolved variants and bundles introduces high mathematical risk.
- **Inventory Corruption Risk:** Node.js floating point or string/integer coercion errors during delta mapping.
- **Negative Stock Risk:** High. Handled by strictly injecting `where: { quantity: { gte: requestedQuantity } }` into Prisma update queries.
- **Concurrency Risk:** Low/Medium. Prisma transactions ensure atomicity, preventing race conditions where two simultaneous orders deduct the final unit of stock.

## 9. Recommended Implementation Plan
To prevent inventory collapse, the execution must strictly follow:
1. **Phase 1: Prisma Controller Scaffold:** Create `orderController.js` and replicate standard CRUD routes for `Order` and `OrderItem` without hooking up inventory logic.
2. **Phase 2: ProductVariant Resolver & Stock Mapper:** Build the complex utility functions that map a raw frontend payload into an exact map of required `variantId` quantities (including bundles and accessories).
3. **Phase 3: The Transaction Engine:** Build `deductStockTransaction` and `restoreStockTransaction` using Prisma `$transaction`.
4. **Phase 4: Quotation Conversion Engine:** Replace the legacy Module 24 bridge with native Prisma relation copying.
5. **Phase 5: Frontend Verification:** Verify Create, Read, Update, Delete, and Print actions via React.

## 10. Migration Readiness Score
**90% Ready.**
The Mongoose rollback weaknesses have been thoroughly exposed, and the Prisma transaction boundaries provide a bulletproof mathematical solution. The only friction point remains writing the strict Variant Resolver logic for nested bundles. We are ready to proceed with Phase 1.
