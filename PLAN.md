# Plan: Remove Guest Checkout + Add Auth Modal + Google OAuth

## Context

The system currently allows guests to place orders via an OTP phone-verification flow that issues a short-lived `GUEST` JWT. The goal is to **require authentication for all purchasing** (add-to-cart and checkout), and to **add Google Identity Services** (one-tap sign-in) to make registration/login frictionless.

## Scope

### In Scope
1. Remove the guest OTP checkout flow (frontend + backend)
2. Gate all "Add to Cart" actions behind authentication
3. Build a reusable `AuthModal` (login/register/Google) shown when unauthenticated users try to add to cart
4. Implement Google Identity Services (GIS) on both the modal and the existing `/login` page
5. Database migration for OAuth columns (`auth_provider`, `auth_provider_id`) on `users`
6. Backend `POST /auth/google` endpoint to verify Google ID tokens and issue JWTs

### Out of Scope
- Facebook/Apple OAuth (decorative buttons stay removed or are hidden)
- Staff Google login (staff use invitation flow only)
- Server-side cart persistence

---

## Phase 1 — Database Migration

**File:** `backend/src/database/migrations/020_oauth_provider_columns.sql`

Add nullable columns to `users`:
```sql
ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20) DEFAULT 'local';
ALTER TABLE users ADD COLUMN auth_provider_id VARCHAR(255);
CREATE INDEX idx_users_auth_provider ON users(auth_provider, auth_provider_id);
```
Make `password_hash` nullable (OAuth users won't have one):
```sql
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
```

---

## Phase 2 — Backend: Google Auth Endpoint

### 2a. Add `GOOGLE_CLIENT_ID` to env config
**File:** `backend/src/config/env.js`
- Add `GOOGLE_CLIENT_ID: optional('GOOGLE_CLIENT_ID', '')` to the `env` export

### 2b. Install `google-auth-library`
**File:** `backend/package.json`
- `npm install google-auth-library`

### 2c. Add Google token verification + login/register logic
**File:** `backend/src/modules/auth/auth.service.js`
- New export: `googleSignIn(idToken, ipAddress, userAgent)`
  - Uses `OAuth2Client.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID })`
  - Extracts `email`, `sub` (Google ID), `given_name`, `family_name`, `picture`
  - Looks up user by `email`:
    - **Exists + `auth_provider='local'`**: Link Google (set `auth_provider='google'`, `auth_provider_id=sub`), issue tokens
    - **Exists + `auth_provider='google'`**: Just issue tokens
    - **Doesn't exist**: Create user (`password_hash=null`, `auth_provider='google'`, `auth_provider_id=sub`), create patient profile, issue tokens
  - Returns `{ user, accessToken, refreshToken }` (same shape as `login`)

### 2d. Add repository helpers
**File:** `backend/src/modules/auth/auth.repository.js`
- `findByProvider(provider, providerId)` — query by `auth_provider` + `auth_provider_id`
- `linkGoogleAuth(userId, providerId)` — update `auth_provider` and `auth_provider_id`

### 2e. Add validation schema
**File:** `backend/src/modules/auth/auth.validation.js`
- New `googleSignInSchema`: `{ idToken: z.string().min(1) }`

### 2f. Add route
**File:** `backend/src/modules/auth/auth.routes.js`
- `router.post('/google', authLimiter, validate(googleSignInSchema), authController.googleSignIn)`

### 2g. Add controller
**File:** `backend/src/modules/auth/auth.controller.js`
- New `googleSignIn` handler calling `authService.googleSignIn()`

---

## Phase 3 — Remove Guest Checkout

### 3a. Remove guest token from API interceptor
**File:** `frontend/src/lib/api.js`
- Line 60: Remove the `|| localStorage.getItem('guestAccessToken')` fallback
- Line 93: Remove `localStorage.removeItem('guestAccessToken')`
- Lines 58-61: Simplify to just use `sessionKeys()` for public workspace

### 3b. Rewrite CheckoutPage
**File:** `frontend/src/features/shop/CheckoutPage.jsx`
- Remove the `phone` and `otp` steps entirely
- Remove all OTP-related state, API calls, and `guestAccessToken` logic
- Require patient auth — check `usePatientAuthStore().isAuthenticated`; if not, redirect to `/login?redirect=/checkout`
- Keep only the `details` step (fulfilment method, delivery address, prescription upload, consent, submit)
- Use `patientAccessToken` for order submission (already handled by the interceptor for non-public workspaces, but the checkout page is on a public route, so we need to explicitly attach the patient token or redirect the user to login first)

### 3c. Guard CartPage checkout link
**File:** `frontend/src/features/shop/CartPage.jsx`
- "Continue to checkout" button should check patient auth; if not authenticated, open auth modal or redirect to `/login?redirect=/checkout`

### 3d. Remove OTP-related backend routes (optional cleanup)
**Files:** `backend/src/modules/orders/orders.routes.js`, `orders.service.js`
- The `/otp/request` and `/otp/verify` routes can remain but mark as deprecated, or remove if no other consumer. Since they're only used for guest checkout, removing them is cleanest.

---

## Phase 4 — Auth Modal Component

### 4a. Create modal state store
**File:** `frontend/src/stores/authModalStore.js` (new)
```js
import { create } from 'zustand'
export const useAuthModalStore = create((set) => ({
  open: false,
  view: 'login',        // 'login' | 'register'
  redirectPath: null,
  openModal: (view = 'login', redirectPath = null) => set({ open: true, view, redirectPath }),
  closeModal: () => set({ open: false }),
  setView: (view) => set({ view }),
}))
```

### 4b. Create AuthModal component
**File:** `frontend/src/components/auth/AuthModal.jsx` (new)
- Uses `Dialog` from `@/components/ui/dialog`
- Two views: **Login** and **Register** (toggled via `authModalStore.view`)
- Login view: email + password fields + "Continue with Google" button + "Forgot password?" link + link to switch to register
- Register view: full name + email + password + confirm password + phone + "Continue with Google" button + link to switch to login
- Google button: renders Google Identity Services `data-callback` button
- On successful auth: calls `patientAuthStore.setSession()`, closes modal, navigates to `redirectPath` if set
- Reuses existing form validation (zod schemas from `auth.validation.js` patterns)

### 4c. Create GoogleSignInButton component
**File:** `frontend/src/components/auth/GoogleSignInButton.jsx` (new)
- Loads Google Identity Services script (`https://accounts.google.com/gsi/client`) via `useEffect`
- Renders a styled button that triggers `google.accounts.id.prompt()` or handles the callback
- `data-callback` prop receives the Google JWT, which is sent to `POST /auth/google`
- On success: stores tokens via `patientAuthStore`, closes modal

### 4d. Mount AuthModal globally
**File:** `frontend/src/App.jsx`
- Render `<AuthModal />` inside the top-level layout (next to `<Suspense>`) so it's available everywhere

### 4e. Gate "Add to Cart" behind auth
**Files to modify:**
- `frontend/src/features/shop/MedicineDetailsPage.jsx` (line 96-103, `act` function)
- `frontend/src/features/search/pages/SearchPage.jsx` (line 462, `onAdd` callback)
- `frontend/src/features/shop/PrescriptionRequestPage.jsx` (add-to-cart action)

Pattern in each:
```js
const { isAuthenticated } = usePatientAuthStore()
const openModal = useAuthModalStore(s => s.openModal)

// In the add-to-cart handler:
if (!isAuthenticated) {
  openModal('login', window.location.pathname)
  return
}
// ... existing logic
```

---

## Phase 5 — Wire Google OAuth into LoginPage

### 5a. Update LoginPage social buttons
**File:** `frontend/src/features/auth/pages/LoginPage.jsx`
- Replace the three decorative social buttons (lines 272-309) with a single "Continue with Google" button
- Wire it to the same `GoogleSignInButton` component
- On success, redirect based on role (patient → `/patient`, staff → `/app`)

---

## Phase 6 — Env & Config

### 6a. Backend `.env.example`
Add:
```
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### 6b. Frontend `.env`
Add:
```
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```
(Google Identity Services runs client-side, so the client ID is embedded in the frontend)

---

## Files to Create (New)
| File | Purpose |
|------|---------|
| `backend/src/database/migrations/020_oauth_provider_columns.sql` | DB migration |
| `frontend/src/stores/authModalStore.js` | Modal state |
| `frontend/src/components/auth/AuthModal.jsx` | Login/Register modal |
| `frontend/src/components/auth/GoogleSignInButton.jsx` | Google GIS button |

## Files to Modify (Existing)
| File | Change |
|------|--------|
| `backend/src/config/env.js` | Add `GOOGLE_CLIENT_ID` |
| `backend/package.json` | Add `google-auth-library` |
| `backend/src/modules/auth/auth.service.js` | Add `googleSignIn()` |
| `backend/src/modules/auth/auth.repository.js` | Add `findByProvider()`, `linkGoogleAuth()` |
| `backend/src/modules/auth/auth.validation.js` | Add `googleSignInSchema` |
| `backend/src/modules/auth/auth.routes.js` | Add `POST /google` |
| `backend/src/modules/auth/auth.controller.js` | Add `googleSignIn` handler |
| `frontend/src/lib/api.js` | Remove guest token fallback |
| `frontend/src/features/shop/CheckoutPage.jsx` | Remove OTP flow, require auth |
| `frontend/src/features/shop/MedicineDetailsPage.jsx` | Gate add-to-cart |
| `frontend/src/features/search/pages/SearchPage.jsx` | Gate add-to-cart |
| `frontend/src/features/shop/PrescriptionRequestPage.jsx` | Gate add-to-cart |
| `frontend/src/features/auth/pages/LoginPage.jsx` | Replace social buttons with Google |
| `frontend/src/App.jsx` | Mount AuthModal |

---

## Verification

1. **DB migration**: Run `npm run migrate` — confirm columns added, `password_hash` nullable
2. **Backend**: Test `POST /auth/google` with a valid Google ID token → returns `{ user, accessToken, refreshToken }`
3. **Frontend — Add to cart as guest**: Click "Add to cart" on `/medicines/:id` while logged out → auth modal appears; login → item added
4. **Frontend — Google sign-in**: Click "Continue with Google" in modal or `/login` → Google account picker → user created/logged in → modal closes
5. **Frontend — Checkout**: Visit `/checkout` while logged out → redirect to `/login?redirect=/checkout`; after login → redirected back to checkout
6. **Frontend — Existing auth still works**: Email/password login on `/login` still works for both patients and staff
7. **Lint/typecheck**: Run frontend lint (`npm run lint` if available) and backend lint
