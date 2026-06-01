# Module 17: Order/Quotation Data Structure Expansion

## Objective
This module prepares the database schemas for a larger workflow redesign by expanding `Order` and `Quotation` line items to natively store door-specific configuration data without modifying the existing UI.

## Existing Structure Analyzed
- `Order.js` and `Quotation.js` models contained line items representing `product`, `quantity`, `unitPrice`, and `lineTotal`.
- Operations handling product bundle deductions inside `orderController.js` rely strictly on iterating through `item.quantity` and `product.bundles`.

## New Fields Added
Both `orderItemSchema` and `quotationItemSchema` have been augmented with the following strictly optional fields:
- `location` (String)
- `size` (String)
- `jamb` (String)
- `leftHand` (Number - stores numerical quantity of left hand instances)
- `rightHand` (Number - stores numerical quantity of right hand instances)
- `description` (String)

## Files Modified
1. `server/models/Order.js` - Appended optional fields to `orderItemSchema`.
2. `server/models/Quotation.js` - Appended optional fields to `quotationItemSchema`.
3. `server/controllers/quotationController.js` - Updated the `convertToOrder` line item mapping logic to gracefully pass the new structural fields from a Quotation into an active Order during conversion.

## Backward Compatibility Approach
- **Optional Attributes:** None of the new fields utilize `required: true`. 
- **Legacy Integrity:** Existing legacy records will seamlessly pull from the database without these properties, maintaining perfect compatibility with the current frontend.
- **Bundle Logic Preservation:** The inventory deduction logic (`getAggregatedStockMap` in `orderController.js`) remains totally untouched. It will successfully execute for old and new records equally.
- **Seamless API Overload:** Express passes `req.body` sequentially to Mongoose; since the schemas are now updated, incoming API JSON requests with these fields are safely swallowed and saved, making the backend completely ready for future frontend iterations.

## Testing Performed
- Mongoose schema compilation and server process start verification confirmed successful execution.
- API Route mapping logic analysis confirms the data flows securely from the Quotation DTO object into the Order schema during conversion.
