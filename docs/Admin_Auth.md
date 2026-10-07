# Admin Authentication Setup

This guide describes how Admin accounts work in Alterverse, how to register and elevate an Admin account via API/Database, and how authorization is enforced across backend and frontend.

---

## 1. Overview & Architecture

- **No Public Admin Registration:** The web frontend does not expose an Admin registration form. All accounts created via UI are assigned `role: "User"` by default.
- **Custom Role Architecture:** Rather than using the Better Auth `admin()` plugin (which demands extra tables/columns such as `banned`, `banReason`, and `impersonatedBy`), Alterverse uses a custom `role` column (`Role` enum / `string`) defined in Prisma on the `User` model.
- **Better Auth Config (`apps/backend/src/auth.ts`):**
  ```typescript
  user: {
      additionalFields: {
          role: {
              type: 'string',
              defaultValue: "User"
          }
      }
  }
  ```

---

## 2. Step-by-Step: Creating an Admin User

### Step 2.1: Register the Account via Postman / API Client

Send a `POST` request to the Better Auth signup endpoint:
- **URL:** `http://localhost:8080/api/auth/sign-up/email`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Body (JSON):**
  ```json
  {
    "email": "admin@alterverse.com",
    "password": "YourSecurePassword123",
    "name": "Super Admin"
  }
  ```

### Step 2.2: Elevate the User Role to `"Admin"` in the Database

1. Open your database via Prisma Studio:
   ```bash
   cd packages/db && bun prisma studio
   ```
   *Or access your Neon PostgreSQL console / psql client directly.*
2. Navigate to the `User` table.
3. Locate the user you just registered.
4. Update the `role` field value from `"User"` to `"Admin"`.
5. Save the changes.

---

## 3. Login & Automatic Redirection

When logging in through the web UI at `/login`:
- [`handleManualLogin` in `apps/web/src/pages/Auth.tsx`](file:///home/amnkarn/Devlopment/Projects/Alterverse/apps/web/src/pages/Auth.tsx) inspects `response.user.role`:
  - If `role === "Admin"`, the user is immediately redirected to **`/admin`**.
  - If `role === "User"`, the user is redirected to **`/app`**.

```typescript
// apps/web/src/pages/Auth.tsx
const response = await signin(payload);
if (response.user) {
    if (response.user.role === "Admin") {
        navigate("/admin");
    } else {
        navigate("/app");
    }
}
```

---

## 4. Frontend Protection (`RequireAdmin.tsx`)

Protected routes under `/admin/*` are wrapped by `RequireAdmin`:
- If unauthenticated, the user is redirected to `/login`.
- If authenticated but `role !== "Admin"`, the user is redirected away to `/app`.

```typescript
// apps/web/src/routes/RequireAdmin.tsx
export default function RequireAdmin() {
  const { data: session, isPending } = useSession();

  if (isPending) return <Loader />;
  if (!session) return <Navigate to="/login" replace />;

  if ((session?.user as any)?.role !== "Admin") {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}
```

---

## 5. Backend Protection (`isAdmin` Middleware)

All admin API endpoints in Express (maps, elements, avatars) use the `isAdmin` middleware:
- Inspects session cookies via `auth.api.getSession`.
- Verifies `session.user.role === "Admin"`.
- Returns `403 Forbidden` if the user is not an Admin.

```typescript
// apps/backend/src/middleware/isAdmin.ts
const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
});

const user = session?.user as typeof session.user & { role?: string };
if (user?.role !== "Admin") {
    return res.status(403).json({ message: "Admin access required" });
}
```
