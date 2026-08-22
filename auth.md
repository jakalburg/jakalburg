# Authentication Implementation Guide

## Purpose

Implement the complete authentication system for this project using the existing project architecture, design system, and coding conventions.

**Do not create a new architecture or redesign the UI.**

Before making any changes, inspect the existing project structure and especially the existing `kaybykhushie/client` implementation to understand:

- Authentication-related components
- UI/design system
- Form components
- Validation patterns
- API/service patterns
- Database/Prisma structure
- User model
- Session/token handling
- Existing reusable components
- Existing notification/toast system
- Existing error-handling patterns

Follow the existing implementation wherever possible.

---

# 1. CRITICAL RULE — ASK BEFORE EXECUTION

Before modifying or creating any files:

1. Inspect the existing authentication-related code.
2. Inspect the Prisma/database user structure.
3. Inspect the existing UI components and design patterns.
4. Inspect the existing environment configuration.
5. Compare the required authentication flow with what already exists.

If anything is unclear, missing, conflicting, or requires a new architectural decision:

**STOP and ask me first.**

Do not guess.

When asking a question, clearly explain:

- What you found
- What is unclear
- Which files/components are affected
- What decision is required
- Your recommended option, if applicable

Wait for my answer before continuing.

---

# 2. Authentication Methods

The application should support:

1. Email/password authentication
2. Email OTP verification
3. Google authentication
4. Forgot password
5. Password reset through OTP
6. Logout
7. Session persistence
8. Protected authenticated routes
9. Basic account/user management

Google credentials are already configured in the environment.

**Do not replace, rename, or expose the existing Google credentials.**

Inspect the current `.env` / `.env.local` structure and use the existing variables.

Never expose Google client secrets to the browser.

---

# 3. Sign Up Flow

The sign-up process should be:

```text
User enters:
    ↓
Name
Email
Password
Confirm Password
    ↓
Validate input
    ↓
Create/prepare account
    ↓
Generate OTP
    ↓
Send OTP to user's email
    ↓
User enters OTP
    ↓
Verify OTP
    ↓
Account becomes verified
    ↓
User can log in
```

## Required validations

Validate:

- Name is required
- Email format
- Email uniqueness
- Password requirements
- Confirm password matches password
- OTP format
- OTP expiration
- OTP attempt limits

Do not store passwords in plaintext.

Passwords must be securely hashed using the authentication architecture already established in the project.

---

# 4. OTP Rules

OTP is a verification credential and must be treated as sensitive.

Implement the following:

### One-time usage

An OTP can be successfully used **only once**.

After successful verification:

```text
OTP → consumed/invalidated
```

The same OTP must never work again.

### Expiration

OTP must expire after a short configurable period.

Use an environment/configuration value where appropriate rather than hard-coding it throughout the application.

Example:

```text
OTP_EXPIRY_MINUTES=10
```

The exact value should follow the existing project's conventions unless there is a reason to choose otherwise.

### Resend OTP

Provide a resend OTP mechanism.

Requirements:

- Prevent unlimited OTP requests
- Add a resend cooldown
- Invalidate the previous active OTP when a new OTP is generated
- Only the newest valid OTP should work
- Prevent OTP abuse/rate abuse

### Attempt limit

Limit incorrect OTP attempts.

After the maximum number of failed attempts:

```text
OTP → invalidated
```

The user must request a new OTP.

### Never expose OTP

Never:

- Return the OTP in an API response
- Log the OTP
- Store plaintext OTP unnecessarily
- Display OTP in frontend code

Prefer storing a secure hash of the OTP rather than the raw OTP.

---

# 5. Login Flow

Login should support:

```text
Email
Password
    ↓
Validate credentials
    ↓
Create authenticated session
    ↓
Redirect user appropriately
```

Handle:

- Invalid email/password
- Unverified account
- Disabled account
- Rate limiting / excessive failed attempts
- Session creation
- Logout

Do not reveal unnecessary information such as whether an email exists when doing so could create account enumeration issues.

---

# 6. Google Authentication

Add **one Google authentication button**.

The UI should use the existing project design.

Do not create a new visual style.

Example placement:

