# Urumuli Pharmacy System — Progress Report
*Generated: September 1, 2026 · Rwanda-focused (RWF / +250 / EN-RW-FR)*

> This is a living tracking document. It combines what is **verified built**, what is **still open**, and **industry-backed feature suggestions** for a 2026 pharmacy system. The source of truth is the code in this repo (by design, `FRONTEND_REPORT.md` and `ORDERING_WORKFLOW.md` are kept as historical/spec docs and can drift).

---

## 1. What's Verified Built

### Architecture
Four services + Postgres/Redis via `docker-compose.yml`:
- **Backend** — Node/Express modular monolith
- **Admin frontend** — React/Vite
- **Public site (SEO)** — Next.js (shell only)
- **Analytics microservice** — standalone queue consumer

### Backend — 29 modules, all functional
Every module follows `repository → service → controller → routes`. No empty stubs. Most substantial: `auth`, `sales`, `inventory`, `pharmacy`, `prescription`, `orders`.

| Area | Detail |
|---|---|
| **Auth** | JWT access/refresh, RBAC (5+ roles), password reset, OTP, invitations, license verification |
| **Inventory** | medicines/products, batches, suppliers, categories, stock movements, FEFO, expiry monitoring (**recently upgraded to Postgres full-text search** — migration 018) |
| **Sales/POS** | checkout, PDF receipts, void/refund with stock restoration |
| **Prescriptions** | upload → review → approve/reject → dispense lifecycle |
| **Orders** | distinct medicine-ordering workflow with `orderState.js` state machine + inventory reservations |
| **Safety** | drug interactions, allergies, contraindications |
| **Advanced (migration 017)** | dispensing, delivery, operating hours, consents, refills, insurance, controlled substances, transfers, adherence, feedback, telehealth, regulatory reports, reorder suggestions, translations (EN/RW/FR) |

### Data
- **19 SQL migrations**, latest `019_staff_two_factor.sql`
- Full-text search: `search_vector tsvector` + GIN index + trigger; relevance-ranked via `ts_rank_cd`; `/api/v1/search` and `/api/v1/search/autocomplete`

### Frontend — 66 routes
Public shop (landing, catalog, cart, checkout, order tracking), auth, a full **patient portal** (dashboard, messages, prescriptions, orders, refills, delivery, consent, settings), and a staff app (POS, inventory, prescriptions, analytics, search, drug checker, audit, admin, controlled-substances, transfers, telehealth, regulatory reports).

### Tests, CI, Env
- **163 unit tests** (`node --test`) across orderState, pharmacyManagement, professionalVerification, totp
- **E2E smoke script** exists (`backend/scripts/e2e-smoke.mjs`) — now wired as `npm run e2e:smoke` (needs a dev DB running)
- **CI added**: `.github/workflows/ci.yml` (backend lint+test, frontend build) on push/PR to `main`
- **Env templates**: all four services now have `.env.example`

---

## 2. What's NOT Done Yet

### 2a. Documented-but-missing (from `ORDERING_WORKFLOW.md` production checklist)
| Item | Status |
|---|---|
| Real payment provider | **dev-only** · `PAYMENT_PROVIDER=development`, no gateway adapter |
| Real SMS/OTP provider | **partially done** · `OTP_PROVIDER=development`; `SMS_PROVIDER` now supports `africastalking` + `twilio` adapters (mock in dev) |
| Private uploads on encrypted storage | Files under `UPLOAD_DIR/prescriptions`, local disk, no malware scan/retention job |
| Scheduled reservation-expiry worker | Reservations exist with `expires_at`; **Bull repeatable expiry/refill/low-stock workers added** (reservation-expiry itself still manual) |
| Printer/label config | Label HTML hard-codes "URUMURI PHARMACY", 100mm×62mm |
| Penetration/privacy/backup testing | Backup/restore scripts added; **penetration/privacy testing still pending** |
| Regulatory sign-off | Requires licensed pharmacist + Rwandan regulators before production |

### 2b. Feature gaps (verified against code)
| Feature | Status | Note |
|---|---|---|
| **Barcode scanning at POS/receiving** | ✅ | `GET /inventory/medicines/barcode/:code` + POS USB-scanner key capture in `PosDialog.jsx` |
| **Staff 2FA / MFA** | ✅ | TOTP (RFC 6238) + backup codes, migration 019, `/auth/2fa/*` + login-challenge flow |
| **Multi-branch (one org)** | ❌ | Multi-*pharmacy* orgs exist (migration 016); no `branches` table for one pharmacy |
| **Automatic backup/restore** | ✅ | `npm run backup` / `npm run restore` (pg_dump/psql, helpers in `backend/scripts/`) |
| **Insurer API integration** | ⚠️ | Insurance CRUD only — no real claims submission |
| **Refill automation scheduler** | ✅ | Bull repeatable job runs `processDueReminders()` daily (worker registered at boot) |
| **Low-stock / expiry push workers** | ✅ | Repeatable jobs run `runExpiryScan()` + low-stock suggestions → `LOW_STOCK_ALERT` notifications |
| **Public site (SEO)** | ⚠️ | Next.js shell only (~760 lines, a few pages) |
| **Landing/onboarding/polish** | ⚠️ | Landing exists but onboarding tour (Joyride) + a11y/performance pass not done |
| **Real search at scale** | ✅→ | Now Postgres FTS (exceeds prior ILIKE); Elasticsearch only if fuzzy/typo-tolerant-at-scale is required |

