# Authentication Module — Walkthrough

## What Was Built

A complete JWT-based authentication system for the Elegant Doors POS application, including:

- User registration and login APIs
- Password hashing with bcrypt
- JWT token generation and verification
- Role-based authorization (super_admin, admin, manager)
- Protected route middleware
- Frontend login page with form validation
- Persistent auth state with localStorage
- Token verification on app load
- Toast notifications for user feedback
- Database seed script for initial super_admin

---

## File-by-File Explanation

### Backend Files

#### `server/models/User.js`
Mongoose schema for the User collection. Fields: name, email, password, role, isActive.
- Password is hashed automatically before saving using a `pre('save')` hook with bcrypt
- Password field is excluded from queries by default (`select: false`)
- Includes a `comparePassword()` instance method for login verification
- Role is an enum: `super_admin`, `admin`, `manager`

#### `server/controllers/authController.js`
Contains three route handlers:
- **register** — Creates a new user. The first user in the database automatically becomes `super_admin`. Validates for duplicate emails. Returns user data + JWT token.
- **login** — Finds user by email, verifies password, checks if account is active, returns user data + JWT token.
- **getMe** — Returns the currently authenticated user's data (requires valid JWT).

#### `server/middleware/auth.js`
Two middleware functions:
- **protect** — Extracts JWT from `Authorization: Bearer <token>` header, verifies it, looks up the user, and attaches `req.user`. Returns 401 if token is missing/invalid.
- **authorize(...roles)** — Checks if `req.user.role` is in the allowed roles list. Returns 403 if not authorized.

#### `server/routes/authRoutes.js`
Express router with three endpoints:
- `POST /api/auth/register` — Public
- `POST /api/auth/login` — Public
- `GET /api/auth/me` — Protected (requires valid JWT)

#### `server/utils/seed.js`
Script to create the first super_admin user. Safe to run multiple times (skips if users already exist).
- Default credentials: `admin@elegantdoors.com` / `admin123`
- Run with: `npm run seed`

#### `server/server.js` (updated)
- Registered auth routes: `app.use('/api/auth', require('./routes/authRoutes'))`
- Updated CORS to allow requests from Vite dev server and tools like curl/Postman
- Port changed to 5001 (macOS AirPlay uses 5000)

#### `server/middleware/errorHandler.js`
Global error handler that catches unhandled errors and returns a consistent JSON response.

---

### Frontend Files

#### `client/src/services/authService.js`
API wrapper functions using the shared Axios instance:
- `loginUser(email, password)` — POST /api/auth/login
- `registerUser(userData)` — POST /api/auth/register
- `getMe()` — GET /api/auth/me

#### `client/src/services/api.js`
Shared Axios instance with:
- Base URL: `/api` (proxied to backend by Vite)
- Request interceptor: auto-attaches JWT token from localStorage
- Response interceptor: on 401, clears auth data and redirects to /login

#### `client/src/context/AuthContext.jsx`
React context providing auth state to the entire app:
- **State**: `user`, `token`, `loading`
- **Actions**: `login(userData, token)`, `logout()`
- **On mount**: Reads token from localStorage, then verifies it by calling `/api/auth/me`. If the token is expired or invalid, clears everything.

#### `client/src/pages/Login.jsx`
Full login page with:
- Email and password fields with icons
- Client-side validation (required, email format, min length)
- Show/hide password toggle
- Loading spinner on submit
- Error display under each field
- Toast notifications on success/error
- Glassmorphism card design on dark gradient background

#### `client/src/components/ProtectedRoute.jsx`
Route guard component:
- Shows loading spinner while auth is initializing
- Redirects to `/login` if no user is logged in
- Redirects to `/` if user's role isn't in the allowed `roles` list
- Renders children if authenticated and authorized

#### `client/src/components/Header.jsx`
Top header bar displaying user name, role, and logout button with toast notification.

---

## API Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/register` | Public | Register a new user |
| POST | `/api/auth/login` | Public | Login with email & password |
| GET | `/api/auth/me` | Protected | Get current user profile |
| GET | `/api/health` | Public | Health check |

### Request/Response Examples

**Login Request:**
```json
POST /api/auth/login
{
  "email": "admin@elegantdoors.com",
  "password": "admin123"
}
```

**Login Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "...",
      "name": "Super Admin",
      "email": "admin@elegantdoors.com",
      "role": "super_admin"
    },
    "token": "eyJhbGci..."
  }
}
```

---

## Authentication Flow

```
1. User opens app
   └─> AuthContext checks localStorage for saved token
       ├─> No token → redirect to /login
       └─> Token found → call GET /api/auth/me
           ├─> Valid → set user state, show dashboard
           └─> Invalid/expired → clear storage, redirect to /login

2. User submits login form
   └─> POST /api/auth/login with email + password
       ├─> Success → store token + user in localStorage & context → navigate to /
       └─> Error → show toast with error message

3. User clicks logout
   └─> Clear token + user from localStorage & context → navigate to /login

4. Any API call
   └─> Axios interceptor attaches "Authorization: Bearer <token>" header
       └─> If 401 response → clear auth, redirect to /login
```

---

## How Frontend Connects to Backend

1. **Vite Proxy** — `vite.config.js` proxies all `/api/*` requests to `http://localhost:5001`. This avoids CORS issues during development.

2. **Axios Instance** — `services/api.js` creates a shared Axios instance with base URL `/api`. All service files use this instance.

3. **Auth Interceptor** — The Axios request interceptor automatically reads the JWT from `localStorage` and attaches it as a `Bearer` token on every request.

4. **Service Functions** — `services/authService.js` exports simple functions (`loginUser`, `registerUser`, `getMe`) that call the API and return the response data.

---

## How to Run and Test

### 1. Start MongoDB
Make sure MongoDB is running locally on port 27017.

### 2. Seed the Database
```bash
cd server
npm run seed
```
This creates: `admin@elegantdoors.com` / `admin123` (super_admin)

### 3. Start the Backend
```bash
cd server
npm run dev
```
Server runs on http://localhost:5001

### 4. Start the Frontend
```bash
cd client
npm run dev
```
App runs on http://localhost:5173

### 5. Test Login
1. Open http://localhost:5173 — you'll be redirected to /login
2. Enter `admin@elegantdoors.com` and `admin123`
3. Click "Sign In"
4. You should see the dashboard with "Super Admin" in the header

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5001` | Server port |
| `MONGO_URI` | `mongodb://localhost:27017/pos_db` | MongoDB connection string |
| `JWT_SECRET` | `your_jwt_secret_change_this` | Secret key for JWT signing |
| `NODE_ENV` | `development` | Environment mode |

> **Important:** Change `JWT_SECRET` to a strong random string in production.

---

## Common Issues and Fixes

### Port 5000 is in use (macOS)
**Problem:** macOS Monterey+ uses port 5000 for AirPlay Receiver.
**Fix:** We use port 5001 instead. Already configured in `.env`.

### "next is not a function" error in Mongoose
**Problem:** Mongoose 9 changed how `pre('save')` hooks work with async functions — `next()` is no longer passed.
**Fix:** Use `async function()` without the `next` parameter. Just `return` to skip.

### Login returns 401 but credentials are correct
**Check:**
1. Did you run `npm run seed`?
2. Is MongoDB running?
3. Is the password at least 6 characters?

### Frontend shows blank page or CORS error
**Check:**
1. Is the backend running on port 5001?
2. Does `vite.config.js` proxy point to `http://localhost:5001`?
3. Restart both frontend and backend dev servers.

### Token expired
JWT tokens expire after 7 days. Log in again to get a new token.