```text
Email
Password
[ Login ]

or

[ Continue with Google ]
```

The exact layout should follow the existing design.

Google authentication should:

- Authenticate the user with Google
- Create the user if they do not already exist
- Sign in the user if the account already exists
- Safely associate the Google identity with the user
- Prevent duplicate accounts where possible
- Create the same application session used by normal authentication
- Redirect the user according to the existing application flow

Do not store Google access tokens unnecessarily.

Do not expose:

```text
GOOGLE_CLIENT_SECRET
```

to the client.

Use the existing Google environment configuration.

---

# 7. Forgot Password

The forgot-password flow should be:

```text
Forgot Password
    ↓
Enter email
    ↓
Request password reset OTP
    ↓
OTP sent to email
    ↓
Enter OTP
    ↓
Verify OTP
    ↓
Enter new password
    ↓
Confirm new password
    ↓
Reset password
    ↓
Invalidate OTP
    ↓
Invalidate existing sessions if appropriate
    ↓
User can log in with new password
```

The reset OTP must follow the same security rules as the signup OTP:

- One-time use
- Expiration
- Attempt limit
- Resend cooldown
- Previous OTP invalidation
- Secure storage
- No logging
- No API response exposure

Do not reveal whether an email address has an account.

For example, the response should use a generic message such as:

```text
If an account exists for this email, a verification code has been sent.
```

---

# 8. Password Reset Security

After successful OTP verification:

- Allow the user to set a new password
- Validate password strength
- Require password confirmation
- Hash the new password securely
- Invalidate the reset OTP immediately
- Invalidate previous password-reset tokens
- Consider invalidating existing authenticated sessions after a successful password reset
- Prevent reuse of an already-consumed OTP

Do not allow the OTP itself to act as a permanent authentication credential.

---

# 9. Session Management

Use the project's existing authentication/session architecture if one exists.

The system should support:

- Persistent login where appropriate
- Secure logout
- Protected routes
- Server-side authentication checks
- Session expiration
- Session invalidation
- Secure cookies where cookies are used

For cookies:

- `HttpOnly`
- `Secure` in production
- Appropriate `SameSite`
- Appropriate expiration

Do not store sensitive authentication secrets in localStorage unless the existing architecture explicitly requires it and there is a strong reason.

---

# 10. Protected Routes

Authenticated-only pages should verify authentication server-side where possible.

Unauthenticated users attempting to access protected areas should be redirected to the existing login page.

Authenticated users should not unnecessarily be redirected back to login.

Follow the existing Next.js routing architecture.

---

# 11. Account Verification

Maintain a clear user verification state.

For example:

```text
emailVerified
```

or follow the existing database structure if one already exists.

Normal email/password users should not be treated as fully verified until the signup OTP has been successfully validated.

Google-authenticated users can be considered email-verified based on the trusted Google identity/provider flow, following the authentication library/provider already used by the project.

---

# 12. Database Requirements

Before modifying the database:

**Inspect the existing Prisma schema first.**

Do not create duplicate user/account/session models if they already exist.

The database should support whatever is required for:

- User
- Password hash
- Email verification state
- Google account/provider identity
- OTP/reset records
- OTP expiration
- OTP attempts
- OTP purpose
- OTP consumed state
- Session management

If the existing schema cannot support the required functionality:

**STOP and ask me before changing the Prisma schema.**

Do not run migrations blindly.

---

# 13. OTP Data Model

If a new OTP model is required, it should conceptually support:

```text
OTP
├── id
├── user/email reference
├── purpose
├── code/hash
├── expiresAt
├── attempts
├── maxAttempts
├── consumedAt
├── createdAt
└── updatedAt
```

Purpose should distinguish flows such as:

```text
SIGNUP_VERIFICATION
PASSWORD_RESET
```

Do not reuse a signup OTP for password reset.

The exact schema must follow the existing Prisma architecture.

---

# 14. Email Delivery

The OTP must actually be delivered to the user's email.

Before implementing email delivery:

**Inspect whether the project already has an email provider/service configured.**

If one exists, reuse it.

If none exists, **ask me which email provider I want to use before implementing one.**

