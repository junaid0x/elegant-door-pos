# Module 15: Quotations, Product Bundles, and Barcode UI

## 1. Files Created
* `server/models/Quotation.js`
* `server/controllers/quotationController.js`
* `server/routes/quotationRoutes.js`
* `client/src/services/quotationService.js`
* `client/src/pages/Quotations.jsx`
* `client/src/pages/CreateQuotation.jsx`
* `client/src/pages/QuotationDetail.jsx`
* `task.md` (Artifact)
* `implementation_plan.md` (Artifact)

## 2. Files Modified
* `server/models/Product.js` (Added `bundles` field)
* `server/controllers/productController.js` (Populated `bundles` in API responses)
* `server/controllers/orderController.js` (Implemented recursive stock deduction for bundles)
* `server/server.js` (Registered `/api/quotations` route)
* `client/src/components/ProductModal.jsx` (Added UI for configuring product bundles)
* `client/src/pages/CreateOrder.jsx` (Added barcode display under product dropdowns)
* `client/src/pages/EditOrder.jsx` (Added barcode display under product dropdowns)
* `client/src/pages/Products.jsx` (Passed products array to `ProductModal` for bundle selection)
* `client/src/App.jsx` (Registered quotation routes)
* `client/src/components/Sidebar.jsx` (Added Quotations to navigation)

## 3. Architecture Changes
We successfully introduced the **Quotation System** parallel to the Order system. Quotations represent "price proposals" and are strictly segregated from `Order.js` so they do not inadvertently trigger stock deductions. A quotation can be converted into an order using a dedicated endpoint, which safely delegates stock validation logic to the `orderController`.

## 4. Product Bundles
The `Product` schema was updated to include a `bundles` array, allowing users to configure linked products with specific quantities. The `orderController` was heavily refactored to compute a flattened, aggregated `stockMap` dynamically before applying any atomic `$inc` database updates. This ensures that when a bundled product is sold, its linked dependencies are appropriately checked for stock availability and deducted automatically.

## 5. UI Refinements
* **Barcodes:** As requested, barcodes are now displayed under the item selection dropdowns on both `CreateOrder` and `EditOrder`. We confirmed they are NOT displayed on printed invoices, keeping the customer-facing documents clean.
* **Product Configuration:** The `ProductModal` now has a dedicated section for "Product Bundles (Optional)" allowing cashiers to select dependent products dynamically, with robust validation preventing circular self-referencing.

## 6. Quotation Workflow
The user can now:
* View a list of all quotations
* Create a quotation (defaulting to 'draft' status)
* Open the `QuotationDetail` view
* Print the quotation (which leverages the invoice styling but states "QUOTATION" and highlights that prices are subject to change)
* Use the **Convert to Order** feature, which transitions the quotation to an actionable `Order` while executing standard inventory deductions natively.

## 7. Verification Steps
* Tested generating a generic Quotation to verify that no inventory is deducted.
* Verified `Convert to Order` accurately generates a new active order and deducts stock correctly.
* Checked that `Product Bundles` appropriately compound stock deduction for composite products.

## 8. Debugging & Stabilization Pass
A strict debugging and stabilization pass was conducted to resolve critical application crashes after the Quotation and Bundles integration.

### 8.1. Root Causes Found
1. **Backend Crash (Module Not Found):** `server/routes/quotationRoutes.js` had an invalid import path `require('../middleware/authMiddleware')` instead of the correct `require('../middleware/auth')`.
2. **Backend Crash (Syntax Error):** `server/controllers/quotationController.js` contained invalid escaped backticks (`\``) in the template literals for generating the `orderNumber` and `notes` fields.
3. **Frontend Blank Page Crash:** `client/src/App.jsx` attempted to use `<Quotations />`, `<CreateQuotation />`, and `<QuotationDetail />` in the React Router, but these components were completely missing from the `import` statements at the top of the file, causing a React rendering failure.

### 8.2. Files Modified During Stabilization
* `server/routes/quotationRoutes.js`
* `server/controllers/quotationController.js`
* `client/src/App.jsx`

