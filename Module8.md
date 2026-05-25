# Module 8: Orders List Frontend — Walkthrough

---

## 1. Files Created

| File | Type | Description |
|------|------|-------------|
| `client/src/services/orderService.js` | Frontend Service | An Axios wrapper connecting the frontend to the `GET /api/orders` backend endpoint. Also includes placeholder functions for future CRUD operations. |
| `Module8.md` | Documentation | This walkthrough document. |

---

## 2. Files Modified

| File | Change |
|------|--------|
| `client/src/pages/Orders.jsx` | Completely rewrote the static placeholder page into a dynamic, data-driven List view. Added loading skeletons, a fully responsive table layout, status badges, and an interactive tab filtering system. |

---

## 3. API Integration Explanation

The frontend connects to the backend exclusively through `client/src/services/orderService.js`. 
- **Method:** Uses the global `api` Axios instance, ensuring that JWT authentication headers are automatically injected into requests.
- **Workflow:** When `Orders.jsx` mounts, the `useEffect` hook triggers `fetchOrders()`. This function executes an asynchronous call to `getOrders()`, sets the state `orders` with the returned array, and flips `loading` to false. 
- **Error Handling:** If the API fails (e.g., server offline), the `catch` block intercepts the message, displays a `react-hot-toast` error notification, and renders a visually distinct red error UI with a "Try Again" retry button on the page.

---

## 4. Filter Logic Explanation

The page uses a tab-based filtering system matching the `status` enum defined in the backend schema:
- **Tabs:** All, Draft, In Processed, Payment Pending, Shipped, Completed, Cancelled.
- **State Management:** The current active tab is stored in the `activeFilter` string state (defaulting to `'all'`).
- **Dynamic Logic:** React's `useMemo` hook is utilized to calculate `filteredOrders`. 
  - If `activeFilter === 'all'`, it returns the raw `orders` array.
  - Otherwise, it returns `orders.filter((o) => o.status === activeFilter)`.
  - Because `useMemo` caches the calculation natively in the browser, swapping tabs is instantaneous and does **not** trigger new API calls.
- **Tab Counts:** The tabs calculate the number of items that match their specific filter and display it in a small numerical badge directly next to the tab name (e.g., "Draft (2)").

---

## 5. Status Badge Logic

A helper function `getStatusBadge(status)` maps each of the 6 core backend statuses to a unique color scheme using Tailwind utility classes:
- **draft:** Gray background, dark gray text.
- **in_processed:** Yellow background, dark yellow text.
- **payment_pending:** Orange background, dark orange text.
- **shipped:** Blue background, dark blue text.
- **completed:** Green background, dark green text.
- **cancelled:** Red background, dark red text.

This standardized color coding dramatically improves scanning readability for admins.

---

## 6. Frontend Architecture Decisions

- **Consistent UI Language:** The entire structural layout—from the Skeleton Rows and Table Headers to the Empty State icons and Filter tabs—was purposefully designed to precisely mimic `Products.jsx` and `Categories.jsx`. This creates a unified UX where the user instantly intuitively knows how to navigate the new screen.
- **Action Placeholders:** Following the strict instruction *not* to build the creation, edit, or invoice pages yet, the action buttons (Plus, Eye, Pencil, DocumentText icons) simply trigger a placeholder toast notification ("Feature coming soon! 🚧"). This allows the UI layout to be finalized without overstepping the module boundaries.
- **Data Formatting:** The `createdAt` date from MongoDB is parsed through standard `toLocaleDateString` to transform unreadable ISO strings into friendly readable formats (e.g., "Oct 25, 2026, 04:30 PM").

---

## 7. Testing Instructions

1. Ensure both your Vite frontend and Node backend development servers are running.
2. Log into the application and click on "Orders" in the left sidebar.
3. **Empty State:** If you haven't created any orders yet, verify you see the "No orders found" empty state graphic.
4. **Data Verification:** Use an API tool (like Postman) to `POST /api/orders` and manually create orders with varying statuses (e.g., `draft`, `completed`, `shipped`).
5. Refresh the Orders page. You should see a skeleton loader flash, followed by the table populating with the orders.
6. **Filter Testing:** Click on the different status tabs above the table. Ensure the numbers on the tabs match the real count of orders with that status, and that the table instantly filters out non-matching rows.
7. **Error Testing:** Kill your backend Node server and hit the "Try Again" refresh button on the page. You should see the red "Unable to load orders" error block.

---

## 8. Issues / Fixes

- **No issues found.** The implementation was a direct, straightforward port of the proven List/Table pattern already tested and stabilized in `Products.jsx`.
