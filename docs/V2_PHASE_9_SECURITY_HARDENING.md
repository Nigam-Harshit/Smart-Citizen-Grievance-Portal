# V2.0.0 Phase 9: Security Hardening, Authorization Audit & Verification

## 1. Phase Objective

Phase 9 conducts a thorough, evidence-based security audit, authorization verification, and defensive hardening across the V2.0.0 photographic evidence attachment architecture. The primary focus is to:
- Verify all claims and implementation guarantees from Phase 8.
- Resolve all ambiguities regarding the maintenance interface, storage key validation, and git history.
- Audit authentication, RBAC, scope authorization, presigned URL lifecycles, and input parsing.
- Implement strictly justified, minimal defensive hardening without introducing external brokers (no Redis, queues, workers).
- Establish an automated security regression test suite (`scratch/test_phase9_security.js`).

---

## 2. Repository State Verified

- **Active Branch:** `v2.0.0-photo-evidence`
- **Starting Commit:** `3ea3176` (`feat(v2): implement MongoDB and Cloudflare R2 consistency reconciliation`)
- **Baseline Test Results:** All 189 cumulative tests from Phases 4, 5, 6, 7, and 8 were reproduced and verified passing before making changes.
- **Syntactic Integrity Check:** Initial unstaged editor artifacts (syntax duplication in `package.json` and `utils/storageService.js`) were safely cleaned via file editing tools without destructive git commands.

---

## 3. Phase 8 Verification & Ambiguity Resolution

### 3.1 Was Phase 8's reported 189/189 test result reproducible?
**YES.** Executed all existing test suites:
- `scratch/test_phase4_backend.js`: 26 / 26 PASSED
- `scratch/test_phase5_integration.js`: 34 / 34 PASSED
- `scratch/test_phase6_viewing.js`: 36 / 36 PASSED
- `scratch/test_phase7_resilience.js`: 39 / 39 PASSED
- `scratch/test_phase8_consistency.js`: 54 / 54 PASSED
**Total: 189 / 189 PASSED (100% Green).**

### 3.2 Was the working tree actually clean?
The git commit `3ea3176` was cleanly committed in git history. However, upon starting Phase 9, five unstaged working tree modifications were present. Investigation revealed:
1. `package.json`: A duplicated `"dev"` script line without comma (syntax error).
2. `utils/storageService.js`: A duplicated import line and export line (syntax error).
3. `docs/...`, `scripts/...`, `services/...`: Minor trailing newlines.
These were corrected safely using `replace_file_content` without using destructive commands (`git checkout -- .`, `git reset --hard`, `git clean`).

### 3.3 What happened with `walkthrough.md`?
**RESOLVED:**
`walkthrough.md` is NOT part of the repository git tree.
- `git ls-files walkthrough.md` &rarr; Empty.
- `git log --all -- walkthrough.md` &rarr; Empty.
- `git check-ignore -v walkthrough.md` &rarr; Not ignored.
`walkthrough.md` is an internal planning artifact generated in the coding agent's brain directory (`C:\Users\hsrni\.gemini\antigravity\brain\<conv-id>\walkthrough.md`). The Phase 8 report accurately described updating this artifact, and correctly omitted it from `git add` in the project repository.

### 3.4 Did the Phase 8 destructive `git checkout -- .` cause data loss?
**RESOLVED:**
Inspection of `git reflog -n 10` and commit history confirmed that the Phase 7 implementation was already committed in `4c128a3` prior to Phase 8. No committed code was lost. However, executing `git checkout -- .` violated repository safety boundaries; Phase 9 strictly adheres to non-destructive Git practices.

### 3.5 Did the Phase 8 maintenance route behave as expected?
**PARTIALLY.** While functional for testing, audit revealed several security vulnerabilities in the maintenance route:
1. Hardcoded fallback secret: `'civic_demo_maintenance_key_2026'` allowed access if `process.env.MAINTENANCE_KEY` was missing in production.
2. String comparison: Used standard inequality (`!==`), vulnerable to timing side-channel attacks.
3. Lack of rate limiting: Endpoint had no rate limiting, allowing brute-force attempts on `x-maintenance-secret`.
4. Overlapping runs: Concurrent calls could trigger multiple simultaneous reconciliation runs.
5. Permissive window input: `safetyWindowHours = 0` was permitted, bypassing in-flight upload protections.
All these vulnerabilities were identified and hardened in Phase 9.

