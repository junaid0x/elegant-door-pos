# Module 12: Invoice System

---

## 1. Files Created

| File | Purpose |
|------|---------|
| `client/src/pages/Invoice.jsx` | The main, printable invoice view component. |

## 2. Files Modified

| File | Change |
|------|--------|
| `client/src/App.jsx` | Added the `/orders/:id/invoice` route to the application. |
| `client/src/pages/Orders.jsx` | Wired the "View" and "Generate Invoice" table icons to navigate to the new Invoice page. Fixed the "Create Order" empty state button to route correctly. |
| `client/public/logo-new.png` | Copied the main logo into the public folder to serve as the invoice header graphic. |

---

## 3. Invoice Architecture

The invoice system is completely stateless on its own, adhering to the "reuse existing architecture" rule.
When the `Invoice.jsx` page loads, it reads the `:id` parameter from the URL and hits the existing `getOrder(id)` API endpoint.
It then maps the data into a read-only, aesthetically pleasing HTML layout designed specifically to mimic an A4/Letter size piece of paper.

## 4. Print Logic Explanation

Printing modern web applications is notoriously difficult due to sidebars, navigation bars, and overflow styling.
To solve this cleanly without third-party PDF libraries:
- We used Tailwind's `print:` modifier classes (e.g., `print:hidden`).
- When the user triggers `window.print()`, the browser applies these modifiers. The action bar with the "Back" and "Print" buttons disappears.
- Because the layout is wrapped in a `max-w-4xl bg-white` container, the browser isolates the exact invoice HTML and translates it perfectly to the printer dialogue without printing the POS dashboard sidebar.

## 5. Navigation Flow

1. User views the **Orders List** (`/orders`).
2. User clicks the Eye icon (View) or Document icon (Invoice) on a specific order row.
3. The app routes the user to `/orders/[id]/invoice`.
4. The user views the printable layout. If they hit the "Back to Orders" button, they return to the main table.

## 6. API Usage

No new backend API endpoints or Mongoose schemas were needed.
The system securely reuses:
- `GET /api/orders/:id` (via `getOrder` service)

## 7. Print Styling Decisions

- Eliminated shadows and rounded borders (`print:shadow-none print:rounded-none`) so the paper prints cleanly edge-to-edge without looking like a floating "web card".
- Hidden the main application background color by forcing `print:bg-white` on the wrapper, preventing dark gray paper bleeding.
- Removed margins during print (`print:py-0`) so the invoice header anchors to the top of the physical paper.

## 8. Responsive Behavior

On mobile devices, the invoice header stacks vertically (Logo -> Company Info -> Invoice Title), ensuring it remains readable. On desktop and tablets, the standard left/right alignment is preserved. The table uses natural browser wrapping.

## 9. Logo Integration Explanation

The requested `logo-new.png` was copied to `/client/public/logo-new.png`.
React naturally serves files from `public/` at the root path, allowing us to use `<img src="/logo-new.png" />`. This is incredibly stable and guarantees the logo is available immediately without complex Webpack imports during print rendering.

## 10. Testing Instructions

1. Navigate to the **Orders** page.
2. Click the **purple document icon** or the **blue eye icon** on any order row.
3. Observe the professional Invoice layout containing real data and the Elegant Doors logo.
4. Click the **Print Invoice** button in the top right.
5. In the browser print dialog, verify that the POS sidebar and the action buttons are entirely hidden, and only the pure invoice prints.

## 11. Print Layout Bugfix (Dashboard Architecture)

During testing, it was discovered that `print:hidden` strictly inside the Invoice component was not sufficient to override the global layout wrappers (Sidebar, Header, MainLayout). The browser was attempting to print the entire dashboard container, making the invoice look like a "screenshot."

**Root Cause:**
The `MainLayout.jsx` wrapper enforced a fixed `h-screen`, `overflow-hidden`, and `flex` layout that constrained the invoice, while `Sidebar` and `Header` were still actively rendering in the DOM during print.

**Fix Applied:**
1. `Sidebar.jsx`: Appended `print:hidden` to the `<aside>` wrapper.
2. `Header.jsx`: Appended `print:hidden` to the `<header>`.
3. `MainLayout.jsx`: 
   - Overrode the fixed layout with `print:block print:h-auto` to allow paper-like vertical expansion.
   - Removed the scrollbars using `print:overflow-visible`.
   - Stripped the standard dashboard padding (`print:p-0`) from the `<main>` wrapper so the invoice can stretch flush to the paper margins. 

The invoice now reliably prints as a beautiful, standalone document on all browsers.

## 12. UI and Invoice Refinements

Based on recent testing, several key enhancements were made to improve usability and professionalism.

**Tax Automation:**
- Removed the manual tax input from `CreateOrder.jsx` and `EditOrder.jsx`.
- Replaced it with a `useMemo` hook that automatically calculates a flat **12% tax** based on the dynamic subtotal.
- This guarantees tax is consistently calculated and stored on the backend, appearing accurately across all order views.

**UI Spacing Improvements:**
- Increased the vertical padding (`py-2.5 px-3`) across all input fields, textareas, and dropdowns within the order forms.
- This creates a cleaner, less cramped form layout and significantly improves hit targets on touch devices.

**Invoice Polish:**
- Removed the internal `Status` badge from the printable invoice. Customers do not need to see "In Processed".
- Replaced it with a standard `Due: On Receipt` text line.
- Updated the company placeholder information below the logo to reflect the real GST number, Surrey address, and contact information.

## 13. Issues/Fixes

- **Empty State Fix:** The empty state placeholder on `Orders.jsx` had a placeholder `handleAction('Create Order')` click handler. It has now been wired to properly navigate to `/orders/create`.
- **Placeholder Fix:** The "View Order" eye icon on `Orders.jsx` was also unlinked. It now routes to the Invoice page as the primary read-only view.
