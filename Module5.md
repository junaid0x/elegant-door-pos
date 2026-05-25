# Module 5: Products & Inventory — Walkthrough

---

## 1. Project Analysis Performed

Before building this module, an extensive review of the project architecture was conducted:
- **Architecture & Rules:** Read `PROJECT_RULES.md` ensuring strict adherence to existing React/Express patterns and keeping the codebase beginner-friendly. No over-engineering or TypeScript were introduced.
- **Backend Patterns:** Checked existing modules (like Categories) to mimic their controllers (`categoryController.js`), routing style, error handling (`try/catch`), and MongoDB mongoose schemas. The existing `Product` model was identified and verified for all required fields.
- **Frontend Patterns:** Analyzed `Categories.jsx` and `CategoryModal.jsx`. Found robust patterns for loading skeletons, delete dialogs, and reusable modal components which were seamlessly ported over to the Products module.
- **Relationships:** Mapped the relationship between the existing `Category` model and the `Product` model to properly build dropdown selects in the UI and `populate()` calls in the backend controller.
- **Styling:** Maintained the "Elegant POS" design system—utilizing modern spacing, shadow configurations, icon sets (`react-icons`), and toast notifications (`react-hot-toast`).

---

## 2. Files Created

| File | Type | Description |
|------|------|-------------|
| `server/controllers/productController.js` | Backend Controller | Handles CRUD operations (`getProducts`, `createProduct`, `updateProduct`, `deleteProduct`). Includes logic for SKU duplication checks and category validation. |
| `server/routes/productRoutes.js` | Backend Routes | Express router mapping the `/api/products` endpoints. Protects all endpoints using the JWT `protect` middleware. |
| `client/src/services/productService.js` | Frontend Service | Axios wrapper functions to securely communicate with the product API endpoints. |
| `client/src/components/ProductModal.jsx` | Frontend Component | A reusable, responsive modal handling both Add and Edit actions. Includes form validation and dynamic category dropdown population. |
| `Module5.md` | Documentation | This very file, documenting the module's behavior and construction. |

---

## 3. Files Modified

| File | Change |
|------|--------|
| `server/server.js` | Imported and mounted the new product routes via `app.use('/api/products', require('./routes/productRoutes'));` |
| `client/src/pages/Products.jsx` | Completely rewrote the placeholder component into a fully functional Inventory management page with a data table, status badges, and filtering. |

---

## 4. MongoDB Schema Explanation

The `Product` schema (`server/models/Product.js`) manages inventory:
- `name`: Required string (max 100 chars).
- `sku`: Required, unique, uppercase string. Essential for tracking.
- `barcode`: Optional string.
- `category`: `ObjectId` referencing the `Category` model.
- `quantity`: Required number, defaults to 0 (cannot be negative).
- `price`: Required number (cannot be negative).
- `lowStockThreshold`: Number, defaults to 5. Used to calculate stock alerts.
- `description`: Optional text.

**Architecture Decision:** The schema employs Mongoose `timestamps: true` to auto-manage `createdAt` and `updatedAt`. It relies heavily on Mongoose built-in validation (min values for numbers) to ensure data integrity.

---

## 5. Product-Category Relationship

Products belong to a specific Category.
In the MongoDB schema, the `category` field is defined as:
```javascript
category: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Category',
  required: true,
}
```
**Backend Connection:** When fetching products, the `productController.js` uses `.populate('category', 'name')` to seamlessly attach the actual category name to the product object instead of just passing the raw `_id`. 
**Frontend Connection:** `Products.jsx` loads both Products and Categories on mount. The full categories list is passed into the `ProductModal` as a prop so the dropdown select is dynamically populated from the database.

---

## 6. API Endpoints

All endpoints are mounted on `/api/products` and are protected (require JWT).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Retrieves all products, sorts by newest, populates the category name. |
| GET | `/api/products/:id` | Retrieves a specific product by ID. |
| POST | `/api/products` | Creates a new product. Validates category existence and ensures the SKU is unique (case-insensitive check). |
| PUT | `/api/products/:id` | Updates a product. Validates SKU uniqueness (ignores itself) and category existence. |
| DELETE | `/api/products/:id` | Deletes a product from the database. |

---

## 7. Inventory Status Calculation Logic

Product status is NOT stored in the database. It is dynamically calculated on the frontend to ensure accuracy in real-time.

```javascript
const getProductStatus = (quantity, threshold) => {
  if (quantity === 0) return 'Out Of Stock';       // Red
  if (quantity <= threshold) return 'Low Inventory'; // Yellow
  return 'In Stock';                                 // Green
};
```
The table badges automatically change colors based on these thresholds.

---

## 8. Filter Logic Explanation

