# Module 14: Branding & Profile System

## 1. Files Created
* `client/src/pages/Profile.jsx`
* `Fixes13.md` (Created earlier)

## 2. Files Modified
* `server/controllers/authController.js`
* `server/routes/authRoutes.js`
* `client/src/services/authService.js`
* `client/src/context/AuthContext.jsx`
* `client/src/index.css`
* `client/src/App.jsx`
* `client/src/components/Sidebar.jsx`
* `client/src/components/Header.jsx`
* `client/src/pages/Dashboard.jsx` (Checked and preserved mapping)
* `client/src/pages/Categories.jsx` (Brand pass)
* `client/src/pages/Products.jsx` (Brand pass)
* `client/src/pages/Orders.jsx` (Brand pass)
* `client/src/pages/CreateOrder.jsx` (Brand pass)
* `client/src/pages/EditOrder.jsx` (Brand pass)
* `client/src/components/CategoryModal.jsx` (Brand pass)
* `client/src/components/ProductModal.jsx` (Brand pass)
* `client/src/pages/Login.jsx` (Brand pass)

## 3. Color Palette Explanation
We evaluated the primary colors from `logo-new.png` using an automated pixel-extraction script. The logo fundamentally relies on pitch black (`#000000`) and a highly saturated pure red (`#fa0000`). 
To ensure a **Professional Admin Dashboard**, applying pure `#fa0000` to buttons and backgrounds would cause massive visual fatigue. Instead, we developed a Custom Tailwind Theme using a polished, professional crimson (`#dc2626` / `brand-600`) as the primary accent, supported by lighter and darker shades for hover effects (`#b91c1c` / `brand-700`) and focus rings. 

## 4. Branding Decisions
* **Primary Actions:** Swapped default Tailwind Blues for the new Brand Crimson (`bg-brand-600`) to anchor the identity.
* **Secondary/Status Elements:** Left critical status semantic colors (Green for complete, Gray for draft) intact so the software remains intuitive and functional.
* **Backgrounds:** Retained clean white and off-white/gray backgrounds to maintain high contrast and readability.

## 5. Profile System Explanation
The `Profile.jsx` page has been introduced to give users control over their account data. It splits into two robust forms:
* **Account Information:** Allows the user to update their Name and Email. The React `AuthContext` features a new `updateUser` function so the UI seamlessly updates (like the new Profile Dropdown) without forcing a hard refresh or login state reset.

## 6. Password Update Logic
* Added `PUT /api/auth/password` in the backend. 
* It securely fetches the user (forcing the `+password` field selection).
* It immediately validates the user's input against their `currentPassword` using `bcrypt` comparison.
* If successful, the new password overrides the old one and triggers the pre-save hook on the `User` schema, correctly hashing the updated password.
* The frontend enforces a minimum 6 character limit and ensures the "New Password" and "Confirm Password" fields are identical before querying the server.

## 7. Logo Integration
* Added the `logo-new.png` file directly into `Sidebar.jsx`. 
* Used `object-contain` and specific height constraints (`h-8 w-auto`) so the logo scales cleanly regardless of desktop or mobile responsive behaviors, preserving its aspect ratio natively.

## 8. UI Consistency Checks
* Ran an extensive search-and-replace to strip generic `blue-600` tags and replace them with `brand-600` across buttons, focus rings, hover states, and shadows.
* Verified that inputs and dropdowns share the new crimson focus rings natively.

## 9. Responsive Checks
* Confirmed the new Header Profile Dropdown remains accessible and cleanly positioned on mobile devices.
* The table adjustments from the previous pass work excellently with the new styling.

## 10. Any Issues Fixed
* Replaced text "Super Admin" header which was statically placed previously. The application now uses accurate React Context to display the dynamic user name, user role, and first-initial avatar.

## 11. Remaining Recommendations
* Currently, users can edit their profile and password. As the next critical step (per `PROJECT_RULES.md`), we should implement the **Users Management Module**, enabling the `super_admin` to create, deactivate, and manage access levels for cashiers and store managers.
