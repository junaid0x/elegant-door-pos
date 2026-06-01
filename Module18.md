# Module 18 – Create Order & Create Quotation Workflow Redesign

## Overview
This module completes the frontend redesign for creating and editing Orders and Quotations, integrating the expanded database structures implemented in Module 17. The new design shifts away from a constrained two-column layout to a **full-width, stacked layout** to support the extensive line-item data requirements for door configurations.

## Changes Implemented

### 1. New Full-Width Layout Architecture
- `CreateOrder.jsx`, `EditOrder.jsx`, and `CreateQuotation.jsx` were entirely refactored to utilize a vertical stacking layout.
- The screen width limit was expanded to `max-w-7xl` to comfortably fit the new fields.
- **Section 1: Order/Quotation Lines (Full Width)**
  - Replaced the compact HTML table with an expansive, flex-based line item card.
  - Implemented intuitive grid columns for data entry: `Location`, `Product Select`, `Size`, `Jamb`, `LH`, `RH`, `Qty`, `Price`, and `Total`.
  - Added a dedicated, full-width "Notes / Description" row beneath each line item for auxiliary text.
- **Section 2: Details**
  - Displays Customer Name, Status dropdown, and General Notes.
- **Section 3: Summary**
  - Neatly presents Subtotal, Tax, and Total calculations based on the expanded item fields.

### 2. State & Payload Mapping
- Updated local component state arrays (`items`) to track `location`, `size`, `jamb`, `leftHand`, `rightHand`, and `description`.
- Adjusted the `handleUpdateLine` handlers and the API `handleSave` payload formatters to correctly extract these fields. Optional text inputs send as `undefined` if empty, and numbers are correctly parsed with `Number()`.

### 3. Missing Feature Added: `EditQuotation.jsx`
- Discovered that the app historically lacked the ability to *edit* a quotation (users could only view, print, or delete).
- Created a brand-new page `EditQuotation.jsx` mirroring the robust logic of `EditOrder.jsx`.
- Plumbed `EditQuotation.jsx` into the React Router in `App.jsx` at path `/quotations/:id/edit`.
- Added an Edit button (Pencil Icon) into the `Quotations.jsx` data table. Note: If a quotation status is `converted`, the edit button becomes disabled.

## Backward & Forward Compatibility
- **Legacy Records:** Pre-Module 17 orders safely load into `EditOrder.jsx`. Their undefined door-configuration fields simply default to empty strings without crashing the form.
- **Inventory & Bundles:** The frontend state strictly preserves the `product` Object ID and `quantity` fields exactly as they were before. This ensures that the backend's highly-sensitive `deductStock` logic remains completely isolated and operational.

## Files Touched
- `client/src/pages/CreateOrder.jsx`
- `client/src/pages/EditOrder.jsx`
- `client/src/pages/CreateQuotation.jsx`
- `client/src/pages/EditQuotation.jsx` (NEW)
- `client/src/pages/Quotations.jsx`
- `client/src/App.jsx`

---

# Module 18 Refix

## Issues Found
- The `CreateQuotation.jsx` UI and padding were disjointed from `CreateOrder.jsx`.
- Line item rows felt cramped and required breathing room.
- Hinge and Jamb inventory linkage (and their respective stock deductions) were missing.
- The Summary section lacked GST, PST, Delivery, and Discount tracking.

## Workflow Improvements
- **Multi-Row Line Items:** Line items have been reorganized into 5 logical rows within a padded card structure, removing horizontal cramping completely.
- **Hinge & Jamb Inventory Flow:** Users can now toggle between "Linked Inventory Product" and "Custom Text Entry" for both Jambs and Hinges. 
- **Summary Architecture:** Replaced the static Tax field with interactive inputs for GST Rate (%), PST Rate (%), Delivery Fee ($), and Discount Amount ($). These auto-calculate and display exact dollar amounts.

## Inventory Deduction Logic
- The backend `orderController.js` logic was updated so that `hingeProduct` and `jambProduct` stock deductions occur gracefully alongside the main `product`.
- It performs validation to ensure sufficient hinge/jamb stock is available, maintaining backward compatibility with bundle functions.

## Summary Redesign
- Configured dynamic `useMemo` calculation hooks that derive the `total` based strictly on: `(Subtotal - Discount) + GST + PST + Delivery`.

## Testing Results
- Verified that all layouts in Create/Edit Order & Quotation sync perfectly.
- Confirmed that toggling Jambs/Hinges between Custom/Inventory appropriately hides or reveals the Qty and Product Select fields.
- Deductions execute precisely for mixed payloads containing Bundles + Inventory Hinge + Custom Jamb.
