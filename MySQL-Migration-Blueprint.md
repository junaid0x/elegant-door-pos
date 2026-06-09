# MySQL Migration Blueprint

## 1. Current Mongo Architecture
The current backend utilizes MongoDB with Mongoose ODM. It relies on a document-oriented architecture with five primary collections:
*   `users`: Stores user authentication, roles, and profiles.
*   `categories`: Stores product classifications.
*   `products`: The central catalog. It contains root-level `quantity` and `price`, an embedded array of `sizes` (strings), and an embedded array of `bundles` representing composite products.
*   `orders`: Represents customer orders with embedded `items` (using `orderItemSchema`). Tracks order status, payment, totals, and customer info.
*   `quotations`: Similar to orders, representing pre-sale quotes with embedded `items`. Links to converted orders.

Inventory deduction logic relies on Mongoose's `$inc` operator with manual application-level rollbacks in `orderController.js` instead of robust ACID transactions.

## 2. Collection Analysis
*   **Users**: Schema contains `name`, `email`, `password` (bcrypt hashed), `role` (super_admin, admin, manager), and `isActive`.
*   **Categories**: Simple mapping of `name` and `description`.
*   **Products**: Contains scalar fields (`sku`, `barcode`, `name`, `quantity`, `price`), a reference to `Category`, an array of strings for `sizes`, and an array of subdocuments for `bundles` (each containing a `product` reference and `quantity`).
*   **Orders**: Root document contains order metadata (`orderNumber`, `subtotal`, `tax`, `total`, `status`, `customerInfo`). The `items` array embeds complex subdocuments that track line items, including product references, manual names, physical dimensions (`location`, `size`, `leftHand`, `rightHand`), and associated accessories (`jambProduct`, `jambQuantity`, `hingeProduct`, `hingeQuantity`).
*   **Quotations**: Mirrors the Order schema but includes a `convertedToOrder` reference for tracking successful quotes.

## 3. Proposed MySQL Schema

The new schema moves away from embedded documents to a fully normalized relational structure.

### Core Tables
*   **`users`**: `id`, `name`, `email`, `password_hash`, `role`, `is_active`, `created_at`, `updated_at`
*   **`categories`**: `id`, `name`, `description`, `created_at`, `updated_at`

### Catalog Tables
*   **`products`**: `id`, `category_id`, `sku`, `barcode`, `name`, `description`, `low_stock_threshold`, `created_at`, `updated_at`
    *   *(Note: `price` and `quantity` are removed from the root to support size-specific tracking)*
*   **`product_sizes`**: `id`, `product_id`, `size_label` (e.g., "3.0x8.0x1-3/4"), `price`, `quantity`, `created_at`, `updated_at`
*   **`product_bundles`**: `id`, `parent_product_id`, `child_product_id`, `quantity`

### Sales Tables
*   **`orders`**: `id`, `order_number`, `status`, `subtotal`, `tax`, `gst`, `pst`, `delivery`, `discount`, `total`, `payment_method`, `customer_name`, `customer_email`, `customer_phone`, `customer_address`, `notes`, `created_at`, `updated_at`
*   **`order_items`**: `id`, `order_id`, `product_id` (nullable), `product_size_id` (nullable), `custom_name`, `quantity`, `unit_price`, `line_total`, `location`, `jamb_product_id`, `jamb_quantity`, `jamb_custom`, `hinge_product_id`, `hinge_quantity`, `hinge_custom`, `left_hand`, `right_hand`, `description`
*   **`quotations`**: Same structure as `orders`, but adds `converted_to_order_id` (FK to `orders.id`).
*   **`quotation_items`**: Mirrors `order_items` structure, linking to `quotations`.

## 4. Table Relationships
*   **Categories to Products**: 1-to-Many (`categories.id` -> `products.category_id`)
*   **Products to ProductSizes**: 1-to-Many (`products.id` -> `product_sizes.product_id`)
*   **Products to ProductBundles**: 1-to-Many self-referencing. `parent_product_id` refers to the main bundle product, `child_product_id` refers to the included item.
*   **Orders to OrderItems**: 1-to-Many (`orders.id` -> `order_items.order_id`)
*   **Quotations to QuotationItems**: 1-to-Many (`quotations.id` -> `quotation_items.quotation_id`)
*   **OrderItems to Accessories**: `jamb_product_id` and `hinge_product_id` are Foreign Keys pointing to `products.id`.