### 3.6 Was dry-run actually the safe default?
**YES.** Both CLI and HTTP endpoint default to `dryRun = true`. In Phase 9, this was further tightened so that string inputs such as `{"dryRun": "false"}` cannot trigger destructive mode; strictly boolean `false` is required.

### 3.7 Can malformed input activate destructive deletion?
**NO.** Hardened validation guarantees that:
- Non-boolean `dryRun` values evaluate to `true` (safe dry-run).
- `safetyWindowHours` must be a finite positive integer between 1 and 720 hours. Values of 0, negative numbers, floats, `NaN`, or `Infinity` are rejected with HTTP 400.

### 3.8 Was the 24-hour safety window correctly enforced?
**YES, with hardening.** Previously, if an R2 object had an invalid or missing `LastModified` timestamp, `ageMs` was `NaN`, which bypassed `ageMs < safetyWindowMs` into the orphan candidate list. Phase 9 hardened this: any unparseable or missing timestamp is classified as `RECENT_UNREFERENCED_OBJECT` and protected from deletion.

### 3.9 Is R2 namespace isolation correct?
**YES.** Storage keys must match `^grievances\/[a-zA-Z0-9_-]+(\.[a-zA-Z0-9]+)+$`. Any path traversal (`..`), backslash (`\`), null byte (`\0`), URL encoding (`%`), query string (`?`), fragment (`#`), or whitespace is rejected.

### 3.10 Can a client control a destructive storage key?
**NO.** Destructive operations are strictly server-orchestrated. `deleteFromR2(key)` now enforces `isValidStorageKey(key)` internally, and `getGrievancePhoto` derives the storage key directly from MongoDB record metadata, completely ignoring client request bodies or query parameters.

### 3.11 Does Mongo failure safely prevent/rollback R2 state?
**YES.** In `createGrievance`, if the MongoDB insert fails after an image is uploaded to R2, an immediate compensating transaction executes `deleteFromR2(storageKey)`. If that deletion also fails, an `[ORPHAN_RECONCILIATION_REQUIRED]` telemetry log is emitted for Phase 8 reconciliation.

### 3.12 Does R2 inventory failure prevent destructive deletion?
**YES.** If Cloudflare R2 listing fails, or MongoDB inventory fails, the reconciliation engine halts immediately with status `FAILED` and `orphansDeletedCount: 0`.

---

## 4. Security Findings & Resolutions

### Finding 1: Hardcoded Fallback Secret in Maintenance Router
- **Severity:** High
- **Evidence:** `const MAINTENANCE_KEY = process.env.MAINTENANCE_KEY || 'civic_demo_maintenance_key_2026';` in `routes/maintenanceRoutes.js`.
- **Impact:** In production deployments where `MAINTENANCE_KEY` was not explicitly set in the environment, any attacker using the public demo string could access maintenance endpoints (inspect, backup, reseed, and storage reconciliation).
- **Resolution:** Replaced with fail-closed logic. In production (`NODE_ENV === 'production'`), if `MAINTENANCE_KEY` and `JWT_SECRET` are not configured, the router immediately returns HTTP 503 ("Maintenance interface unavailable: Secret not configured").

### Finding 2: Timing Side-Channel in Maintenance Secret Verification
- **Severity:** Medium
- **Evidence:** `secret !== MAINTENANCE_KEY && secret !== process.env.JWT_SECRET` in `routes/maintenanceRoutes.js`.
- **Impact:** Variable-time string comparison allows timing side-channel attacks to determine secret length and character prefixes.
- **Resolution:** Implemented `safeSecretCompare` using SHA-256 pre-hashing and `crypto.timingSafeEqual`, guaranteeing constant-time comparison regardless of string lengths.

### Finding 3: Missing Rate Limiter on Administrative Maintenance Routes
- **Severity:** Medium
- **Evidence:** `maintenanceRoutes.js` had no rate limiting mounted.
- **Impact:** An attacker could brute-force `x-maintenance-secret` via repeated automated requests without throttling.
- **Resolution:** Created and mounted `maintenanceLimiter` in `middleware/rateLimiter.js` (30 requests per 15 minutes per IP).

### Finding 4: Mutable Evidence Attachment in `PUT /api/grievances/:id`
- **Severity:** High
- **Evidence:** `updateGrievance` in `controllers/grievanceController.js` performed `Grievance.findByIdAndUpdate(req.params.id, { ...req.body })`.
- **Impact:** An authorized Field Officer or Manager could tamper with or erase photographic evidence by submitting `{ attachment: null }` or `{ attachment: { storageKey: "grievances/arbitrary.jpg" } }`.
- **Resolution:** Enforced immutable attachment boundary: explicitly stripped `attachment`, `idempotencyKey`, and `citizenId` from `updateData` prior to persistence.

### Finding 5: Unvalidated `idempotencyKey` Type & Format
- **Severity:** Low
- **Evidence:** `createGrievance` accepted `req.body.idempotencyKey` directly without type or length checks.
- **Impact:** Submitting non-string or excessively long keys could bloat indexes or cause unexpected query behavior.
- **Resolution:** Added strict validation at request intake: must be a string, length &le; 128 characters, matching `^[a-zA-Z0-9_-]+$`.

### Finding 6: Missing Safety Floor on `safetyWindowHours` Input
- **Severity:** Medium
- **Evidence:** `safetyWindowHours >= 0` allowed passing 0 hours, bypassing the race condition protection window for in-flight uploads.
- **Impact:** A misconfigured or malicious maintenance call could delete photos uploaded seconds earlier while the database record was committing.
- **Resolution:** Hardened validation: `safetyWindowHours` must be an integer between 1 and 720 hours (minimum 1 hour floor, maximum 30 days).

### Finding 7: Unparseable `LastModified` Timestamp Deletion Risk
- **Severity:** Medium
- **Evidence:** In `reconciliationService.js`, if `LastModified` was corrupted or unparseable, `ageMs` was `NaN`, falling into the `else` branch as an eligible orphan candidate.
- **Impact:** Corrupted object metadata could lead to accidental deletion of legitimate images.
- **Resolution:** Explicit check for `isNaN(lastModTime)`: unparseable objects are classified as `RECENT_UNREFERENCED_OBJECT` (fail-safe protected from deletion).

---

## 5. Changes Implemented

| File | Change Details |
| :--- | :--- |
| [`middleware/rateLimiter.js`](file:///c:/Citizen_Grievance_Portal/middleware/rateLimiter.js) | Added `maintenanceLimiter` (30 req/15min) to protect maintenance routes from brute-forcing. |
| [`utils/storageService.js`](file:///c:/Citizen_Grievance_Portal/utils/storageService.js) | Hardened `isValidStorageKey` against traversal, URL-encoding, query params, hashes, whitespace, and length; enforced in `uploadToR2`, `deleteFromR2`, and `generatePresignedGetUrl`. |
| [`routes/maintenanceRoutes.js`](file:///c:/Citizen_Grievance_Portal/routes/maintenanceRoutes.js) | Added `maintenanceLimiter`, timing-safe comparison, fail-closed production policy, in-memory concurrency lock (`isReconciling`), strict boolean `dryRun` coercion, and `safetyWindowHours` bounds (1-720 hrs). |
| [`services/reconciliationService.js`](file:///c:/Citizen_Grievance_Portal/services/reconciliationService.js) | Protected unparseable/missing `lastModified` timestamps from deletion by classifying as `RECENT_UNREFERENCED_OBJECT`. |
| [`controllers/grievanceController.js`](file:///c:/Citizen_Grievance_Portal/controllers/grievanceController.js) | Stripped `attachment`, `idempotencyKey`, and `citizenId` in `updateGrievance`; validated `idempotencyKey` format at intake in `createGrievance`; fixed `auditController.logAudit` call. |
| [`.env.example`](file:///c:/Citizen_Grievance_Portal/.env.example) | Added `MAINTENANCE_KEY=` placeholder without exposing default secrets. |
| [`scripts/reconcileStorage.js`](file:///c:/Citizen_Grievance_Portal/scripts/reconcileStorage.js) | Added bounds validation (1 to 720 hours) for `--safety-window-hours` CLI argument. |
| [`scratch/test_phase9_security.js`](file:///c:/Citizen_Grievance_Portal/scratch/test_phase9_security.js) | New comprehensive security verification suite (44 automated tests). |

---

## 6. Authorization Matrix (Verified)

| Role | Own Grievance Photo | Other Citizen Photo | Assigned Officer Photo | Unassigned Officer Photo | In-Scope Manager Photo | Out-of-Scope Manager Photo | Super Admin Photo |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Citizen** | **ALLOW (200)** | **DENY (403)** | N/A | N/A | N/A | N/A | N/A |
| **Field Officer** | N/A | N/A | **ALLOW (200)** | **DENY (403)** | N/A | N/A | N/A |
| **Manager** | N/A | N/A | N/A | N/A | **ALLOW (200)** | **DENY (403)** | N/A |
| **System Admin** | **ALLOW (200)** | **ALLOW (200)** | **ALLOW (200)** | **ALLOW (200)** | **ALLOW (200)** | **ALLOW (200)** | **ALLOW (200)** |
| **Unauthenticated** | **DENY (401)** | **DENY (401)** | **DENY (401)** | **DENY (401)** | **DENY (401)** | **DENY (401)** | **DENY (401)** |

---

## 7. Maintenance Endpoint Decision

**Decision:** Retain the **Protected HTTP Maintenance Interface** alongside the **CLI Script**.

**Rationale:**
1. The repository already features an established maintenance router (`/api/admin-maintenance/inspect`, `/api/admin-maintenance/backup`, `/api/admin-maintenance/cleanup-and-seed`) used by administrators and deployment verification tools.
2. In containerized cloud deployments (e.g. Render Web Services), interactive shell access for CLI scripts is not always enabled or readily accessible to non-developer operators.
3. With the Phase 9 security controls (fail-closed secret requirement, timing-safe hashing, IP rate limiting, concurrency mutex, strict boolean parsing, and bounds validation), the HTTP endpoint is hardened to production standards.
4. For scheduled background execution, the CLI tool (`npm run reconcile:dry` or `node scripts/reconcileStorage.js --dry-run`) remains available for cron jobs and pipeline automation.

---

## 8. Secret-Handling Verification

The following environment variables were verified as strictly server-side and omitted from frontend builds, client payloads, logs, and error responses:
- `JWT_SECRET`: Handled exclusively on backend; verified timing-safe.
- `MAINTENANCE_KEY`: Handled exclusively on backend; fail-closed in production; no default secret in `.env.example`.
- `R2_ACCESS_KEY_ID`: Never transmitted to client; zero occurrences in web/mobile builds.
- `R2_SECRET_ACCESS_KEY`: Never transmitted to client; zero occurrences in web/mobile builds.
- `R2_BUCKET_NAME`: Omitted from API responses.
- `MONGO_URI`: Omitted from API responses and client bundles.

---

## 9. Test Results

### Automated Suites (100% Green)
| Suite | Focus | Results |
| :--- | :--- | :--- |
| **Phase 4** (`scratch/test_phase4_backend.js`) | Core R2 client, Sharp pipeline, Multer 8MB, Mongoose schema | **26 / 26 PASSED** |
| **Phase 5** (`scratch/test_phase5_integration.js`) | Multipart/JSON submission, feature flags, compensating delete | **34 / 34 PASSED** |
| **Phase 6** (`scratch/test_phase6_viewing.js`) | Scope authorization, presigned URLs, ServiceWorker bypass | **36 / 36 PASSED** |
| **Phase 7** (`scratch/test_phase7_resilience.js`) | Idempotency deduplication, E11000 race, DoS rate limiting | **39 / 39 PASSED** |
| **Phase 8** (`scratch/test_phase8_consistency.js`) | Key validation, pagination, 5-state matrix, abort safeguards | **54 / 54 PASSED** |
| **Phase 9** (`scratch/test_phase9_security.js`) | Authentication, RBAC, storage boundaries, maintenance, tamper defense | **44 / 44 PASSED** |
| **Total Cumulative Tests** | **All V2.0.0 Automated Test Suites** | **233 / 233 PASSED** |

### Client Typechecks & Production Build
- **Mobile TypeScript (`mobile/`):** `npx tsc --noEmit` &rarr; **0 errors**.
- **Web Client Production Build (`client/`):** `npm run build --prefix client` &rarr; **Compiled successfully, 0 warnings**.

---

## 10. Remaining Limitations

1. **Single Attachment Ceiling:** V2.0.0 is frozen to at most one photographic evidence attachment per grievance. Multi-photo attachments remain outside V2 scope.
2. **In-Memory Concurrency Lock Scope:** The `isReconciling` mutex is process-local. In multi-instance cluster deployments, concurrent reconciliation requests across different dynos would be handled independently; operators should run destructive maintenance via single CLI invocations or single-instance schedulers.
3. **Pilot Scale Design:** Rate limits and memory ceilings are calibrated for municipal pilot scale (60 submissions/15min, 120 photo views/15min).

---

## 11. Phase 10 Readiness

Phase 9 is **COMPLETE**. All security controls, authorization boundaries, and Phase 8 claims are verified and hardened. Zero architectural conflicts exist, and the repository is ready for Phase 10 (Production Readiness & Final Freeze).
