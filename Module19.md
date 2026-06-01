# Module 19 – Professional Order, Quotation & Invoice Print Redesign

## Overview
This module transitions the raw internal layouts of Invoices, Orders, and Quotations into a single, unified, customer-facing "Door Schedule" document format. The design heavily iterates upon the client's provided PDF sample to deliver a cleaner, dynamic, and professional layout optimized perfectly for A4 printing.

## Recent Client Overrides & Redesign Decisions
1. **Modern Aesthetic:** Pivot away from rigid spreadsheet-style borders. The new layout uses softer borders (`border-gray-200`), rounded corners (`rounded-xl`), and subtle background fills (`bg-gray-50`) to provide a premium, modern SaaS document feel.
2. **Unified Print Engine:** A master component `DocumentPrint.jsx` dynamically adapts its title and layout based on the `type` prop (`INVOICE`, `ORDER`, or `QUOTATION`).
3. **Dynamic Data Grid:** The layout intelligently scans the order's data before rendering. If no line item contains a `Location`, the Location column collapses entirely. The same applies to `Size`, `Jamb`, `Hinge`, `L` (Left Hand), and `R` (Right Hand). This guarantees that document real-estate is never wasted.
4. **Automated Size Population:** The `Product.js` Mongoose schema was upgraded to natively track an inventory `sizes` array. Creating/Editing Orders and Quotations now dynamically auto-fills the `Size` field of a line item the moment a warehouse product is selected, optionally displaying a dropdown if multiple sizes are supported. 
5. **Workflow Relabeling:** Removed the confusing "Linked Inventory Product" verbiage for Hinge and Jamb selection. The dropdowns now read clearly as "Select from Inventory".
6. **Internal Data Masking:** Bundled products (e.g. `↳ Temp Deadbolt x1`) are hidden using Tailwind's `print:hidden` utility when outputting to PDF to avoid confusing the customer.
7. **Hardcoded Terms & Conditions:** Implemented the exact 11-point Terms and Conditions block required by the client, including the initial custom order acknowledgment text.
8. **Simplified Signatures:** Stripped out the complex dual signature logic and replaced it with a sleek, unified `Printed Name` and `Signature` block as per the latest requirements.

## Module 19 Refix
The following improvements were made to address additional requirements:
1. **Product Size Architecture Improvement:** The `size` field on the `Product.js` schema was refactored into a `sizes` array, supporting multiple sizes per product.
2. **Order/Quotation Size Selection:** `CreateOrder`, `EditOrder`, `CreateQuotation`, and `EditQuotation` logic was updated. If an inventory product has multiple sizes, the line item displays a `<select>` dropdown automatically populated with those sizes.
3. **Order/Quotation Field Spacing:** Refactored the layouts inside the order creation flow. Horizontal and vertical spacing was balanced, input heights standardized to `py-2.5`, and labels made consistent.
4. **Invoice Terms Section Compression:** To guarantee a single-page print format, the Terms & Conditions section was compressed from a list `<li>` into a space-efficient paragraph flow (`1) ... 2) ...`). 
5. **Bill To Box Removal:** The 'Bill To' block lost its container styling and background in favor of a cleaner typographic look.
6. **Product Description Visibility:** Inventory-level product descriptions now render directly underneath the main product line in `DocumentPrint.jsx`. 

## Print Architecture CSS
- Heavily utilized `print-avoid-break` (or `page-break-inside: avoid`) on the table rows (`<tr>`) and signature blocks to prevent an invoice line from slicing in half across two pieces of paper.
- Removed box shadows and normalized background colors using `print:shadow-none` and `print:bg-white` to save printer ink and emulate a pure document look.

## Files Modified
- `server/models/Product.js`
- `client/src/components/ProductModal.jsx`
- `client/src/pages/CreateOrder.jsx`
- `client/src/pages/EditOrder.jsx`
- `client/src/pages/CreateQuotation.jsx`
- `client/src/pages/EditQuotation.jsx`
- `client/src/components/DocumentPrint.jsx`
- `client/src/pages/Invoice.jsx`
- `client/src/pages/QuotationDetail.jsx`
