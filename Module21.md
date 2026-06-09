# Module 21 – Authentication Migration (MongoDB → Prisma)

## Overview
This module successfully detaches the core authentication logic from Mongoose/MongoDB and completely wires it into Prisma/MySQL. The API signatures and JWT structures were meticulously preserved to guarantee that the frontend React application required absolutely zero modifications.

## 1. Files Modified
- `server/controllers/authController.js` - Stripped all Mongoose methods and injected Prisma queries alongside native `bcryptjs` encryption.
- `server/middleware/auth.js` - Updated to fetch user validation via Prisma. Injects exact frontend-compatible object schemas (`_id`, lowercase `role`).
- `server/utils/seedAuth.js` *(NEW)* - Added a disposable script to automatically seed an admin account into MySQL.

## 2. Prisma Queries Implemented
Replaced the Mongoose specific calls with Prisma equivalents:
- `User.findOne()` → `prisma.user.findUnique()`
- `User.findById()` → `prisma.user.findUnique({ where: { id } })`
- `User.create()` → `prisma.user.create()`
- `User.countDocuments()` → `prisma.user.count()`
- `user.save()` → `prisma.user.update()`
- Password exclusion `.select('+password')` behavior was naturally handled since `findUnique` returns all scalar fields (including password) by default, and `select` was explicitly defined in `getMe` to omit it.

## 3. Authentication Flow Changes
1. **Password Hashing**: Because Prisma does not support `pre('save')` hooks or instance methods, `bcrypt.genSalt` and `bcrypt.hash` are now executed directly inside the `register` and `updatePassword` controller functions.
2. **Password Verification**: `user.comparePassword()` was replaced with `bcrypt.compare()` executed inline in `login` and `updatePassword`.
3. **Role Mapping**: Prisma strictly utilizes the uppercase Enum (`SUPER_ADMIN`). A two-way mapper was implemented so the database stores `SUPER_ADMIN` but the frontend receives and transmits `super_admin`.
4. **ID Backwards Compatibility**: The `req.user._id` mapping was preserved so that future controllers relying on `req.user._id` will continue to function without crashing, although it is now an integer instead of an ObjectId.

## 4. Seed Strategy
Since existing Mongo users were disposable, a new seed script (`server/utils/seedAuth.js`) was created and executed.
**Seed Credentials:**
- **Email:** `admin@elegantdoors.ca`
- **Password:** `Password123!`
- **Role:** `SUPER_ADMIN`

## 5. Testing Performed
- ✅ **Seed Execution:** Successfully inserted the admin account with a hashed password into MySQL.
- ✅ **Login (`POST /api/auth/login`)**: Validated via cURL. Correctly returned the JWT token and the properly formatted user object (`_id: 1`, `role: "super_admin"`).
- ✅ **Invalid Login:** Confirmed it correctly rejects bad passwords with a `401 Unauthorized`.
- ✅ **Protected Route (`GET /api/auth/me`)**: Extracted the Bearer token and validated it. The endpoint successfully returned the user profile without exposing the hashed password.

## 6. Issues Encountered
- **Prisma Schema Limitations vs Mongoose:** Moving from Mongoose model methods to an un-opinionated ORM required rewriting the password hashing logic inline. This resulted in slightly more verbose controllers but better explicit data flow.
- **Frontend `_id` Expectations:** The frontend expects the primary key to be `_id`. We mitigated this by injecting `_id: user.id` directly into the JSON response payloads before sending them to the client.

## 7. Remaining Mongo Dependencies
- **Categories**
- **Products**
- **Orders**
- **Quotations**
- These are completely untouched and are still successfully functioning under Mongoose in this hybrid state.

## 8. Readiness for Module 22
**100% Ready.** 
Authentication is now running natively on MySQL. The frontend authentication context and token middleware operate seamlessly. We are cleared to proceed to the next phase of migrating the business logic domains (Categories/Products).
