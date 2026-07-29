# Module 26 – MongoDB Dependency Audit & Cleanup Plan

## Overview
This audit systematically identifies all remaining MongoDB and Mongoose dependencies within the application. The goal is to accurately trace why the server still establishes a MongoDB connection and outline the exact roadmap to safely purge all NoSQL architecture without breaking runtime functionality.

## 1. Remaining Mongo Imports & Files
The codebase still heavily references Mongoose in the following locations:

**Server Entry Points:**
- `server/server.js`: Imports and executes `connectDB()`.
- `server/api/index.js`: Imports and executes `connectDB()`.
- `server/config/db.js`: Contains the native `mongoose.connect()` connection string execution.

**Legacy Models (Unused but Present):**
- `server/models/Category.js`
- `server/models/Order.js`
- `server/models/Product.js`
- `server/models/Quotation.js`
- `server/models/User.js`

**Business Logic Files:**
- `server/controllers/dashboardController.js`: Fully dependent on Mongoose models to calculate `$sum` aggregates and `countDocuments`.
- `server/controllers/categoryController.js`: Imports `Product` to power a legacy hybrid delete protection.
- `server/controllers/productController.js`: Imports Mongoose and `Order` to power a legacy hybrid delete protection.

**Utility Scripts:**
- `server/utils/seed.js`
- `server/utils/reset-admin-password.js`
- `server/updatePassword.js`

## 2. Server Startup Analysis
The terminal log `"MongoDB connected: localhost"` occurs precisely because `server/server.js` executes `connectDB()` during startup. 

**Is Mongo startup still required?**
Currently, **YES**. If `connectDB()` is disabled, the dashboard API (`/api/dashboard/stats`) will crash immediately upon resolving its Mongoose `aggregate` calculations. We cannot disconnect Mongo until the Dashboard controller is rewritten in Prisma.

## 3. Package Analysis
`package.json` explicitly lists:
- `"mongoose": "^9.6.2"`

**Status:** Unsafe to remove. Removing Mongoose right now will throw `Cannot find module 'mongoose'` and crash the server on boot because `db.js` and the `models/` directory natively require it.

## 4. Prisma Coverage Verification
- Auth → **100% Prisma**
- Categories → **100% Prisma** (Needs minor cleanup of Mongo fallback)
- Products → **100% Prisma** (Needs minor cleanup of Mongo fallback)
- Quotations → **100% Prisma**
- Orders → **100% Prisma**
- Inventory → **100% Prisma**
- Dashboard → **0% Prisma (100% MongoDB)** 🔴

## 5. Risk Analysis & Deletion Candidates

**Safe to Delete/Refactor Immediately:**
- The Mongoose fallback code in `categoryController.js` and `productController.js` is entirely obsolete. Prisma relations natively block deletion of products/categories if they exist on a Prisma order.
- The utility scripts `seed.js`, `reset-admin-password.js`, and `updatePassword.js` are fully obsolete since authentication was migrated in Module 21.

**Unsafe to Delete (Require Refactoring First):**
- `server/controllers/dashboardController.js`: Requires a complete Prisma rewrite.
- `server/server.js` and `server/config/db.js`: Cannot be unhooked until the dashboard is rewritten.
- `server/models/*`: Cannot be deleted until the dashboard is rewritten.

## 6. Recommended Cleanup Sequence (Module 26A)
To achieve a completely zero-Mongo state, we must execute the following sequence:

1. **Phase 1: Controller Cleanup**
   - Strip legacy Mongo `try/catch` fallbacks from `categoryController.js` and `productController.js`.
2. **Phase 2: Dashboard Migration**
   - Rewrite `server/controllers/dashboardController.js` to use Prisma natively.
3. **Phase 3: Mongo Disconnect**
   - Remove `connectDB()` from `server.js` and `api/index.js`.
   - Delete `server/config/db.js`.
4. **Phase 4: Schema Purge**
   - Delete the entire `server/models/` directory.
   - Delete obsolete Mongo `utils` scripts.
5. **Phase 5: Package Purge**
   - Uninstall `mongoose` from `package.json`.
   - Run `npm install` to finalize lockfile.
