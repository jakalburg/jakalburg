# Jakalburg Server — Working Notes

> Living document. I update this as I learn more about the reference project
> (`kaybykhushie`) and make decisions for the Jakalburg `server/` backend.
> Purpose: never lose context on what the reference does and why we chose to
> follow or diverge from it.

Last updated: 2026-08-16
Status: **FOUNDATION + AUTH LIVE. Schema pushed to Neon; auth + email flows smoke-tested & passing (see §11).**

---

## 0. The task (as I understand it)

- Build a `server/` backend for **Jakalburg**, in the **same style** as
  `kaybykhushie/server`, using **Prisma**.
- A PostgreSQL (Neon) `DATABASE_URL` has been placed in `/Jakalburg/.env`.
- Follow `auth.md` (full auth system) + the other rule docs.
- Reference = `kaybykhushie` (treat as source of truth; ask when it doesn't cover something — see `INSTRUCTIONS.md`).
- Keep this notes file updated.

### Governing rule docs (must obey)
- `INSTRUCTIONS.md` — follow `kaybykhushie` exactly; if a need isn't covered there, **STOP & ASK**. Don't guess, don't swap libraries/DB/structure.
- `kaybykhushie/instruction.md` — ask before acting; safe/minimal changes; ask before adding deps; never expose secrets.
- `auth.md` — the auth feature spec (email+password, OTP verify, Google, forgot/reset, sessions, protected routes). Emphasizes: **ask before execution**, inspect first.

---

## 1. Reference backend architecture (`kaybykhushie/server`)

**Stack:** NestJS 11 (Express adapter) + Prisma 6 + Passport-JWT + bcrypt + nodemailer/ejs + Cloudinary + Upstash Redis (optional) + Razorpay + Google Sheets sync. Serverless-ready (Vercel handler in `main.ts`).

**Key conventions:**
- `main.ts`: builds an `express()` app, caches it for serverless, `app.setGlobalPrefix('api')`, CORS from `FRONTEND_URL[_PROD]` (comma-split allow-list, `credentials: true`), request-id middleware, Swagger **only in dev** at `SWAGGER_PATH`. Runs `prismaService.checkAndCreateAdmin()` on boot. Exports a Vercel `handler`; falls back to `server.listen(PORT)` when not on Vercel.
- **Config:** custom singleton `src/config/env.ts` (a class with getters, `dotenv.config()` at top) — **NOT** `@nestjs/config`. Import `{ env }` everywhere.
- **Prisma:** `src/prisma/prisma.service.ts` extends `PrismaClient` (`onModuleInit`→`$connect`, `onModuleDestroy`→`$disconnect`), plus `checkAndCreateAdmin()`. Global-ish `PrismaModule`.
- **Schema is split & generated:**
  - `prisma/schema.header.prisma` — generator + datasource (`provider = "mongodb"`).
  - `prisma/models/*.prisma` — one model per file (~26 models).
  - `prisma/build-prisma-schema.js` — concatenates header + all models → `prisma/schema.prisma`.
  - Scripts: `prisma:build` → `prisma:generate` → `prisma generate`; `prisma:migrate` = `prisma db push` (no migration history — expected for Mongo).
- **Error handling:** global `AllExceptionsFilter` (`APP_FILTER`), `request-id.middleware.ts`, error-log sanitizer util.
- **Modules (~25):** auth, prisma, redis, storage, products, profiles, order, category, brand, collection, review, coupon, dashboard, settings, customers, notification, cart, wishlist, compare, pages, admin, website, contact, wallet, error-log.
- **Response style:** services throw Nest `*Exception`s; controllers return plain objects/DTOs.
- **DTOs/validation:** `class-validator` + `class-transformer` DTOs per module.
- **Deploy:** Vercel; `DATABASE_URL` in prod = **MongoDB Atlas** (per `DEPLOYMENT_ENV_VARS.md`).

---

## 2. Auth architecture (reference) — this is what `auth.md` maps to

**Modules/files:** `src/auth/{auth.module,auth.controller,auth.service}.ts`, `auth/otp/otp.service.ts`, `auth/strategies/jwt.strategy.ts`, `auth/guards/{jwt-auth,optional-jwt-auth,api-key,roles}.guard.ts`, `auth/dto/*`, `auth/decorators/roles.decorator.ts`, plus `src/email/*` and `src/settings/*`.

**Mechanism:** **stateless JWT** (Bearer token, `@nestjs/jwt`, secret `JWT_SECRET`, `expiresIn` from `AUTH_TOKEN_EXPIRY='30d'`). No server-side session store. `JwtStrategy` extracts from `Authorization: Bearer` OR cookie `admin_access_token`, then loads the full user (`accounts`+`profiles`) from DB. `AuthResponseDto = { user, accessToken }` returned to client; client stores/sends the token.

**Endpoints (`/api/auth`, whole controller behind `ApiKeyGuard` — currently a NO-OP pass-through):**
- `POST google/callback` — Google One Tap: verify credential → find-or-create user → JWT.
- `GET me` (JWT) — current user (sanitized via `buildUserResponse`).
- `POST logout` (JWT) — revokes Google token; JWT itself stays valid (stateless).
- `POST send-otp` / `POST verify-otp` — OTP login/verify → JWT.
- `POST register` — email+password signup (creates unverified user, `providers:["email"]`).
- `POST login-password` — email+password login (blocks if `!emailVerified`).
- `POST set-password` (JWT), `POST change-password` (JWT), `GET has-password` (JWT).
- `POST forgot-password` / `POST reset-password` — reset via emailed UUID token.

**User model (Mongo):** `providers String[]` array (`["email","google"]`), `password String?` (bcrypt, rounds=10), `emailVerified DateTime?`, `role` default `"user"`. One email = one `User`; `Account` rows link providers (`@@unique([provider, providerAccountId])`); `Profile` holds name/address.

**Google:** One Tap only (`google-auth-library` `verifyIdToken`), audience = OAuth client id **from `SettingsService.getOauthCredentials()` (DB Settings record)**, falls back to env `OAUTH_CLIENT_ID`. Verified Google email ⇒ auto email-verified + provider linked. No passport-google strategy / no redirect flow.

**Email:** `src/email/email.service.ts` = nodemailer + ejs templates in `src/email/templates/*.ejs` (`otp.ejs`, `reset-password.ejs`, `welcome.ejs`, ...). **SMTP creds come from the DB `Settings` record** via `SettingsService.getSmtpCredentials()`, not from env.

**⇒ Dependency chain:** faithful auth port needs `EmailModule` + `SettingsModule` (Settings model + service) because OAuth id & SMTP creds are read from the DB Settings record.

---

## 3. Reference OTP reality vs. what `auth.md` demands  ⚠️ GAP

`auth.md` §4/§13 wants a hardened OTP: `purpose` enum (SIGNUP_VERIFICATION / PASSWORD_RESET), **hashed** code, `attempts`/`maxAttempts`, `consumedAt`, resend cooldown, invalidate-previous-on-resend, one-time use.

**But the reference `Otp` model is minimal:**
```prisma
model Otp { id; email; code /* plaintext 6-digit */; expiresAt; verified Boolean; createdAt }
```
- `otp.service.ts`: 6-digit random, 10-min expiry, deletes prior OTPs for that email on send, single-use (`verified=true` then delete). **No** attempts limit, **no** cooldown, **no** purpose, **no** hashing.
- Password reset reuses the **same** `Otp` table with a `crypto.randomUUID()` "token", 1-hour expiry, generic response — **no attempts/purpose/hash** either.

So the reference does **NOT** satisfy `auth.md`'s security spec. This is a real fork → needs a user decision (see Open Decisions Q3).

---

## 4. Jakalburg current state

- `client/` = Next.js 15 storefront (Pages Router, React 19, Redux Toolkit, TanStack Query, radix/shadcn UI, `sonner` toasts, `react-hook-form`+`zod`, `input-otp`). Storefront pages: collection, product, cart, checkout, account. **No auth wired yet.**
- **No `server/` folder yet.** This is what we're creating.
- `/Jakalburg/.env` (root) has: `DATABASE_URL` = **PostgreSQL / Neon**, `CLOUDINARY_*`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
  - ⚠️ Env-var NAME mismatch: Jakalburg uses `GOOGLE_CLIENT_ID/SECRET`; kaybykhushie uses `OAUTH_CLIENT_ID/SECRET`.
  - ⚠️ No SMTP vars, no `JWT_SECRET`, no `ENCRYPTION_KEY`, no `ADMIN_*` yet.

---

## 5. Open decisions (BLOCKERS — asked user 2026-08-16)

| # | Decision | Reference says | Jakalburg setup says | My recommendation |
|---|---|---|---|---|
| Q1 | **DB provider** | MongoDB (`@db.ObjectId`, `_id`, `db push`) | PostgreSQL / Neon URL | **Postgres**, adapt Mongo-specific Prisma bits (IDs→`cuid()`, drop `@db.ObjectId`/`@db.String`, migrations). `String[]` & `Json?` port fine to PG. |
| Q2 | **Scope of first milestone** | full e-commerce backend | storefront needs auth first | **Foundation + Auth** first |
| Q3 | **OTP hardening** | minimal Otp model | `auth.md` wants hardened OTP | Follow **auth.md** (stronger), diverge from reference — but confirm |
| Q4 | **Email/SMTP delivery** | nodemailer, creds in DB Settings | no SMTP configured | Need provider + creds from user |

Other (defaulting unless told otherwise, recorded here):
- OAuth env naming: will map Jakalburg's `GOOGLE_CLIENT_ID/SECRET` into the server (either alias to `OAUTH_CLIENT_ID/SECRET` or read both). TBD after Q's.
- `server/.env`: kaybykhushie loads env from its own folder (`dotenv.config()` @ cwd). Plan: create `server/.env` (copy DB + Google + Cloudinary from root, add JWT/ENCRYPTION/ADMIN/SMTP).
- Redis (Upstash): optional caching — skip unless asked.
- Storage: Cloudinary creds present → use Cloudinary service like reference.

---

## 6. Decisions log (append as confirmed)

**2026-08-16 — user answers to Q1–Q4:**
- **Q1 DB → PostgreSQL (Neon).** Adapt Mongo-specific Prisma: IDs `@id @default(cuid())`, drop `@db.ObjectId`/`@db.String`, FK fields plain `String`, use real migrations (`prisma migrate`/`db push`). `String[]` (`providers`) and `Json?` (`addresses`) port fine to PG.
- **Q2 Scope → Foundation + Auth.** Build runnable Nest+Prisma skeleton, then full auth per `auth.md`.
- **Q3 OTP → Hardened (auth.md).** Diverge from reference's minimal `Otp`. New `Otp` model: `purpose` enum (`SIGNUP_VERIFICATION`|`PASSWORD_RESET`), **hashed** `codeHash`, `attempts`+`maxAttempts`, `expiresAt`, `consumedAt`, `lastSentAt` (resend cooldown), invalidate-previous-on-resend, single-use. Config via env `OTP_EXPIRY_MINUTES`/`OTP_MAX_ATTEMPTS`/`OTP_RESEND_COOLDOWN_SECONDS`.
- **Q4 Email → SMTP via env.** User added `SMTP_PASSWORD` to root `.env`; send **from `support@jakalburgcreation.com`**. App-password format ⇒ **Gmail/Google Workspace SMTP** (`smtp.gmail.com:587`, STARTTLS). Adapt `EmailService` to read SMTP from `env` (NOT DB Settings) ⇒ **no Settings model needed** for auth. Host/port env-overridable; assumed Gmail — flag to user to correct if their mail host differs.

**Derived decisions:**
- OAuth: read `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (Jakalburg naming) in `env.ts`, also accept `OAUTH_CLIENT_ID/SECRET` fallback. Google verification reads client id straight from `env` (no Settings).
- Google flow: keep reference's **One Tap** (`google-auth-library verifyIdToken`), no passport-google redirect.
- Rate limiting: `@nestjs/throttler` is in reference deps → add it, apply throttling on auth endpoints (login/otp) + enforce OTP attempts/cooldown at data layer.
- Skip for now: Redis/Upstash, ENCRYPTION_KEY/field-encryption, Settings/Cloudinary/Razorpay/wallet/etc. (not needed for foundation+auth).
- `server/.env` created from root `.env` (DB, Google, Cloudinary, SMTP_PASSWORD) + new: `JWT_SECRET`, `ADMIN_EMAIL/PASSWORD`, `SMTP_*`, `OTP_*`, `FRONTEND_URL`, `PORT`, `NODE_ENV`.

---

## 6b. Auth design for Jakalburg (final, hardened)

**JWT (stateless Bearer)** like reference, PLUS a `tokenVersion` on `User` embedded in the JWT payload and re-checked in `JwtStrategy` — incremented on password reset to invalidate old sessions (satisfies auth.md §8/§9).

**Models (Postgres):** `User` (lean — only auth relations: `accounts`, `profiles`; added `disabled Boolean`, `tokenVersion Int`), `Account`, `Profile`, `Otp` (hardened) + `enum OtpPurpose`. Omitted reference's e-commerce relations on User (orders/cart/etc.) — out of scope; note for when those modules are added.

**Hardened OTP service:** `generateOtp(email,purpose)` = cooldown guard (`OTP_RESEND_COOLDOWN_SECONDS`) → invalidate previous (email,purpose) → 6-digit random → **bcrypt `codeHash`** → store `expiresAt`/`attempts=0`/`maxAttempts`/`lastSentAt`. `verifyOtp` = newest non-consumed → expiry/attempts checks → bcrypt compare → on fail bump `attempts` (invalidate at max) → on success set `consumedAt` (single use). Code never logged/returned.

**Endpoints (`/api/auth`, behind no-op `ApiKeyGuard` for parity, throttled):**
`register` (→SIGNUP OTP) · `verify-email` {email,otp} (→verify+JWT) · `resend-otp` {email,purpose} · `login-password` (blocks unverified/disabled) · `google/callback` (One Tap) · `me`(JWT) · `logout`(JWT) · `forgot-password` (generic resp, →RESET OTP) · `reset-password` {email,otp,newPassword} (→verify+hash+bump tokenVersion) · `set-password`(JWT) · `change-password`(JWT) · `has-password`(JWT).

**Intentional enhancements over reference (required by auth.md):**
- Global `ValidationPipe({whitelist,transform})` in `main.ts` — reference didn't have one; auth.md §18 requires server-side input validation.
- `@nestjs/throttler` global guard + tighter `@Throttle` on login/otp/forgot (auth.md §17).
- OTP hardened (Q3) vs reference minimal.

**Intentional simplifications (out of scope for foundation):**
- `AllExceptionsFilter` keeps reference's response shape (`+requestId`) but DROPS the ErrorLog DB dependency (Nest Logger only). Re-add error-log module later if porting it.
- `EmailService` reads SMTP from `env` (not DB Settings); Settings/Cloudinary/Redis/wallet/etc. not ported.

## 7. Next actions (once unblocked)

1. Scaffold `server/` skeleton mirroring reference (package.json, tsconfig, nest-cli, config/env.ts, prisma split-schema + build script, PrismaService/Module, main.ts, AllExceptionsFilter, request-id middleware).
2. Create `server/.env` from root `.env` + required auth vars.
3. Port auth per Q2/Q3/Q4 decisions (User/Account/Profile/Otp models, auth module/controller/service, otp service, jwt strategy, guards, email service+templates, settings if needed).
4. `prisma generate` + push to Neon; run admin bootstrap.
5. Smoke-test each auth flow (register→OTP→login→me→forgot→reset→google).

---

## 8. BUILD STATUS (2026-08-16)

**DONE:**
- All ~41 Foundation+Auth files written. `npm install` OK (436 pkgs).
- `npm run prisma:generate` OK — Prisma Client v6.19.3 generated, split schema concatenated fine (Account, Otp, Profile, User).
- `npx nest build` → **exit 0, zero type errors.** `.ejs` templates copied to `dist/email/templates/`.

**Verified files compile & wire together:** env.ts, prisma.service/module, email.service/module (+otp.ejs, welcome.ejs), all-exceptions.filter, request-id.middleware, request-context.util, auth.constant, database.types, all DTOs, all guards, roles.decorator, jwt.strategy, otp.service, auth.service, auth.controller, auth.module, app.module, main.ts.

## 9. ⚠️ BLOCKER — cannot reach Neon DB from this machine (VPN)

`npm run prisma:migrate` (= `prisma db push`) fails with **P1001 "Can't reach database server"**.

**Root cause (diagnosed, NOT a code/schema/URL problem):**
- DNS for `ep-rough-mouse-azwnvl81.c-3.ap-southeast-1.aws.neon.tech` returns IPv6 (AAAA) first; machine has a VPN with an IPv6 **leak-protection** interface (`ipv6leakintrf0`) that null-routes IPv6 → Prisma's engine picks IPv6 → timeout.
- IPv4 A-records exist (52.76.108.241, 13.251.213.89, 52.76.128.157). Bare TCP SYN handshake to `:5432` completes, BUT a proper Postgres `SSLRequest` gets **no reply** (recv timeout) over BOTH IPv4 and IPv6 → the VPN completes the local handshake but black-holes real payload.
- Confirmed with a raw python SSLRequest probe: `RECV TIMEOUT`. So this is a **network/VPN egress problem**, not the server code.

**Fix is on the user's side — any ONE of:**
- Disconnect/reconfigure the VPN (or allow `*.neon.tech` / the 3 IPv4s above through it), then run `cd server && npm run prisma:migrate`.
- OR run the push from a network without the IPv6-leak-protection VPN.
- Schema + generate already succeed offline; only the `db push` (and later live smoke tests) need egress.

**Do NOT** "fix" this by editing code, the DATABASE_URL, or /etc/hosts — the code/URL are correct; it's purely reachability.

## 10. Auth smoke-test commands (run after DB push succeeds)

Server: `cd server && npm run start:dev` (listens on :8080, prefix `/api`).
```
# 1. register (sends signup OTP email to the address)
curl -sX POST localhost:8080/api/auth/register -H 'Content-Type: application/json' \
  -d '{"firstName":"Test","lastName":"User","email":"you@example.com","password":"secret123"}'
# 2. verify-email with the 6-digit code from the inbox  -> returns {user, accessToken}
curl -sX POST localhost:8080/api/auth/verify-email -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","otp":"123456"}'
# 3. login  -> {user, accessToken}
curl -sX POST localhost:8080/api/auth/login-password -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"secret123"}'
# 4. me (JWT)
curl -s localhost:8080/api/auth/me -H "Authorization: Bearer <accessToken>"
# 5. forgot -> reset (OTP purpose PASSWORD_RESET)
curl -sX POST localhost:8080/api/auth/forgot-password -H 'Content-Type: application/json' -d '{"email":"you@example.com"}'
curl -sX POST localhost:8080/api/auth/reset-password -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","otp":"123456","newPassword":"newsecret123"}'
```
NOTE: real emails send via support@jakalburgcreation.com (Gmail app password). Don't spam; use a real inbox you control.

---

## 11. SMOKE TEST RESULTS (2026-08-16, after VPN disconnect)

VPN disconnected → Neon reachable → `npm run prisma:migrate` **pushed the schema (Done in 9.42s)**. Server boots (`node dist/main.js`), all 12 `/api/auth` routes mapped, `checkAndCreateAdmin()` wrote the admin to Neon. All flows tested against the live DB:

| Check | Result |
|---|---|
| `me` without token | 401 ✅ |
| login wrong password | 401 generic "Invalid email or password" ✅ |
| register invalid body | 400 + class-validator messages (ValidationPipe live) ✅ |
| **admin login → JWT (247 chars) → `me` → `has-password` → logout** | all 200/201 ✅ |
| garbage token | 401 ✅ |
| register → user (unverified) + **bcrypt `$2b$10$` OTP hash** in DB | ✅ (raw code never stored) |
| wrong OTP → 400 + `attempts` 0→1 | ✅ |
| immediate resend → 429 cooldown "wait N seconds" | ✅ |
| forgot-password (unknown email) → generic message, no send | ✅ (anti-enumeration) |
| every error body carries `requestId` | ✅ (AllExceptionsFilter live) |

### SMTP resolution (was the only failure)
- First register 500'd: Gmail returned `535-5.7.8 BadCredentials`. Root cause: `SMTP_USER` was set to the vanity address `support@jakalburgcreation.com`, which is NOT a real mailbox.
- **Fix:** the app password `htddcmkasqmqkbqm` belongs to **`jakalmaacreation@gmail.com`**. Set `SMTP_USER=jakalmaacreation@gmail.com` (authenticate as the real Gmail) while keeping `SMTP_FROM_EMAIL=support@jakalburgcreation.com` (vanity From). `env.ts` already separates auth-user from from-address.
- After the fix: `transporter.verify()` → OK; register to `jakalmaacreation@gmail.com` → **201 + "Email sent successfully"** in the log. Email delivery confirmed.
- ⚠️ **Gmail From-rewrite caveat:** because `support@jakalburgcreation.com` is not a verified "Send mail as" alias in the jakalmaacreation@gmail.com account, Gmail will likely display the sender as `jakalmaacreation@gmail.com` (name "Jakalburg") regardless of `SMTP_FROM_EMAIL`. To make the vanity address actually stick, add + verify it as a Send-mail-as alias in that Gmail (needs access to receive the verification at support@…, which currently doesn't exist), or use a real domain mailbox/relay later.

### Full happy path — TESTED & PASSING ✅
- `verify-email` with the real code (587918, from the inbox) → 201, user `emailVerified` set, JWT (245 chars), OTP row `consumedAt` set (single-use), **Welcome email sent**. `login-password` then succeeds (was blocked while unverified). Every auth + email flow is now confirmed end-to-end against live Neon.

### Sender-email decision (2026-08-16)
- User confirmed the OTP email arrived, but Gmail displays the From as **`Jakalburg <jakalmaacreation@gmail.com>`**, not the vanity `support@…`. This is a hard Gmail rule: it rewrites From to the authenticated account unless the vanity address is a *verified* "Send mail as" alias (which needs the support@ mailbox to exist — it doesn't).
- **Decision: keep the Gmail sender for now (dev).** `SMTP_FROM_EMAIL` set to `jakalmaacreation@gmail.com` to match reality. To send from `support@jakalburgcreation.com` for real later: create that mailbox (Workspace) OR use a transactional service (Resend/SendGrid/SES/Brevo) with jakalburgcreation.com domain verification (SPF+DKIM), then point `SMTP_FROM_EMAIL` (or swap the transport) accordingly. **This is a pre-launch TODO.**
- Note: `jakalmaacreation@gmail.com` now exists as a real *verified* user row in Neon (from the send test) — harmless; delete if you want the store's user table clean.

### Housekeeping
- Background dev server may still be running (`node dist/main.js`, log at `/tmp/jakalburg-server.log`). Kill with `pkill -f 'node dist/main.js'`.
- A real user row for `jakalmaacreation@gmail.com` (unverified) now exists in Neon from the send test.

## 12. CLIENT AUTH WIRING (2026-08-16) — real auth replacing the mock ✅

Replaced the client's mock/localStorage-only auth with real calls to this backend. **No new npm dependency** — used plain `fetch` + the already-installed TanStack Query, `input-otp`, `sonner`, RHF+zod. Client typecheck (`tsc --noEmit`), `next lint`, and `next build` all pass (exit 0); all five auth pages prerender.

**New/changed files (in `client/`):**
- `src/lib/api-endpoints.ts` — path constants for the 12 `/api/auth/*` routes.
- `src/lib/api-client.ts` — `apiFetch<T>()` fetch wrapper. Base URL from `NEXT_PUBLIC_API_URL` (strips trailing `/` and `/api`). `getToken/setToken/clearToken` own the JWT (localStorage `auth_token`, raw string). Throws typed `ApiError{message,status,requestId}`; parses class-validator array messages; on authed 401 clears the token.
- `src/lib/auth-normalize.ts` — `normalizeUser(BackendUser)`: derives `name` from `profiles[0].firstName+lastName` (backend has no name column), falls back to email local-part.
- `src/redux/features/auth-slice.ts` — reworked: state `{user: AuthUser|null, token}`. Reducers `get_auth` (hydrate user from `auth_user` + token via `getToken()`), `set_credentials` (store both), `sign_in` (user-only update, kept for `account/profile.tsx`), `sign_out` (clears both + token). Selectors `selectAuthUser/selectAuthToken/selectIsAuthenticated`.
- `src/hooks/useAuth.ts` — TanStack mutations: `useRegister, useVerifyEmail, useLoginPassword, useGoogleLogin, useResendOtp, useForgotPassword, useResetPassword, useLogout`. Success handlers dispatch `set_credentials` + mirror name/email into the addresses `update_profile` (keeps checkout/profile prefill).
- `src/components/auth/GoogleOneTap.tsx` — GIS One Tap + rendered "Continue with Google" button. Polls `window.google` (200ms, 10s timeout), `initialize`+`renderButton`+`prompt` (single-prompt global guard), cleanup `cancel()`. On credential → `useGoogleLogin` → `POST /api/auth/google/callback {credential}` (backend verifies server-side, returns `{user,accessToken}`).
- `src/pages/_document.tsx` — added `<script src="https://accounts.google.com/gsi/client" async defer>` in `<Head>`.
- `src/pages/login.tsx` — real email+password login + Google button; unverified-login error (message matches `/verify/i`) routes to `/verify-email?email=`.
- `src/pages/signup.tsx` — first/last name + email + password(≥8) → `register` → `/verify-email?email=`; Google button.
- `src/pages/verify-email.tsx` (NEW) — 6-digit `input-otp`, `verify-email` → stores session → `/account`; resend (SIGNUP_VERIFICATION) with 60s cooldown.
- `src/pages/forgot-password.tsx` — email → `forgot-password` → `/reset-password?email=`.
- `src/pages/reset-password.tsx` (NEW) — OTP + new password(≥8) → `reset-password` → `/login`; resend (PASSWORD_RESET).
- `src/components/account/AccountShell.tsx` — sign-out now calls `useLogout` (hits `/api/auth/logout`) then redirects home.
- `client/.env` — added `NEXT_PUBLIC_API_URL=http://localhost:8080`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID=653042338025-...`. Created `client/.env.example`.

**Backend contract notes that shaped the client** (differ from the kaybykhushie reference):
- `ApiKeyGuard` is a **no-op** → the client sends **no `x-api-key`**.
- Verify endpoint is `verify-email` (not `verify-otp`); resend is `resend-otp` with a `purpose` enum (`SIGNUP_VERIFICATION`|`PASSWORD_RESET`).
- **Password reset is OTP-based**: `reset-password {email, otp, newPassword}` (NOT the reference's token link).
- `register` requires `firstName`+`lastName` (both non-empty) and password ≥8; it emails the OTP itself (no separate send-otp call).
- User response has no `name`; display name comes from `profiles[0]`.

**Live contract re-verified via curl (2026-08-16, VPN off, server on :8080):** `login-password` → 201 `{user{profiles[0].firstName/lastName}, accessToken}`; `me` (Bearer) → 200 `{user}`; `logout` (Bearer) → 201 `{message,success}`; `me` no-token → 401 `{message,statusCode,requestId}`. All shapes match `apiFetch`/`normalizeUser`.

**⚠️ Google One Tap — needs one config step before it works in a browser:** the client ID `653042338025-r750nsv7la84pedleofiva4g5417f4lm.apps.googleusercontent.com` must list **`http://localhost:3000`** under *Authorized JavaScript origins* in Google Cloud Console (and the prod origin later). Email/password/OTP flows need no such step. The Google button can only be exercised in a real browser, so it's the one leg not curl-tested.
