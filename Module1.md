# Elegant Doors POS — Project Structure

## Folder Structure

```
POS/
├── client/                          ← Frontend (React + Vite + Tailwind)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx           ← Top bar (user info, logout, mobile menu)
│   │   │   ├── Sidebar.jsx          ← Navigation sidebar (responsive)
│   │   │   └── ProtectedRoute.jsx   ← Auth guard for protected pages
│   │   ├── context/
│   │   │   └── AuthContext.jsx      ← Auth state (user, token, login/logout)
│   │   ├── layouts/
│   │   │   ├── MainLayout.jsx       ← Sidebar + Header + content area
│   │   │   └── AuthLayout.jsx       ← Centered card for login/register
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx        ← Home page (placeholder)
│   │   │   ├── Login.jsx            ← Login page (placeholder)
│   │   │   ├── Categories.jsx       ← Categories page (placeholder)
│   │   │   ├── Products.jsx         ← Products page (placeholder)
│   │   │   ├── Orders.jsx           ← Orders page (placeholder)
│   │   │   └── Users.jsx            ← Users page (placeholder)
│   │   ├── services/
│   │   │   └── api.js               ← Axios instance with interceptors
│   │   ├── App.jsx                  ← Root component with all routes
│   │   ├── main.jsx                 ← Entry point
│   │   └── index.css                ← Tailwind CSS import
│   ├── vite.config.js               ← Vite + Tailwind plugin + API proxy
│   └── package.json
│
├── server/                          ← Backend (Express + MongoDB)
│   ├── config/
│   │   └── db.js                    ← MongoDB connection
│   ├── controllers/                 ← Route handlers (added per feature)
│   ├── middleware/
│   │   ├── auth.js                  ← JWT auth middleware (placeholder)
│   │   └── errorHandler.js          ← Global error handler
│   ├── models/                      ← Mongoose schemas (added per feature)
│   ├── routes/                      ← Express routers (added per feature)
│   ├── utils/                       ← Helper functions
│   ├── server.js                    ← Express entry point
│   ├── .env                         ← Environment variables
│   └── package.json
│
└── .gitignore
```

---

## Tech Stack Installed

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend framework | React 19 | UI components |
| Build tool | Vite | Fast dev server & bundler |
| Styling | Tailwind CSS v4 | Utility-first CSS |
| Routing | React Router DOM | Client-side routing |
| HTTP client | Axios | API calls with interceptors |
| Icons | React Icons | Icon library |
| Notifications | React Hot Toast | Toast alerts |
| Backend | Express 5 | REST API server |
| Database | Mongoose | MongoDB ODM |
| Auth | jsonwebtoken + bcryptjs | JWT tokens + password hashing |
| Dev tool | Nodemon | Auto-restart on changes |

---

## Key Architecture Decisions

1. **Vite proxy** — `vite.config.js` proxies `/api` → `http://localhost:5000`, so the frontend calls `/api/*` without CORS issues in dev
2. **Axios interceptors** — auto-attaches JWT token and redirects on 401
3. **Auth context** — stores user + token in React context + localStorage for persistence across refreshes
4. **Two layouts** — `AuthLayout` (login pages) and `MainLayout` (sidebar + header shell)
5. **ProtectedRoute** — redirects to `/login` if no user; checks role if `roles` prop provided

---

## How to Run

### Backend
```bash
cd server
npm run dev          # starts on http://localhost:5000
```

### Frontend
```bash
cd client
npm run dev          # starts on http://localhost:5173
```

> [!IMPORTANT]
> MongoDB must be running locally on `mongodb://localhost:27017` before starting the backend. Update `server/.env` if your connection string differs.

---

## Next Steps

All pages are placeholders. We'll build feature-by-feature in this order:

1. **Authentication** — Login API, JWT, protect routes
2. **Dashboard** — Stats cards, recent activity
3. **Categories** — CRUD
4. **Products** — CRUD with category linking
5. **Orders** — Create/view/update orders
6. **Users** — User management (admin only)

Ready when you are — just say **"Let's build Authentication"** to start the first feature!
