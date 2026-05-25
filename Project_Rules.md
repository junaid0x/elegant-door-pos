# PROJECT_RULES.md

# Elegant POS — Project Rules

## Tech Stack

Frontend:

* React
* Vite
* React Router
* Tailwind CSS

Backend:

* Node.js
* Express.js

Database:

* MongoDB
* Mongoose

Authentication:

* JWT Authentication

IMPORTANT:
Use JavaScript only.
Do NOT introduce TypeScript.

---

# Core Architecture Rules

* Keep code SIMPLE and maintainable
* Do NOT overengineer
* Do NOT introduce unnecessary abstractions
* Reuse existing patterns
* Reuse components whenever possible
* Maintain consistency across the entire project
* Keep folder structure organized
* Keep naming conventions consistent

---

# Frontend Rules

## UI Style

* Modern admin dashboard UI
* Professional appearance
* Clean spacing
* Soft shadows
* Responsive design
* Consistent button styles
* Consistent table styles
* Consistent modal styles

## Frontend Structure

Use existing project structure.

Important folders:

* components/
* pages/
* services/
* layouts/
* context/

## Frontend Patterns

* API calls go inside services/
* Reusable UI goes inside components/
* Pages should remain clean
* Use loading states
* Use toast notifications
* Use proper empty states
* Use responsive layouts

---

# Backend Rules

## Backend Structure

Use existing project structure.

Important folders:

* models/
* controllers/
* routes/
* middleware/

## Backend Patterns

* Use REST APIs
* Keep controllers clean
* Add validation
* Add proper error handling
* Protect routes with auth middleware
* Reuse middleware patterns
* Use async/await consistently

---

# Database Rules

* Use Mongoose schemas
* Keep schema naming consistent
* Use timestamps where appropriate
* Prevent duplicate records where necessary
* Validate required fields
* Keep relationships clean

---

# Existing Completed Modules

## Module 1

Project setup and architecture

## Module 2

Authentication system

* JWT auth
* login/logout
* protected routes
* role system

## Module 3

Dashboard module

* real MongoDB statistics
* inventory overview
* loading/error states
* responsive dashboard cards

## Module 4

Categories module

* full CRUD
* modal workflow
* protected APIs
* validation
* delete protection
* responsive table UI

---

# Workflow Rules

Before EVERY task:

1. Read all module walkthrough files
2. Analyze current codebase
3. Reuse existing architecture
4. Avoid conflicting patterns

For EVERY new module:

1. Analyze current structure first
2. Build backend first
3. Build frontend second
4. Connect APIs properly
5. Test fully
6. Update walkthrough documentation

---

# IMPORTANT RULES

* NEVER randomly rewrite working architecture
* NEVER duplicate logic unnecessarily
* NEVER create conflicting folder structures
* NEVER hardcode database-driven data
* NEVER remove existing functionality without reason
* ALWAYS maintain consistency
* ALWAYS preserve existing working features

---

# Documentation Rule

After EVERY completed task:

* Update walkthrough/module documentation
* Explain files created
* Explain files modified
* Explain API endpoints
* Explain testing steps
* Explain architecture decisions

---

# Current Development Strategy

We are building the POS system MODULE BY MODULE.

Current priority order:

1. Authentication ✅
2. Dashboard ✅
3. Categories ✅
4. Products ⏳
5. Orders
6. Users

Do NOT skip architecture consistency while building future modules.
