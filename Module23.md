# Module 23 – Product Migration Analysis & Execution Plan

## Overview
Products are the most complex domain in the system. Transitioning from MongoDB’s document model to MySQL’s relational model demands extracting embedded data (Sizes, Bundles) into dedicated junction tables (`ProductVariant`, `ProductBundle`). This report outlines exactly how the migration should be structured to prevent cascading failures in Orders and Inventory.

## 1. Current System Analysis (MongoDB)
- **Data Storage:** Products are flat Mongoose documents. `price` and `quantity` are stored at the root level, meaning inventory is tracked *globally* per product, not per specific size.
- **Sizes:** Stored as an array of strings (e.g., `["3.0x8.0x1-3/4", "3.0x7.6x1-3/4"]`).
- **Bundles:** Stored as an array of embedded subdocuments containing a `product` (ObjectId) and `quantity`.
- **Hinges & Jambs:** Act as standard sizeless products, attached dynamically to line items in the `CreateOrder` flow.

## 2. Prisma ProductVariant Analysis (MySQL)
The newly approved `schema.prisma` normalizes this data:
- **Product:** Retains metadata (`name`, `sku`, `category_id`). Removes `price`, `quantity`, and `sizes`.
- **ProductVariant:** A 1-to-Many child table storing specific configurations. Every door size gets its own row with a discrete `price` and `quantity`. Sizeless products (Hinges, Jambs) receive exactly one variant where `size = null`.
- **ProductBundle:** A Many-to-Many junction table linking parent products to child products.

**Impacts:**
- *Creation/Editing:* Requires Prisma nested writes (`create: { variants: { create: [...] } }`).
- *Inventory:* Dramatically improves accuracy by deducting stock from specific sizes (`ProductVariant`), eliminating the global stock flaw.

## 3. Frontend Impact Analysis
A `grep` analysis of the React client reveals several tightly coupled dependencies on the legacy Mongo structure:
- **`Products.jsx`**: Expects `product.price` and `product.quantity` to render the catalog table.
- **`ProductModal.jsx`**: Expects `product.sizes` (Array of Strings) to render input pills. Expects `product.bundles` to map embedded objects.
- **`CreateOrder.jsx`**: Actively validates front-end stock by checking `item.quantity > product.quantity` before allowing submission.
- **`DocumentPrint.jsx`**: Loops over `item.product.bundles` directly to render invoices.

## 4. API Compatibility Strategy
There is a fundamental conflict between data accuracy and API compatibility:
- *Option A (Adapter Layer):* The backend maps Variants back into the legacy `sizes` array and sums the quantity. *Critique:* This destroys the whole point of Variant inventory tracking. If a user orders a size that is out of stock, the summed global quantity will falsely allow the order.
- *Option B (Direct Consumption):* Update the frontend to consume `ProductVariant` arrays directly. *Critique:* Requires rewriting `Products.jsx` and `ProductModal.jsx`.

**Recommendation:** A **Hybrid Approach**.
- **Products UI:** Update `Products.jsx` and `ProductModal.jsx` to natively read and write `variants` (Option B). This guarantees accurate catalog management.
- **Orders UI:** Implement an **Adapter Pattern** inside `orderController.js`. The `CreateOrder.jsx` frontend can continue sending `{ productId, size: "3.0x8.0" }`. The backend will intercept this, query the database for the matching `ProductVariant`, and link the `OrderItem` to the Variant ID. This prevents having to rewrite the incredibly complex Order/Quotation forms.

## 5. Size & Bundle Workflow Review
- **Doors:** Will be split into multiple variants upon creation. Inventory deductions will target the resolved Variant ID.
- **Hinges/Jambs:** Will have a single variant (`size: null`). The backend adapter must dynamically locate this fallback variant when processing accessory deductions.
- **Bundles:** The `getAggregatedStockMap` logic must be rewritten to recursively drill down into the `ProductBundle` junction table to map child-variant requirements.

## 6. Risk Analysis
- **Most Dangerous Controller:** `orderController.js`. Re-engineering the inventory deduction engine from Mongoose loops to Prisma `$transaction` blocks while simultaneously resolving sizes into `variant_id`s carries a high risk of inventory corruption.
- **Most Dangerous Component:** Data Migration Script. Converting global Mongoose quantities into specific Variant quantities requires arbitrary distribution (e.g., assigning all legacy stock to the first size, leaving the rest at 0).
- **Highest Probability Bug:** The `CreateOrder` frontend validation checking `item.quantity > product.quantity`. Since `product.quantity` will no longer exist at the root, the frontend validator will break unless patched to check `selectedVariant.quantity`.

## 7. Recommended Implementation Plan
To prevent breaking the application, the migration must strictly follow this sequence:
1. **Phase 1: Data Migration Script:** Write an isolated Node.js script to read Mongo `Products` and insert into Prisma `Products` + `ProductVariants` + `ProductBundles`.
2. **Phase 2: Product UI Updates (Frontend):** Patch `Products.jsx` and `ProductModal.jsx` to read and write the new Variant structure.
3. **Phase 3: Product Controller:** Rewrite `productController.js` to serve Prisma payloads, supporting the new frontend.
4. **Phase 4: Quotation Controller (Low Risk Adapter):** Rewrite `quotationController.js`, implementing the Adapter Pattern to link string `size` payloads to Prisma `variant_id`s.
5. **Phase 5: Order Controller (High Risk):** Rewrite `orderController.js`. Implement the Prisma `$transaction` inventory engine targeting Variants.

## 8. Migration Readiness Score
**85% Ready.**
The architectural roadmap is completely locked. The primary remaining friction point is the physical data migration of quantities from Mongo to MySQL, which will require warehouse-manager reconciliation after the script runs. The environment is now cleared for execution starting with the Data Migration script.