Do not silently introduce an email service.

---

# 15. UI Requirements

Use the **existing design exactly**.

Do not redesign the authentication pages.

Reuse existing:

- Buttons
- Inputs
- Typography
- Colors
- Cards
- Modals
- Toasts
- Form components
- Loading states
- Error messages
- Responsive layouts

Required authentication screens:

```text
Login
Sign Up
OTP Verification
Forgot Password
Password Reset
```

Google should appear as **one Google authentication button**.

---

# 16. UX Requirements

Include proper states for:

### Loading

```text
Sending OTP...
Verifying...
Signing in...
Creating account...
Resetting password...
```

### Success

Show the existing project's success notification style.

### Error

Show useful but safe messages.

Never expose:

- Database errors
- Stack traces
- API secrets
- OTP values
- Internal authentication details

### Resend OTP

Show a countdown/cooldown when appropriate.

Example:

```text
Resend code in 45s
```

After cooldown:

```text
Resend OTP
```

---

# 17. Rate Limiting / Abuse Prevention

Authentication endpoints should have reasonable rate limiting.

At minimum consider limits for:

- Login attempts
- Signup OTP requests
- OTP verification attempts
- OTP resend requests
- Password reset requests
- Password reset OTP verification

Use the existing project's infrastructure if available.

If there is no existing rate-limiting architecture, **ask me before introducing a new service or dependency.**

---

# 18. Security Requirements

Follow standard authentication security practices.

Must include:

- Password hashing
- One-time OTPs
- OTP expiration
- OTP attempt limits
- OTP resend cooldown
- Secure session handling
- Server-side authorization checks
- CSRF protection where applicable
- Rate limiting
- Generic password-reset responses
- No sensitive logs
- No secrets in frontend code
- No plaintext passwords
- No plaintext OTP storage where avoidable
- Secure cookies
- Input validation
- Server-side validation

---

# 19. Environment Variables

Inspect the existing environment variables first.

Do not overwrite existing configuration.

Google credentials are already configured.

Use the project's existing variable names if they are already established.

If additional variables are required, tell me exactly which ones are needed before adding them.

Possible examples:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

OTP_EXPIRY_MINUTES=
OTP_MAX_ATTEMPTS=
OTP_RESEND_COOLDOWN_SECONDS=
```

Do not assume these names are correct if the project already has another convention.

---

# 20. Testing Requirements

After implementation, test at minimum:

### Signup

- Valid signup
- Existing email
- Invalid email
- Weak password
- Password mismatch
- OTP verification
- Expired OTP
- Wrong OTP
- Used OTP
- Maximum OTP attempts
- Resend OTP
- Old OTP after resend

### Login

- Correct credentials
- Wrong password
- Unverified account
- Disabled account
- Logout
- Protected route

### Google

- Google sign-in
- Existing Google user
- New Google user
- Existing email/account conflict
- Session creation

### Forgot Password

- Existing account
- Non-existing account
- OTP verification
- Expired OTP
- Wrong OTP
- Used OTP
- New password
- Password confirmation
- Login with new password

---

# 21. Implementation Process

Follow this exact order:

```text
1. Inspect project
        ↓
2. Inspect kaybykhushie/client reference architecture
        ↓
3. Inspect existing authentication implementation
        ↓
4. Inspect Prisma schema
        ↓
5. Inspect existing environment variables
        ↓
6. Inspect email infrastructure
        ↓
7. Identify missing pieces
        ↓
8. Ask me questions for anything unclear
        ↓
9. Wait for my response
        ↓
10. Implement authentication
        ↓
11. Update database only if approved/required
        ↓
12. Test all authentication flows
        ↓
13. Fix errors
        ↓
14. Report exactly what was changed
```

## FINAL RULE

**DO NOT PROCEED BLINDLY.**

If you encounter something that is not already defined in the project or reference architecture, ask me before deciding.

Do not invent:

- Authentication architecture
- Database architecture
- Email provider
- Session architecture
- New dependencies
- UI design
- API structure
- Security implementation

The priority is:

**Existing architecture → Existing design → Existing conventions → Ask when unclear → Then implement.**