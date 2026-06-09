# Controller Migration Plan & Implementation Roadmap

## 1. Controller-by-Controller Analysis

### `authController.js`
*   **Current Dependencies:** `User` model, `bcryptjs`, `jsonwebtoken`.
*   **Current Queries:** `.findOne().select('+password')`, `.countDocuments()`, `.create()`, `.findById()`, `.save()`.
*   **Prisma Replacement:** Direct mapping to `prisma.user`. `findUnique`, `count`, `create`, `update`.
*   **Complexity:** **LOW**. 

### `categoryController.js`
*   **Current Dependencies:** `Category` and `Product` models.
*   **Current Queries:** `.find()`, `.findById()`, `.findOne()`, `.create()`, `.findByIdAndDelete()`, `.countDocuments()`.
*   **Prisma Replacement:** Direct mapping to `prisma.category`. The duplicate name checks using Regex will be replaced by Prisma's exact match or `contains` filters.
*   **Complexity:** **LOW**.

### `productController.js`
*   **Current Dependencies:** `Product`, `Category`, `Order` models.
*   **Current Queries:** `.find().populate()`, `.findByIdAndUpdate()`, `.exists()`.
*   **Prisma Replacement:** Moving from a flat document to relational variants. `.findMany({ include: { category: true, variants: true, bundlesAsParent: { include: { childProduct: true } } } })`. Creates and updates must use nested writes (`create: { variants: { create: [...] } }`).
*   **Complexity:** **MEDIUM**.

### `quotationController.js`
*   **Current Dependencies:** `Quotation`, `Order`.
*   **Current Queries:** Deep `.populate()`, `.create()`, `.findByIdAndUpdate()`. The `convertToOrder` method currently uses a fragile mock HTTP response object (`fakeRes`) to call `orderController`.
*   **Prisma Replacement:** Deep relational includes. `convertToOrder` will be heavily refactored to use a shared Prisma `$transaction` service rather than mocking `req/res` objects.
*   **Complexity:** **MEDIUM**.

### `orderController.js`
*   **Current Dependencies:** `Order`, `Product`.
*   **Current Queries:** Custom `getAggregatedStockMap`, atomic `$inc` updates, manual loop-based rollbacks upon failure.
*   **Prisma Replacement:** Complete rewrite of the inventory deduction engine. Will utilize Prisma `$transaction` API to ensure ACID compliance. Deductions will target `ProductVariant` quantities instead of root `Product` quantities.
*   **Complexity:** **HIGH**.

## 2. Model Replacement Map

| MongoDB Model (Mongoose) | MySQL Model (Prisma) | Notes |
| :--- | :--- | :--- |
| `User` | `User` | 1:1 Mapping |
| `Category` | `Category` | 1:1 Mapping |
| `Product` | `Product` + `ProductVariant` + `ProductBundle` | Extracting embedded arrays and scalars into 3 relational tables. |
| `Order` + `orderItemSchema` | `Order` + `OrderItem` | Extracting embedded subdocuments into child tables. |
| `Quotation` + `quotationItemSchema` | `Quotation` + `QuotationItem` | Extracting embedded subdocuments into child tables. |

## 3. Route & Frontend Impact Analysis

The goal is to keep frontend rewrites to an absolute minimum.

*   **Auth & Categories:** API payloads remain 100% identical. No frontend changes.
*   **Products (`/api/products`):**
    *   *Payload Change:* The backend will return `variants` (array of objects) instead of `sizes` (array of strings). 
    *   *Frontend Impact:* `ProductModal.jsx` must be updated to handle Variant objects (Size, Price, Quantity) instead of root scalars.
*   **Orders & Quotations (`/api/orders`, `/api/quotations`):**
    *   *Adapter Strategy:* To avoid rewriting the frontend `CreateOrder.jsx` forms, the backend controller will act as an adapter. If the frontend payload sends `size: "3.0x8.0"`, the Prisma controller will intercept this, look up the `variant_id` for that specific size, and create the `OrderItem` using the `variant_id`. This prevents massive UI rewrites.