The `Products.jsx` page features four tabs: **All**, **In Stock**, **Low Inventory**, and **Out Of Stock**.
Instead of making new API calls for each filter, the component uses React's `useMemo` to filter the loaded array in memory:

```javascript
const filteredProducts = useMemo(() => {
  if (activeFilter === 'All') return products;
  return products.filter((p) => {
    const status = getProductStatus(p.quantity, p.lowStockThreshold);
    return status === activeFilter;
  });
}, [products, activeFilter]);
```
This guarantees an instant, snappy UX when users switch between tabs.

---

## 9. Frontend/Backend Connection

1. **Vite Proxy:** The frontend (`localhost:5173`) proxies `/api` calls to the Express backend (`localhost:5001`).
2. **Axios Interceptors:** The existing `api.js` automatically attaches the Authorization Bearer token to headers.
3. **Data Flow (Add Product):**
   - User submits `ProductModal`.
   - `Products.jsx` calls `createProduct(formData)`.
   - Backend `POST` route validates SKU/category, saves to MongoDB.
   - Backend returns success + newly populated product.
   - Frontend triggers `toast.success` and refetches data via `fetchData()`.

---

## 10. Modal Workflow Explanation

The `ProductModal` handles **both** Create and Edit flows using the exact same component.
- **Detection:** It detects mode based on the `product` prop (`const isEdit = !!product`).
- **Prefilling:** The `useEffect` hook monitors the `isOpen` and `product` props. If editing, it maps the product fields to `formData`. If creating, it resets `formData` to empty/default values.
- **Validation:** Handles local validation (required fields, max lengths) before submitting to save API calls.
- **State isolation:** Editing local form state does not alter the main table until the backend responds successfully.

---

## 11. Testing Instructions

1. Start backend (`cd server && npm run dev`) and frontend (`cd client && npm run dev`).
2. Log in using `admin@elegantdoors.com` / `admin123`.
3. Navigate to **Products** (Inventory) from the sidebar.
4. **Test Create:** Click "Add Product", fill out required fields (ensure you pick a category). Hit Save. Verify the toast appears and the table updates.
5. **Test Validation:** Try saving without an SKU or Name. Verify inline red error texts. Try saving a duplicate SKU; verify the toast API error.
6. **Test Status Calculation:** Create three products:
   - Qty: 0 (Should say "Out Of Stock" in red)
   - Qty: 4, Threshold: 5 (Should say "Low Inventory" in yellow)
   - Qty: 10, Threshold: 5 (Should say "In Stock" in green)
7. **Test Filters:** Click the tabs at the top. Ensure the table instantly updates to show only the correct products.
8. **Test Update/Delete:** Edit an existing product. Delete a product and accept the confirmation dialog.

---

## 12. Common Issues / Fixes

- **"Invalid category selected" error on backend:** This happens if the referenced `Category` was deleted. The system validates the Category ID against the DB before inserting.
- **Blank Category in table ("Uncategorized"):** This occurs if a product references a category that was hard-deleted from the database (currently the Categories module blocks deletions if in-use, so this is rare).
- **"SKU already exists":** Ensure SKU fields are unique. The backend uses a case-insensitive Regex to prevent `DOOR-1` and `door-1` from overlapping.
- **Cannot type in number fields:** The modal handles number parsing correctly. If it acts strange, ensure you're typing valid decimals for price or integers for quantity.

---

## 13. Architecture Decisions Made

- **Dual Parallel Fetch:** The frontend fetches `products` and `categories` in parallel using `Promise.all` inside `fetchData()`. This cuts loading time in half compared to sequential fetches.
- **Single Source of Truth:** Status logic (In Stock, Low Stock) is computed strictly on the frontend instead of saved in the DB, preventing database bloat and sync issues.
- **Reuse of the UI System:** The Table layouts, Skeleton loaders, Delete Modals, and Action buttons were perfectly cloned from the Categories module to ensure a consistent, recognizable user experience across the app without installing a heavy component library.

---

## 14. Bug Fix: Auth Middleware Import
- **Issue Found:** The backend server crashed on startup with `Cannot find module '../middleware/authMiddleware'`.
- **Root Cause:** When generating `server/routes/productRoutes.js`, the auth middleware was imported as `../middleware/authMiddleware`, which did not match the actual file structure.
- **Files Modified:** `server/routes/productRoutes.js`
- **Fix Applied:** Changed the import from `require('../middleware/authMiddleware')` to `require('../middleware/auth')`, matching the exact pattern used in `authRoutes.js`, `categoryRoutes.js`, and `dashboardRoutes.js`.
- **Verification Steps:** Checked all existing route files for consistency, applied the fix, and verified the Node.js server starts successfully without crashing.