---

## 3. Recent Work Completed This Session
1. **Repo hygiene** — untracked 4 private prescription images from git; `.gitignore` now excludes `uploads/`; `frontend/.gitignore` covers `.env`.
2. **Env templates** — added `frontend`, `analytics-service`, `public-site` `.env.example`.
3. **Full-text search** — migration 018 + repository/service/controller/route changes + `/search/autocomplete`.
4. **CI/CD** — added `.github/workflows/ci.yml`.
5. **Docs** — fixed stale `FRONTEND_REPORT.md` (Elasticsearch claim, test counts, completed phases).

## 3b. Production-Hardening Features Added This Session
Implements the top recommendations from §5 below (wire barcode, real SMS provider, scheduled workers, staff 2FA, backup/restore):

1. **Barcode lookup API + POS scanner** — `GET /inventory/medicines/barcode/:code` (matches `barcode` or `sku`, inserted before `/:id`); `PosDialog.jsx` captures USB-scanner keyboard input (ignores manual text typing) and auto-adds the item with visual scan feedback.
2. **Real SMS provider adapter** — `sms.service.js` now selects provider by `SMS_PROVIDER` env: `development` logs, `africastalking` and `twilio` via `fetch`; added `sendExpiryAlertNotification` + `sendRefillReminder`. `SMS_PROVIDER` formalized in `env.js` + `.env.example`.
3. **Scheduled background workers** — `backend/src/workers/scheduled.js` registers Bull repeatable jobs (refills @ 08:00, expiry scan @ 07:00, low-stock every 6h) and wires them in `index.js` when Redis is healthy. Low-stock job generates reorder suggestions and emits `LOW_STOCK_ALERT` notifications to active staff.
4. **Staff 2FA (TOTP)** — migration `019_staff_two_factor.sql` (`two_factor_enabled/secret/backup_codes`); `totp.service.js` (RFC 6238, window=1, backup codes, sha-256 hashed); login now returns a `two-factor-challenge` temp token when 2FA is enabled; `/auth/verify-2fa`, `/auth/2fa/setup|verify|DELETE`; 8 TOTP unit tests added.
5. **Backup/restore scripts** — `npm run backup` / `npm run restore` (`.ps1` + `.sh`), pg_dump-based, auto-safety backup before restore, `backups/` output dir.

---

## 4. Industry Feature Suggestions (2026)

Pharmacy management software buyers in 2026 most value: **prescription processing, claims/insurance, and inventory/expiry tracking**, with **drug-interaction checking, barcode workflows, and audit trails** close behind. Ranked against what's already built:

### High-value, fits what exists (mostly wiring, not new architecture)
| # | Feature | Why / fit |
|---|---|---|
| 1 | **Barcode / QR scanning at POS + receiving** | ✅ done — barcode endpoint + POS USB-scanner key capture; camera QR input is a nice follow-on. |
| 2 | **Refill automation → scheduled reminders + re-order** | ✅ done — Bull job runs `processDueReminders()` daily. |
| 3 | **Low-stock / expiry push notifications** | ✅ done — repeatable jobs + `LOW_STOCK_ALERT` / expiry alerts to active staff. |
| 4 | **Search polish** | Already on Postgres FTS; add highlight snippets, prefix-matching autocomplete, and (optional later) Elasticsearch for fuzzy/symptom search at scale. |

### Medium-value, meaningful new work
| # | Feature | Why / fit |
|---|---|---|
| 5 | **Real insurance / mutuelle-de-santé claims** | Biggest gap vs commercial products (Rwanda context: RWF, +250, local insurers). Lay real submission on the existing `insurance_claims` CRUD. |
| 6 | **Multi-branch inventory & reporting** | Only if scaling beyond one location; needs a `branches` table + branch-aware stock/reporting schema change. |
| 7 | **Staff 2FA (TOTP/authenticator)** | ✅ done — migration 019 + `/auth/2fa/*`; TOTP + backup codes. |
| 8 | **Loyalty / patient rewards + payment plans** | Builds on existing customer/order tables; common retail differentiator. |

### Lower-urgency but expected at maturity
| # | Feature |
|---|---|
| 9 | PDMP-style controlled-substance reporting automation (schema + report exist) |
| 10 | Automated backup/restore + DR runbook — ✅ backup/restore scripts done; DR runbook + restore tests pending |
| 11 | Real payment gateway (mobile money — e.g. MTN MoMo / Africa's Talking) since Rwanda is heavily mobile-money-first |
| 12 | Expanded public/SEO site (more medicine detail pages, symptom search, i18n for EN/RW/FR) |

---

## 5. Recommended Next Move

Steps 1–5 below are now **implemented** (see §3b). Remaining hardening and commercial layers, in priority order:

1. ~~**Wire barcode scanning**~~ ✅ done
2. **Real mobile-money payment gateway** (e.g. MTN MoMo / Africa's Talking) — SMS + order-signing exist; the `PAYMENT_PROVIDER=development` adapter is the last transaction blocker for going live.
3. **Scheduled reservation-expiry worker** — expiry/refill/low-stock workers run, but order-reservation `expires_at` cleanup is still manual; add a repeatable Bull job for it.
4. **Penetration / privacy / backup-restore testing** — scripts exist; schedule restores and run an external audit (payloads, uploads retention, access logs).
5. Then layer **insurance claims submission** and **multi-branch** once core is hardened.