## 4. Product Migration Strategy

A custom Node.js script will read from Mongoose and write to Prisma.

*   **Sizeless Products (Hinges, Jambs, Locks):**
    *   Reads root `price` and `quantity`.
    *   Creates a single `ProductVariant` with `size = null`.
*   **Sized Products (Doors):**
    *   Reads the `sizes` array (e.g., 3 sizes).
    *   Creates 3 `ProductVariant` records.
    *   *Data Massage:* Copies the root `price` to all 3 variants. Since Mongo only held one global `quantity`, the script will assign the total `quantity` to the *first* size, and set `0` for the rest, flagging the product ID in a log file for manual inventory reconciliation by the warehouse manager.
*   **Bundles:**
    *   Maps the `bundles` array into the `ProductBundle` junction table.

## 5. Inventory Migration Strategy (SQL Transactions)

The current `orderController.js` attempts to emulate transactions by manually restoring `$inc` deductions if an array loop fails. This will be replaced by Prisma `$transaction`:

**The New Flow:**
1.  **Calculate Required Stock:** Map line items to their required `ProductVariant` IDs. Map dynamic accessories (`hingeProductId`, `jambProductId`) to their default sizeless `ProductVariant` IDs. Iterate `ProductBundle` relationships to add bundled child variants to the required stock map.
2.  **Open Transaction:** `await prisma.$transaction(async (tx) => { ... })`
3.  **Read & Validate:** Query `tx.productVariant.findUnique` for all required IDs. If any `quantity < required`, throw an error (which instantly aborts the transaction).
4.  **Deduct:** Use `tx.productVariant.update({ data: { quantity: { decrement: required } } })`.
5.  **Write Order:** `tx.order.create({ data: { ... items: { create: [...] } } })`.

This guarantees zero orphaned orders and zero negative inventory states.

## 6. Recommended Implementation Order

1.  **Phase 1: Foundation & Data Migration**
    *   Setup Prisma, connect to MySQL.
    *   Write and test the Mongo-to-MySQL data migration script locally. Verify variant extraction.
2.  **Phase 2: The Core API (Low Risk)**
    *   Migrate `authController.js` and `categoryController.js`.
3.  **Phase 3: Product Architecture (Medium Risk)**
    *   Migrate `productController.js`.
    *   Update React frontend (`ProductModal`, Product Table) to ingest the new Variant data structure.
4.  **Phase 4: Quotations (Medium Risk)**
    *   Migrate `quotationController.js`.
    *   Implement backend adapter logic to parse legacy `size` strings into `variant_id` links.
5.  **Phase 5: Orders & Inventory Engine (High Risk)**
    *   Migrate `orderController.js`.
    *   Build the `$transaction` inventory deduction/restoration engine.
    *   Refactor `convertToOrder` to share this new engine.
6.  **Phase 6: QA & Deployment**
    *   Parallel database run.

## 7. Risk Assessment

*   **Most Dangerous Controller:** `orderController.js`. Errors here mean lost revenue or ruined warehouse inventory counts.
*   **Most Dangerous Migration:** The `Product -> ProductVariant` split. Distributing a single MongoDB global `quantity` across multiple specific SQL sizes is mathematically imprecise and requires manual post-migration auditing.
*   **Most Likely Bug:** Ad-hoc accessory deductions (Hinges/Jambs added manually to a door line item). Ensuring the system correctly finds the "sizeless" default variant for these accessories during the `$transaction` deduction is a critical failure point to test.
*   **Most Likely Frontend Breakage:** `CreateOrder.jsx` dropdowns relying on `product.sizes` (array of strings) instead of `product.variants` (array of objects).

## 8. Final Migration Readiness Score
**95% Ready.**
The architecture is solid, the schema is exact, and the adapter pattern protects the frontend. The only pending variable is warehouse manager approval regarding how global quantities will be distributed across the newly created specific door sizes during the data migration script execution.
