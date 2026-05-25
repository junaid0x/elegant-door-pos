# Module 9: Create Order Frontend — Walkthrough

---

## 1. Files Created

| File | Type | Description |
|------|------|-------------|
| `client/src/pages/CreateOrder.jsx` | Frontend Page | The comprehensive user interface for drafting and submitting new orders. Features dynamic order lines and instant total calculations. |
| `Module9.md` | Documentation | This walkthrough document. |

---

## 2. Files Modified

| File | Change |
|------|--------|
| `client/src/App.jsx` | Imported `CreateOrder` and mapped it to the protected route `/orders/create`. |
| `client/src/pages/Orders.jsx` | Updated the placeholder "New Order" buttons (both in the header and empty state) to `navigate('/orders/create')`. |

---

## 3. Frontend Architecture Decisions

- **State Consolidation:** Instead of splitting the order header (customer name, status) and order lines into separate complex components with prop-drilling, the entire form is managed within `CreateOrder.jsx`. This makes the dynamic `subtotal` and `total` calculations significantly faster and easier to trace.
- **Data Validation:** Before hitting the backend, the frontend checks if any line has an empty product selection, an empty custom name, or a quantity less than 1. This prevents unnecessary 400 errors from the server.
- **Routing UX:** Upon successfully saving an order, the user is automatically navigated back to `/orders` where they will immediately see their new order in the list.

---

## 4. API Integrations

- **`getProducts()`**: Called on component mount (`useEffect`). This populates the inventory dropdown choices for the order lines so the user doesn't have to guess Product IDs.
- **`createOrder(payload)`**: Called inside `handleSave()`. The frontend state is mapped precisely to match the backend schema before dispatching. For example: `payload.items` conditionally sends either `{ product: id }` or `{ customName: string }` based on the line type.

---

## 5. Order Line Logic

The `items` state is an array of objects representing the rows in the table. Each object is uniquely tracked via `crypto.randomUUID()` rather than array index to prevent rendering bugs when deleting lines in the middle of the table.

When a user modifies a line via `handleUpdateLine`, the system intelligently intercepts specific fields:
- If `type` changes to `'custom'`, the `product` ID and `unitPrice` are wiped clean.
- If `type` changes to `'product'`, the `customName` and `unitPrice` are wiped clean.
- If a new `product` is selected from the dropdown, the system finds that product in the fetched `products` array and **automatically fills the `unitPrice`**, saving the user from looking up prices manually.

---

## 6. Custom Item Flow

The user explicitly requested support for both inventory items and custom one-off fees (like installation or delivery).
- **The UI Toggle:** A simple `<select>` on each row lets the user flip between "Inventory" and "Custom".
- **The Swap:** Flipping to "Custom" replaces the product dropdown with a standard text `<input>`.
- **The Benefit:** This allows the cashier to charge for anything on the fly. Since the `product` field is null, the backend will completely ignore this line when deducting inventory stock.

---

## 7. Filter Logic

*(Note: The list filter logic was fully implemented in Module 8. However, the Create Order page respects the same status enumerations.)*
The status dropdown on the Create Order page exactly matches the tabs on the Orders List page (`draft`, `in_processed`, `payment_pending`, `shipped`, `completed`). A warning is displayed in yellow if the user selects anything other than `draft`, indicating that inventory will be permanently deducted upon save.

---

## 8. Calculations Explanation

Calculations are completely automated using React's `useMemo` hook, ensuring they only recalculate when specific dependencies change:

1. **Line Total:** Calculated inline during render: `(item.quantity * item.unitPrice)`.
2. **Subtotal:** A `useMemo` reduces the `items` array, summing up the line totals.
3. **Total:** A separate `useMemo` simply adds the `tax` state (currently an absolute dollar amount input) to the `subtotal`.

These numbers update instantly on every keystroke, providing a snappy, modern POS feel.

---

## 9. Testing Instructions

1. Go to the **Orders** page (`/orders`) and click the blue **New Order** button.
2. **Header Test:** Fill in a Customer Name and change the Status to `completed`. Notice the yellow warning appear.
3. **Inventory Test:** Leave the type as "Inventory" and select a product. Watch the Price column auto-fill. Change the Quantity to 3 and watch the Total column calculate instantly.
4. **Custom Test:** Click "Add Line Item". Change the Type to "Custom". Type "Delivery Fee" and manually enter a price of 50.
5. **Calculations Test:** Verify the Subtotal accurately reflects the sum of both lines. Type "10" into the Tax field. Verify the grand Total is Subtotal + 10.
6. **Save Test:** Click **Save Order**. You should see a success toast and be redirected back to the Orders list where your new order is now visible!

---

## 10. Any Issues/Fixes

- **Handling empty quantities:** The UI natively enforces `<input type="number" min="1">` to prevent UI glitches, and the `handleSave` function does a secondary check to ensure no quantities are 0 before firing the API request.
