# V2.0.0 — PHASE 7: FAILURE, RETRY & RESILIENCE HARDENING SPECIFICATION

## Overview
Phase 7 hardens the photographic evidence attachment architecture across the entire stack (React Web / PWA, React Native / Expo, Node.js / Express backend, Cloudflare R2 private object storage, and MongoDB Atlas). It ensures that real-world operational anomalies—such as user double-clicks, transient network disconnects, concurrent submissions, database timeouts, storage failures, expired access tokens, and Denial of Service attempts—are handled predictably without data loss, phantom records, orphaned object storage bloat, or confidential credential leaks.

---

## 1. Failure Modes & Resilience Architecture

### 1.1 Double-Submission & Idempotency Stability
* **Mechanism:**
  - Clients (both Web and Mobile) initialize a cryptographically random, stable session `idempotencyKey` when rendering the grievance lodge form or beginning a new draft.
  - While submission is active, the UI sets `loading: true` and disables the submit button (`disabled={loading}`) to prevent rapid multi-clicks.
  - If the client's network drops before receiving the HTTP 201 response and the user resubmits, or if an automated network retry is issued, the client sends the **identical** `idempotencyKey`.
  - The backend evaluates `idempotencyKey` against `{ citizenId, idempotencyKey }` before touching `req.file` or the `imageProcessor`.
  - If a matching document exists, the backend returns HTTP 200 with the already-created grievance record immediately, completely bypassing Sharp image processing, UUID generation, R2 uploads, and audit logging.

### 1.2 Concurrent Race Condition Handling (MongoDB E11000)
* **Mechanism:**
  - If two requests with the same `(citizenId, idempotencyKey)` pair arrive concurrently and both pass the initial `findOne` pre-check simultaneously, both process and upload their image files to Cloudflare R2 (generating separate storage keys `K1` and `K2`).
  - Request 1 creates the grievance document in MongoDB Atlas successfully.
  - Request 2 attempts `Grievance.create` and triggers MongoDB's compound unique sparse index `{ citizenId: 1, idempotencyKey: 1 }`, which throws an error with `error.code === 11000`.
  - The backend `catch` block intercepts `error.code === 11000`:
    1. Executes a compensating transaction to delete Request 2's orphaned R2 object (`storageService.deleteFromR2(K2)`).
    2. Queries MongoDB for the existing document created by Request 1.
    3. Responds with HTTP 200 and Request 1's grievance document.
  - **Result:** No duplicate database documents, no orphaned R2 objects, and Request 1's canonical asset remains preserved.

### 1.3 Pre-Upload Validation Failures
* **Mechanism:**
  - Before any network communication with Cloudflare R2, image buffers pass through `imageProcessor.validateAndProcessImage`:
    - Non-image binary buffers trigger `MALFORMED_IMAGE` (HTTP 400).
    - Oversized payloads trigger Multer limits or `FILE_TOO_LARGE` (HTTP 400).
    - Image dimensions exceeding 20 Megapixels trigger `PIXEL_LIMIT_EXCEEDED` (HTTP 400).
  - When validation fails, execution halts immediately: 0 bytes uploaded to R2, 0 documents inserted into MongoDB.

### 1.4 Object Storage Outages & Network Timeouts
* **Mechanism:**
  - When `storageService.isStorageConfigured()` is false, the route returns HTTP 503 Service Unavailable immediately.
  - If Cloudflare R2 experiences transient unavailability during `storageService.uploadToR2`, the error is caught:
    - `uploadedStorageKey` is not set.
    - MongoDB record creation is aborted.
    - An HTTP 500 response with a sanitized message (`Failed to submit grievance. Please try again.`) is returned. No AWS/Cloudflare SDK stack traces or credentials are leaked.

