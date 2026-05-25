# Module 6: Orders Backend Foundation — Walkthrough

---

## 1. Architecture Analysis

Before executing the backend implementation for Orders, a deep review of the architecture was performed:
- **Dependencies:** The Order system relies fundamentally on the `Product` schema. We verified that the `Product` model has a `quantity` field formatted as a Number, which is essential for accurate stock tracking.
- **Rules Adherence:** We followed `PROJECT_RULES.md` by utilizing the existing `try/catch` block patterns, Express router configurations, and standard JWT protection middleware (`require('../middleware/auth')`).
- **Data Integrity Constraints:** Due to the risk of multiple simultaneous checkouts causing negative stock, we established that a custom controller algorithm utilizing MongoDB's atomic `$inc` updates was mandatory.

---

## 2. Order Schema Explanation

The schema (`server/models/Order.js`) introduces a robust structure mimicking real-world POS/E-commerce needs.

**Header Level (`Order`):**
- `orderNumber`: A required, unique string automatically generated in the controller (e.g., `ORD-123456-789`).
- `subtotal`, `tax`, `total`: Essential financial numbers.
- `status`: Utilizes a strictly typed `enum: ['draft', 'in_processed', 'payment_pending', 'shipped', 'completed', 'cancelled']`. Defaults to `draft`.
- `customerInfo`: An optional embedded object (name, email, phone, address).
- `notes`: Optional string.

**Line Level (`OrderItem` Array):**
- Designed to handle both inventory products and custom non-inventory items within the same array cleanly.

---

## 3. Product vs Custom Item Logic

The `OrderItem` subdocument dynamically handles validation based on whether a product is linked:
```javascript
product: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Product' // Optional
},
customName: {
  type: String,
  required: function () { return !this.product; } // Required if no product ID
}
```
**Why?**
- A user can scan a barcode or click a product, which sets `product` to the `ObjectId`. The backend will later deduct its stock.
- A user can manually type "Custom Installation Fee" into the POS. The `product` field is null, but `customName` is filled. The backend will completely ignore it during stock deductions, allowing flexible sales without cluttering the Product database with one-off fees.

---

## 4. Inventory Deduction & Restoration Logic

The most complex part of this module resides in `server/controllers/orderController.js`. It ensures stock **never goes negative** and gracefully handles order modifications.

### Deduction Algorithm (`deductStock`)
When an order becomes active (any status other than `draft` or `cancelled`), the system deducts stock using an atomic Mongoose query:
```javascript
await Product.findOneAndUpdate(
  { _id: item.product, quantity: { $gte: item.quantity } },
  { $inc: { quantity: -item.quantity } }
);
```
- The `$gte` condition acts as a safety lock. If a product has 5 units and two POS registers try to sell 3 units at the exact same millisecond, the second query will return `null` because `quantity: { $gte: 3 }` is no longer true.
- If it returns `null`, the transaction fails, and the system **rolls back** (restores) any items it successfully deducted earlier in that specific loop, safely aborting the checkout.

### Restoration Algorithm (`restoreStock`)
If an order is moved back to `draft`, or is `cancelled`, or is `deleted`, the system runs `restoreStock`, which simply loops through the items and applies `$inc: { quantity: +item.quantity }`.

### Edit Delta Algorithm
If a user edits an existing active order (e.g., changing quantity from 2 to 3):
1. The system calls `restoreStock(oldItems)`.
2. The system calls `deductStock(newItems)`.
3. If `deductStock` fails (not enough inventory for the new quantity), it rolls back the new deduction AND re-deducts the old items to perfectly restore the database state before throwing the 400 Error.

---

## 5. Files Created

| File | Type | Description |
|------|------|-------------|
| `server/models/Order.js` | Mongoose Model | Defines the Order and OrderItem schemas with conditional validation. |
| `server/controllers/orderController.js` | Backend Controller | Handles full CRUD. Contains the isolated `deductStock`, `restoreStock`, and transition logic. |
| `server/routes/orderRoutes.js` | Express Router | Exposes the 5 standard REST endpoints wrapped in the JWT `protect` middleware. |
| `Module6.md` | Documentation | This walkthrough file detailing the backend architecture. |

---

## 6. Files Modified

| File | Change |
|------|--------|
| `server/server.js` | Uncommented `app.use('/api/orders', require('./routes/orderRoutes'));` to activate the endpoints. |

---

## 7. Backend API Structure

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | Retrieves all orders, sorts by newest, populates product name and SKU. |
| GET | `/api/orders/:id` | Retrieves a single order by ID. |
| POST | `/api/orders` | Creates a new order. Auto-generates `orderNumber`. Deducts stock if created in an active state. |
| PUT | `/api/orders/:id` | Updates an order. Intelligently transitions stock (deducts/restores) based on status changes or item edits. |
| DELETE | `/api/orders/:id` | Deletes an order. Automatically restores stock to inventory if the order was active. |

---

## 8. Important Architecture Decisions

1. **Frontend Exclusion:** As requested, no frontend code was written. We focused strictly on ensuring the database and REST logic was bulletproof first.
2. **Atomic `$inc` vs MongoDB Transactions:** True MongoDB transactions require a Replica Set. Since local dev environments usually run Standalone MongoDB, we opted for the `$inc` with `$gte` safety check pattern. This perfectly mimics transaction safety for our use case without forcing the developer to configure a Replica Set locally.
3. **No Soft Deletes:** To keep the project beginner-friendly, we stuck to hard `DELETE`. The `deleteOrder` controller handles the cleanup by restoring stock first, preventing permanent inventory loss.

---

## 9. Testing Instructions

To verify the backend logic using Postman, cURL, or ThunderClient:

1. **Login** to get your Bearer Token.
2. **Check Inventory:** Make a `GET /api/products` call to find a valid Product ID and check its `quantity`.
3. **Create Order (Deduction Test):** 
   - `POST /api/orders`
   - Body: `{ "status": "completed", "items": [{ "product": "<ID>", "quantity": 2, "unitPrice": 100, "lineTotal": 200 }], "subtotal": 200, "total": 200 }`
   - Verify: Make another `GET /api/products` call. The stock should be exactly 2 lower.
4. **Create Order (Custom Item Test):**
   - `POST /api/orders`
   - Body: `{ "status": "completed", "items": [{ "customName": "Delivery Fee", "quantity": 1, "unitPrice": 50, "lineTotal": 50 }], "subtotal": 50, "total": 50 }`
   - Verify: The order should save successfully without crashing.
5. **Over-Order Test:**
   - Attempt to POST an order where `quantity` is greater than the available stock.
   - Verify: You receive a 400 Error: `Insufficient stock for product`.
6. **Cancellation Test:**
   - Note the `_id` of the first order you created.
   - `PUT /api/orders/<ID>`
   - Body: `{ "status": "cancelled" }`
   - Verify: Make a `GET /api/products` call. The stock should jump back up by 2 units.