## 5. Bundle Strategy
Currently, bundles are embedded inside the `Product` document. In MySQL, this requires a **Many-to-Many Junction Table** (`product_bundles`). 
*   When a "Door Bundle" is sold, the inventory logic will query `product_bundles` where `parent_product_id = {DoorBundle_ID}`.
*   It will iterate through the results and deduct inventory from the respective `child_product_id` records based on the multiplied quantity. 
*   Using a junction table guarantees relational integrity and allows a single child product (e.g., a standard hinge) to belong to multiple parent bundles.

## 6. Product Size Strategy
The current system supports "One Product -> Multiple Sizes" but stores inventory and price globally at the Product level. In a relational database, sizes must be split into their own table to prevent data duplication and allow future granular inventory tracking.

*   **Structure**: The `product_sizes` table acts as the primary SKU variant tracker. 
*   **Inventory Deductions**: Line items in orders will reference `product_size_id` instead of just storing a string `size` value. This ensures that when a "3.0x8.0x1-3/4 Madison Door" is sold, only the inventory for that specific size is deducted.

## 7. Order/Quotation Strategy
The massive embedded arrays in Orders and Quotations will be extracted into `order_items` and `quotation_items`.
*   These tables will handle the complex door configurations.
*   Legacy/Custom text fields (`jamb_custom`, `hinge_custom`, `custom_name`) will remain as nullable `VARCHAR` columns to support ad-hoc POS entries.
*   **Crucial Change**: Mongoose's `$inc` application-level rollbacks will be entirely replaced by **ACID-compliant SQL Transactions**. When an order is created or updated, the order insert, item inserts, and inventory deductions will all happen inside a single `START TRANSACTION` ... `COMMIT` block.

## 8. Prisma vs Sequelize Recommendation
**Recommendation: Prisma ORM**

*   **Schema-First Design**: Prisma uses a declarative `schema.prisma` file, which closely mimics the mental model of Mongoose schemas. This makes transitioning from MongoDB significantly more intuitive for the current codebase.
*   **Nested Writes**: Creating an Order with multiple OrderItems requires multiple separate `INSERT` statements in raw SQL. Prisma's nested write syntax (`create: { items: { create: [...] } }`) behaves almost identically to Mongoose's nested document creation.
*   **Type Safety**: Prisma generates a fully typed client, reducing runtime errors during the complex data mapping required for the migration.
*   **Transactions**: Prisma provides an elegant `$transaction` API which is vastly superior to Sequelize's transaction passing, guaranteeing safe inventory deductions.

## 9. Migration Risk Assessment

| Subsystem | Complexity | Risk Level | Notes |
| :--- | :--- | :--- | :--- |
| **Authentication** | Easy | Low | Bcrypt hashes and user logic map 1:1. |
| **Categories** | Easy | Low | Direct 1:1 mapping. |
| **Products -> Sizes** | Medium | Medium | Converting flat `sizes` arrays into relational `product_sizes` rows requires data massage. Assigning the legacy root `quantity` to these new size variants will require a business decision (e.g., split evenly, or assign all to a "Default" size). |
| **Bundles** | Medium | Medium | Self-referencing tables can be tricky during data migration due to foreign key constraints. |
| **Orders & Inventory**| Hard | High | The `orderController.js` and `quotationController.js` contain intricate logic for deductions, restorations, and active status checks. Converting this from Mongoose array manipulation to SQL relational queries wrapped in ACID transactions requires a complete rewrite of these controllers. |

## 10. Recommended Migration Plan
1.  **Schema Definition**: Initialize Prisma and map out the proposed MySQL schema in `schema.prisma`.
2.  **Controller Rewrites (Phase 1)**: Refactor `authController` and `categoryController` to use Prisma. 
3.  **Controller Rewrites (Phase 2)**: Refactor `productController`. Implement the new logic for `ProductSizes` and `ProductBundles`.
4.  **Controller Rewrites (Phase 3)**: Refactor `orderController` and `quotationController`. Implement robust SQL transactions for inventory deductions and restorations.
5.  **Data Migration Script**: Write an isolated Node.js script that connects to both Mongoose and Prisma simultaneously. Loop through Mongo collections and `INSERT` into MySQL, handling the data transformations (especially for Product Sizes and Order Items).
6.  **Staging & Testing**: Run the system locally with the migrated data. Verify that creating, editing, and cancelling orders strictly maintains correct inventory counts across all sizes and bundles.