### 1.5 Compensating Transactions & Orphan Reconciliation Telemetry
* **Mechanism:**
  - If R2 upload succeeds (`uploadedStorageKey` is assigned) but subsequent database operations fail (e.g. `Grievance.create`, `GrievanceUpdate.create`, or DB timeouts):
    - The `catch` block invokes `storageService.deleteFromR2(uploadedStorageKey)`.
    - Successful purging is logged: `[Compensating Transaction] Purged orphaned R2 asset: ...`.
  - **Double Failure Handling:** If `deleteFromR2` also encounters a network failure or error during cleanup, the system logs a structured, machine-parseable telemetry event:
    ```json
    [ORPHAN_RECONCILIATION_REQUIRED] {"storageKey":"grievances/...jpg","citizenId":"...","timestamp":"...","error":"..."}
    ```
  - This structured telemetry enables Phase 8 automated offline reconciliation scripts to locate and garbage-collect any stranded R2 assets without relying on heavyweight distributed queue infrastructure.

### 1.6 Presigned URL Expiry & Refresh Handling
* **Mechanism:**
  - Presigned GET URLs generated via `@aws-sdk/s3-request-presigner` expire strictly after `PHOTO_PRESIGNED_EXPIRES_IN` (300 seconds / 5 minutes).
  - Presigned URLs are treated as ephemeral rendering artifacts and are **never** stored in database documents, browser `localStorage`, or React Native `AsyncStorage`.
  - Both Web and Mobile clients mount an `onError` listener on the rendered `<img>` / `<Image />` element:
    - When an image fails to load (due to URL expiration or a missing object on R2), the client resets `photoUrl` to `null` and displays a descriptive error banner.
    - A dedicated `↻ Retry Loading Photo` button is presented, which calls `GET /api/grievances/:id/photo` to request a fresh presigned URL on demand, preventing infinite reload loops.

### 1.7 Rate Limiting & Denial of Service Defense
* **Mechanism:**
  - `photoAccessLimiter` (`middleware/rateLimiter.js`): Enforces a ceiling of 120 requests per 15 minutes per IP on `GET /api/grievances/:id/photo` to mitigate automated scraping and signature harvesting.
  - `createGrievanceLimiter` (`middleware/rateLimiter.js`): Enforces a ceiling of 60 grievance submissions per 15 minutes per IP on `POST /api/grievances`.
  - **Pipeline Ordering:** `createGrievanceLimiter` is mounted **before** `uploadSinglePhoto` (Multer). Rate-limited or flooding requests are terminated with HTTP 429 before Multer streams or buffers multipart payloads into memory, preventing memory exhaustion and Sharp CPU denial of service.

### 1.8 Feature Flag Deactivation
* **Mechanism:**
  - When `PHOTO_UPLOAD_ENABLED !== 'true'`, submissions containing a photo payload are rejected with HTTP 400 and message `"Photographic evidence uploads are currently disabled"`.
  - Grievance submissions without photos continue to function seamlessly without interruption.

---

## 2. Answers to Core Production Resilience Questions

