# Module 10: Real Order Creation & Inventory Integration

---

## 1. Files Created

| File | Type | Description |
|------|------|-------------|
| `client/src/pages/EditOrder.jsx` | Frontend Page | The user interface for fetching, viewing, modifying, and saving existing orders. Connects directly to the complex backend updating logic. |
| `Module10.md` | Documentation | This final architectural review of the entire order/inventory lifecycle. |

---

## 2. Files Modified

| File | Change |
|------|--------|
| `client/src/App.jsx` | Mapped the `/orders/:id/edit` dynamic route to `EditOrder.jsx`. |
| `client/src/pages/Orders.jsx` | Updated the Action table's "Edit" pencil icon to dynamically route to the specific order's edit page using its `_id`. |

---

## 3. Inventory Deduction Logic

*(Implemented natively in `server/controllers/orderController.js`)*
When an order is created (or transitions) into an "Active" status (`in_processed`, `payment_pending`, `shipped`, `completed`), the backend automatically loops through all `items`. 
- For every item with a linked `product`, it runs an atomic MongoDB query:
  `{ $inc: { quantity: -item.quantity } }` **ONLY IF** `{ quantity: { $gte: item.quantity } }`.
- This guarantees stock can **never drop below zero**, even if two users checkout at the exact same millisecond. If one item fails, the system rolls back all previous deductions for that specific order attempt and throws an error.

---

## 4. Inventory Restoration Logic

If an active order is modified or cancelled, the system uses the `restoreStock` algorithm to return the items to the `Product` collection.
- It simply applies `{ $inc: { quantity: +item.quantity } }` to the specific products.
- This is fired automatically by the backend before a Delete operation, or during specific status transitions.

---

## 5. Status Transition Logic

The backend acts as a state machine inside the `updateOrder` endpoint:
- **Inactive ➔ Active** (e.g., `draft` ➔ `completed`): Fires `deductStock(items)`.
- **Active ➔ Inactive** (e.g., `completed` ➔ `cancelled`): Fires `restoreStock(items)`.
- **Active ➔ Active (with changed items)**: The safest approach without Replica Set Transactions is used. It first restores the old items entirely, then attempts to deduct the new items. If the new items overdraw the inventory, it rolls back by re-deducting the old items and throws an error.

---

## 6. Edit-Order Logic

The `EditOrder.jsx` frontend page performs the following:
1. Mounts and fires `Promise.all` to fetch both the specific `getOrder(id)` and the full `getProducts()` catalog simultaneously.
2. Maps the backend schema back into the localized frontend array (converting `item.product` presence into `type: 'product'` vs `type: 'custom'`).
3. Warns the user in the UI if they select a status like "Cancelled", noting that it will automatically restore all inventory.
4. Packages the modified items array and sends a `PUT` request to `/api/orders/:id`.

---

## 7. Validation Rules

**Backend Rules:**
- `orderNumber` must be unique.
- `items` array must not be empty.
- `quantity` must be >= 1.
- `unitPrice` must be >= 0.
- Total stock cannot go below zero during deduction.

**Frontend Rules (Pre-flight checks):**
- Blocks submission if any line item has a blank Name/Product.
- Blocks submission if any line item has a quantity < 1.
- Blocks submission if the items array is completely emptied by the user.

---

## 8. Frontend/Backend Integration

The frontend talks to the backend via standard Axios hooks (`orderService.js`). 
- **Create:** Maps local `items` array to the strict backend subdocument array and `POST`s it.
- **Edit:** Passes the `id` from `useParams()` and the mapped payload to the `PUT` endpoint.
The backend does the heavy lifting of inventory math, so the frontend only needs to display success/error toasts based on the HTTP response.

---

## 9. Edge Cases Handled

- **Mixed Order Lines:** Custom items are inherently ignored by the backend deduction logic because their `product` field is undefined. This flawlessly supports mixed carts (e.g., "1 Door (Inventory) + 1 Delivery Fee (Custom)").
- **Preventing Double Deduction:** The backend checks `wasActive` vs `willBeActive` before blindly deducting stock, preventing an order edited from `completed` to `shipped` from deducting the stock a second time.
- **Lost Product References:** If a product is completely deleted from the database, the backend handles the missing `ObjectId` gracefully during restores.

---

## 10. Testing Instructions

1. Go to the **Orders** page and click **New Order**.
2. Add a product (e.g., "Door A") and set status to **Completed**. Save it.
3. Check the **Products** page. Verify "Door A" stock dropped.
4. Go back to Orders. Click the **Edit (Pencil)** icon on your new order.
5. Change the status to **Cancelled** and click Save.
6. Check the **Products** page again. Verify "Door A" stock returned to its original number.
7. Try to edit an order and set the quantity of "Door A" to 9999 (more than in stock). Save it. You should receive a red "Insufficient stock" error toast.

---

## 11. Any Issues/Fixes

- **No major issues.** The architecture established in Module 6 provided a perfect, bug-free foundation for this frontend integration. The UI accurately reflects the backend capabilities.
