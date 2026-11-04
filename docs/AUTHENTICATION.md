# CHRONOS — Authentication Specification & Implementation

## 1. Overview

Chronos utilizes a stateless, cryptographically signed JSON Web Token (JWT) architecture combined with salted password hashing using `bcryptjs`. This document defines the authentication standards, token structures, validation lifecycle, and frontend synchronization mechanisms.

---

## 2. Cryptographic Standards

### 2.1. Password Hashing
- **Algorithm**: `bcrypt` (via `bcryptjs`)
- **Cost Factor / Salt Rounds**: `10`
- **Security Invariant**: Passwords are never stored in plaintext and never logged. The password hash is explicitly deleted/sanitized from all user objects before serialization in API responses:
  ```typescript
  const { passwordHash: _, ...safeUser } = userRecord;
  ```

### 2.2. Token Specification
- **Library**: `jose` (Standard Web Cryptography API compliant)
- **Algorithm**: `HS256` (HMAC SHA-256)
- **Token Claims**:
  - `sub`: User ID (`user.id`)
  - `email`: User email address
  - `role`: User role (`USER` or `ADMIN`)
  - `iss`: `chronos-os`
  - `aud`: `chronos-clients`
  - `iat`: Timestamp of issuance
  - `exp`: 7 days from issuance (`7d`)

---

## 3. Endpoints & Flow

### 3.1. Registration (`POST /api/auth/signup`)
1. **Input Validation**: Validates `email`, `password` (minimum 6 characters), and optional `name`.
2. **Duplicate Check**: Checks `db.getUserByEmail(email.toLowerCase())`. If already registered, returns `409 Conflict`.
3. **Password Hashing**: `const hash = await bcrypt.hash(password, 10);`
4. **Partition Allocation**: Automatically allocates an empty user silo (`db.partitions[newUser.id] = { tasks: [], ... }`).
5. **Personal Workspace Provisioning**: Creates default personal workspace (`Personal Workspace`) for the user.
6. **Token Issuance**: Generates JWT and returns `{ success: true, token, user }`.

### 3.2. Login (`POST /api/auth/login`)
1. **Lookup**: Resolves user record by case-insensitive email.
2. **Hash Comparison**: `await bcrypt.compare(password, user.passwordHash)`. Rejection returns generic `401 Invalid credentials` to prevent account enumeration.
3. **Token Issuance**: Returns `{ success: true, token, user }`.

### 3.3. Session Verification (`GET /api/auth/me`)
- **Authentication**: Requires valid `Authorization: Bearer <token>`.
- **Database Verification**: Validates that the user ID specified in `payload.sub` still exists in active database records.
- **Payload**: Returns sanitized user profile and authorized workspaces list.

---

## 4. Frontend Auth Lifecycle (`AuthContext.tsx`)

1. **Initial Mount**:
   - `AuthContext` checks `localStorage.getItem('chronos_token')`.
   - If present, sends `GET /api/auth/me`.
   - If valid, populates `currentUser` and triggers data hydration.
   - If token is invalid, expired, or tampered with, `localStorage.removeItem('chronos_token')` is executed, and user state resets to null.
2. **Account Switching**:
   - Logging out clears the current token, resets all React state in `TaskContext` and `TeamContext`.
   - `storage.ts` verifies that every storage read/write specifies an active `userId`. Missing or empty `userId` immediately returns empty arrays `[]` and aborts persistence.

---

## 5. Security Checklist & Mitigations

- [x] **No Plaintext Passwords**: Enforced with bcrypt cost factor 10.
- [x] **No Leaked Hashes**: Password hash stripped on all API responses.
- [x] **No Hardcoded Demo Tokens**: Legacy `Bearer demo-token` explicitly rejected with 401.
- [x] **Algorithm Confusion Prevention**: Middleware explicitly restricts verification to `HS256`.
- [x] **Issuer & Audience Validation**: Token must match `iss: chronos-os` and `aud: chronos-clients`.