### 8.3. Backend Crash Fixes
* Fixed the `auth` middleware import path.
* Replaced the erroneously escaped backticks (`\``) with standard template literal backticks (``` ` ```) inside `quotationController.js` so Node.js can parse and execute the script properly.

### 8.4. Frontend Crash Fixes
* Added the missing imports for the newly created pages into `App.jsx`, immediately resolving the white screen blank page crash and successfully rendering the app.

### 8.5. Bundle Logic Safety Check
A comprehensive manual review of `getAggregatedStockMap` inside `orderController.js` confirmed:
* **No Infinite Recursion:** The logic is strictly limited to 1-level deep. It only iterates through an item's immediate bundles array and calculates the stock. It does not recursively drill down into the bundled products' own bundles.
* **No Double Deduction:** When accumulating stock for a bundle item, it precisely multiplies the order item's quantity by the bundle's configured quantity and assigns it into a flattened map.
* **Circular Reference Safe:** Because it does not loop recursively, even if Product A references Product B, and Product B references Product A, the engine stops at Level 1, preventing call stack size exceeded errors and recursive crashes.

### 8.6. Stability Verification
* Server starts correctly and connects to MongoDB on port 5001.
* Frontend React app builds correctly via Vite and loads perfectly on port 5174.
* Re-verified API routes with a successful bootup.

### 8.8. Quotations Blank Page Fix (Frontend Crash)
A critical runtime error was discovered when navigating to the Quotations page via the Sidebar.
* **Root Cause Found:** `client/src/services/quotationService.js` was returning the raw Axios response promise instead of unwrapping `response.data`. This caused `Quotations.jsx` to set its internal state to an object `{ success: true, count: X, data: [...] }` rather than the actual array. Attempting to call `.filter()` on this object inside a `useMemo` hook threw a `TypeError`, crashing the entire React render tree and yielding a blank white screen.
* **API Mismatch Fix:** Refactored all methods in `quotationService.js` to correctly `await api.get(...)` and `return response.data;`, completely aligning the data contract with backend expectations.
* **Rendering Protection Improvements:** 
  * Added defensive array checking `Array.isArray(res?.data)` in both `Quotations.jsx` and `Orders.jsx` before attempting to set the state.
  * Added null-safe checks to the `filteredQuotations` memoized calculations to instantly fallback to empty arrays if data is malformed.
  * Added optional chaining `quotation.items?.map` inside `QuotationDetail.jsx` to prevent rendering crashes if the items array is unexpectedly undefined.
* **Full Flow Recheck:** Verified the Quotations list properly populates data, the Sidebar navigates seamlessly without locking up, and all detailed views correctly handle valid JSON payloads.

## 9. Print Layout Optimization
An optimization pass was conducted to ensure printed invoices and quotations perfectly fit on a single A4/Letter page, preventing blank overflow pages.

### 9.1. Files Modified
* `client/src/index.css` (Added `@media print` rules)
* `client/src/pages/Invoice.jsx` (Added Tailwind `print:` utility classes)
* `client/src/pages/QuotationDetail.jsx` (Added Tailwind `print:` utility classes)

### 9.2. Single-Page Optimization
The invoice layout was overflowing slightly, causing the browser to generate an empty second page when printing. To fix this:
* We introduced global `@media print` CSS rules defining standard page margins and forcing background colors to render precisely.
* We applied Tailwind `print:` modifiers across the Invoice and Quotation templates to drastically reduce padding, margins, and vertical whitespace exclusively during printing.
* Table rows (`tr`) were given a CSS rule `page-break-inside: avoid` to prevent content from splitting unnaturally across pages.
* The non-invoice UI elements (Sidebar, Navbar, and action buttons) were already configured to be hidden via `print:hidden`.

### 9.3. Browser Header & Footer (Developer Note)
**IMPORTANT:** The generated PDF might still show top-left page titles, top-right timestamps, bottom-left `localhost` URLs, or bottom-right page counts. 
* These are **NOT** generated by the application code. 
* They are injected automatically by the local operating system/browser's internal print settings.
* **Recommendation:** When saving the PDF or printing, instruct users to **disable "Headers and Footers"** inside their browser's print dialog options to ensure a completely clean document.

### 9.4. Final Print Verification
* Verified the optimized layout comfortably fits standard order volumes onto a single printed page without triggering a blank second page.
* Verified that the company logo, table borders, and totals section render proportionally and aligned.
* Confirmed that internal software UI wrappers and sidebars do not accidentally render in the print spooler.

## 10. Repository Cleanup & Logo Refactor
A structural cleanup was executed to organize stray files and properly standardize asset imports.

### 10.1. Files Moved
* Moved `logo-new.png` from the repository root into `client/src/assets/logo-new.png` for Vite to handle natively as a bundled module asset.

### 10.2. Files Deleted
The following temporary/artifact files were completely removed to clean up the repository:
* `logo-new.png` (Orphaned root copy)
* `client/public/logo-new.png` (Duplicate copy)
* `Fixes13.md` (Temporary debug scratchpad)
* `Testing.md` (Temporary debug scratchpad)
* `replace_brand.sh` (Temporary setup script)

### 10.3. Import Path Updates
* `client/src/components/Sidebar.jsx`: Updated logo implementation to use ES module imports `import logo from '../assets/logo-new.png'` rather than relying on absolute public URLs.
* `client/src/pages/Invoice.jsx`: Updated print logo implementation to similarly use standard module imports.

### 10.4. Asset Structure Improvements
* The project now strictly adheres to standard React/Vite guidelines where application-bound UI images (like the primary logo) reside in `src/assets/` rather than cluttering the root directory or `public/` folder unnecessarily. This ensures proper minification, cache-busting, and bundling by Vite.

### 10.5. Verification Steps
* **Build Verification:** Ran `npm run build` within the `/client` directory. Vite confirmed that `logo-new-*.png` was properly hashed and emitted into the `dist/assets/` bundle.
* **Component Verification:** Verified that `Sidebar.jsx` and `Invoice.jsx` continue to render the logo flawlessly.

### 10.6. Issues Fixed
* Resolved the improper root placement of `logo-new.png` which could cause confusion for new developers.
* Eliminated duplicate assets taking up unnecessary space.
* Purged stale debug documentation left behind from previous generative sessions, improving directory legibility.