| Scenario | Client Behavior | Backend Behavior | Final Database / Storage State |
| :--- | :--- | :--- | :--- |
| **1. Double Submit / Rapid Click** | Button disabled on click (`disabled={loading}`). If submitted twice, identical `idempotencyKey` sent. | Detects matching `(citizenId, idempotencyKey)` before upload. Bypasses Sharp and R2. Returns HTTP 200 with existing doc. | Exactly 1 MongoDB document. Exactly 1 R2 object. |
| **2. Network Timeout & Retry** | Retains original `idempotencyKey` across retries. Sends identical key upon user retry. | Finds existing grievance from initial attempt. Returns HTTP 200 with original document. | Exactly 1 MongoDB document. No duplicate photo or record. |
| **3. Pre-upload Failure (Corrupt File)** | Displays alert with validation message. File input / selection reset. | Sharp throws `MALFORMED_IMAGE` / `FILE_TOO_LARGE`. Returns HTTP 400. | 0 MongoDB documents. 0 R2 uploads. |
| **4. Storage Upload Failure** | Receives sanitized HTTP 500 error. Form data retained so user can retry. | Caught in try/catch. `uploadedStorageKey` is null. Database write skipped. | 0 MongoDB documents. 0 R2 objects. |
| **5. Database Write Failure after R2 Upload** | Receives HTTP 500 error: "Failed to submit grievance. Please try again." | Catch block executes `deleteFromR2(uploadedStorageKey)` compensating transaction. | 0 MongoDB documents. R2 object is purged immediately. |
| **6. Double Failure (Compensating Deletion Fails)** | Receives HTTP 500 error safely. | Emits structured `[ORPHAN_RECONCILIATION_REQUIRED]` JSON log with storageKey and citizenId. | 0 MongoDB documents. R2 key recorded in telemetry for Phase 8 reconciliation script. |
| **7. Missing R2 Object on Retrieval** | Image `onError` triggers. `photoUrl` reset to null. Retry banner shown. | Returns HTTP 200 with presigned URL; client receives 404 from R2 and displays retry UI. | DB attachment unchanged. No unhandled server crashes. |
| **8. Presigned URL Expiration** | Image fails to render after 300s. User clicks "Retry Loading Photo" to fetch fresh URL. | Client requests `GET /api/grievances/:id/photo`. Backend validates auth and generates fresh URL. | Unchanged. No stale URLs stored in database or localStorage. |
| **9. Concurrent Race Condition** | Both clients receive HTTP 200 with canonical grievance record. | Unique index throws 11000. Second upload is purged via compensating transaction; first record returned. | Exactly 1 MongoDB document with primary R2 key. Duplicate R2 upload purged. |
| **10. Rate Limiting Floods** | Receives HTTP 429: "Too many grievance submissions from this IP." | Blocked before Multer parses multipart body. Saves Node memory and CPU. | Request blocked. Zero server memory bloat. |

---

## 3. Comprehensive Verification Matrix

### 3.1 Automated Verification Suites
* **Phase 4 Backend Suite (`scratch/test_phase4_backend.js`):** **26 / 26 PASSED**
  - Cryptographic storage keys, Sharp pipeline, Multer 8 MB limits, Mongoose schema backward compatibility.
* **Phase 5 Submission Suite (`scratch/test_phase5_integration.js`):** **34 / 34 PASSED**
  - Route-level Multer, multipart and JSON handling, feature flag disablement, compensating R2 deletion, mobile FormData structure.
* **Phase 6 Secure Viewing Suite (`scratch/test_phase6_viewing.js`):** **36 / 36 PASSED**
  - Server-side role/scope authorization matrix, storage key derivation, 300s expiration, PWA Service Worker bypass, zero client secret leaks.
* **Phase 7 Resilience Suite (`scratch/test_phase7_resilience.js`):** **39 / 39 PASSED**
  - Double submission idempotency, E11000 duplicate key race handling, compensating transaction double-failure telemetry, URL refresh, rate limiter pipeline order, zero secret leakage.

**Total Automated Tests Passed:** **135 / 135 (100% Green)**

### 3.2 Mobile TypeScript Verification
* Command: `npx tsc --noEmit` in `mobile/`
* Result: **0 errors**

### 3.3 Web Production Build Verification
* Command: `npm run build --prefix client`
* Result: **Compiled successfully (0 errors, 0 warnings)**

---

## 4. Security & Compliance Checklist
- [x] **Zero Raw Internals Leaked:** Database errors, AWS SDK exceptions, and connection timeouts are sanitized into user-facing messages.
- [x] **Zero Secrets in Storage:** Presigned URLs expire in 300 seconds and are never persisted in MongoDB Atlas or client offline storage.
- [x] **Zero Hardcoded Credentials:** `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` exist solely in server environment variables.
- [x] **Pre-Multer Rate Limiting:** Denial of Service attacks cannot force memory allocation of 8 MB buffers.
- [x] **Orphan Telemetry Safe:** Log entries emit only `storageKey`, `citizenId`, `timestamp`, and error status—no authorization headers or session tokens.
