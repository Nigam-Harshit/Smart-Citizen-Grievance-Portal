# V2.0.0 — PHASE 13 REPORT: MONGODB ↔ CLOUDFLARE R2 CONSISTENCY & RECONCILIATION

## 1. Starting State & Scope

Phase 13 audited, hardened, and verified the long-lived consistency relationship between MongoDB Atlas grievance attachment metadata and private Cloudflare R2 object storage for V2.0.0 of the Smart Citizen Grievance Management & Analytics Portal.

* **Dedicated Git Branch**: `v2.0.0-photo-evidence`
* **Starting Commit**: `79212f0` (`feat(v2): complete failure and retry hardening verification`)
* **Initial Test Baseline**: 420/420 cumulative tests passing
* **Core Principle**: Do **not** redesign the storage architecture. Do **not** introduce Redis, BullMQ, Kafka, background workers, or public R2 buckets. Build directly on the proven five-state consistency model and hardened utilities.

---

## 2. Existing Consistency Architecture Audited

The V2.0.0 storage consistency architecture links two heterogeneous storage layers:
1. **MongoDB Atlas**: Authoritative metadata store containing citizen grievance records with immutable `attachment: { storageKey, originalName, mimeType, size, dimensions, checksum, uploadedAt }`.
2. **Cloudflare R2**: High-performance, private S3-compatible object storage storing encrypted/normalized progressive JPEGs under opaque server-generated keys (`grievances/<uuidv4>.jpg`).

The consistency lifecycle operates on two horizons:
* **Immediate (Phase 12)**: Synchronous compensating cleanup transactions (`storageService.deleteFromR2`) executed when database insertion fails or when race conditions trigger MongoDB `code: 11000`.
* **Eventual (Phase 13)**: Asynchronous, idempotent reconciliation (`services/reconciliationService.js` and CLI `scripts/reconcileStorage.js`) to audit, detect, and safely clean up anomalies that survive beyond the request lifecycle.

---

## 3. The Standardized 5-State Consistency Model

| State | Definition | Classification | System Behavior & Action |
|---|---|---|---|
| **State 1** | MongoDB record exists + R2 object exists | `ConsistencyStatus.HEALTHY` | **Healthy pair.** No corrective action. Normal operations generate 300s presigned GET URLs on demand. |
| **State 2** | MongoDB record exists + R2 object missing | `ConsistencyStatus.MISSING_R2_OBJECT` | **Integrity Anomaly.** Never fabricates a placeholder file in R2. MongoDB record is **never** deleted. Reported in reconciliation details. Client handles retrieval gracefully via existing `onError` UI retry handler. |
| **State 3** | R2 object exists + MongoDB record missing | `RECENT_UNREFERENCED_OBJECT` (if age $< 24\text{h}$)<br>`ORPHAN_R2_OBJECT` (if age $\ge 24\text{h}$) | **Orphan Asset.** Objects inside the 24h safety window are protected from deletion to avoid race conditions with in-flight submissions. Objects older than the safety window are eligible for deletion in destructive mode (`dryRun: false`). |
| **State 4** | Neither exists in MongoDB nor R2 | `ConsistencyStatus.NOT_FOUND_BOTH` | **No-op.** Safe verification; zero errors, zero destructive actions. |
| **State 5** | Malformed metadata or illegal storage key | `ConsistencyStatus.MALFORMED_METADATA` | **Security Rejection.** Keys with path traversal (`..`), non-`grievances/` prefix, or duplicate key collisions across grievances are flagged. Malformed keys are **never** passed to `deleteFromR2`. |

---

## 4. Reconciliation Behavior & Safety Controls

### 4.1 Safe Defaults
* Both programmatic API (`reconcileStorage`) and CLI (`scripts/reconcileStorage.js`) default strictly to **safe dry-run mode** (`dryRun: true`).
* Destructive purging requires explicit `dryRun === false`. String values like `"false"` are coerced to `true` (dry-run) to prevent accidental deletions through loosely-typed JSON payloads.

### 4.2 In-Flight Reference Concurrency Guard
A critical race condition exists if an orphan is identified during the inventory scan, but a citizen submits a ticket referencing that key before the deletion step executes.

In `services/reconciliationService.js`, Step 4 executes a pre-deletion check:
```javascript
let isNowReferenced = mongoReferenceMap.has(orphan.key);
if (!isNowReferenced && isExistsMockedOrConnected()) {
    try {
        isNowReferenced = Boolean(await Grievance.exists({ 'attachment.storageKey': orphan.key }));
    } catch (checkErr) { ... }
}

if (isNowReferenced) {
    console.warn(`[Reconciliation] Orphan candidate ${orphan.key} became referenced in MongoDB. Deletion aborted.`);
    continue;
}
```
If the object became referenced while reconciliation was running, deletion is immediately aborted and the evidence file is preserved.

### 4.3 Process-Level Single-Run Concurrency Lock
* In `routes/maintenanceRoutes.js`, the endpoint enforces `let isReconciling = false;` returning `HTTP 409 Conflict` if a second run is requested while one is in progress.
* In `services/reconciliationService.js`, `reconcileStorage` supports `options.enforceSingleRun`, throwing `CONCURRENT_RUN_CONFLICT` if concurrent execution is attempted in the same process.

### 4.4 Bounded Pagination for Large Datasets
`storageService.listAllObjects` and `reconcileStorage` support:
* `options.maxObjects`: Limits the total number of R2 objects scanned in a single reconciliation batch, preventing memory exhaustion on massive buckets.
* `options.batchSize`: Controls the S3 `MaxKeys` requested per page (default: 1000).

### 4.5 Phase 12 Telemetry Compatibility (`options.targetKeys`)
`reconcileStorage` accepts an optional `options.targetKeys` array. This allows operators or automated scripts to feed structured `[ORPHAN_RECONCILIATION_REQUIRED]` telemetry events directly to the reconciliation service for targeted, instant remediation without having to scan the entire bucket.

---

## 5. Key Validation & Security Verification

1. **Strict Namespace Enforcement**: All scans, lookups, and deletions are restricted strictly to `prefix.startsWith('grievances/')`.
2. **Path Traversal Protection**: Every storage key is validated by `storageService.isValidStorageKey`:
   - Enforces length between 12 and 256 characters.
   - Rejects `..`, `\`, null bytes (`\0`), URL encodings (`%`), and fragment/query delimiters (`?`, `#`).
   - Requires regex pattern `^grievances\/[a-zA-Z0-9_-]+(\.[a-zA-Z0-9]+)+$`.
3. **Double-Layer Defense in `deleteFromR2`**: Even if an unsafe key reached `storageService.deleteFromR2`, the method validates the key internally and throws an exception before invoking S3 SDK commands.
4. **Zero-Secret Leakage**: Across dry-run, destructive, error, and targeted reports, zero Cloudflare R2 credentials, secret keys, bucket names, JWT secrets, or MongoDB connection strings are exposed.

---

## 6. Comprehensive Verification Results

### Phase 13 Verification Suite (`scratch/test_phase13_consistency_reconciliation.js`)
All 18 required test scenarios passed with 44/44 successful assertions:

| # | Test Scenario | Verification Details | Result |
|---|---|---|:---:|
| 1 | Healthy Mongo + R2 | Paired items classified as `HEALTHY`, 0 deletions | **PASS** |
| 2 | Mongo-Only Reference | Missing R2 object flagged as `MISSING_R2_OBJECT`, Mongo record preserved | **PASS** |
| 3 | R2-Only Orphan | Age $< 24\text{h}$ classified as `RECENT_UNREFERENCED`; age $> 24\text{h}$ classified as `ORPHAN_R2_OBJECT` | **PASS** |
| 4 | Neither Exists | Non-existent target key classified as `NOT_FOUND_BOTH`, 0 destructive actions | **PASS** |
| 5 | Malformed Storage Key | Path traversal and wrong namespace flagged as `MALFORMED_METADATA` | **PASS** |
| 6 | Invalid Attachment Metadata | Duplicate key collisions across grievances detected and logged | **PASS** |
| 7 | Orphan Cleanup Success | Destructive run purges eligible orphan via `deleteFromR2`, `reconciled: true` | **PASS** |
| 8 | Orphan Cleanup Failure | S3 503 error reports status `PARTIAL`, logs in `deletionFailures` without crashing | **PASS** |
| 9 | Repeated Reconciliation | Sequential runs are idempotent; second run finds 0 orphans | **PASS** |
| 10 | Concurrent Reconciliation | Overlapping run rejected with `CONCURRENT_RUN_CONFLICT` | **PASS** |
| 11 | R2 Transient Failure | R2 timeout returns status `FAILED`, 0 deletions attempted | **PASS** |
| 12 | MongoDB Transient Failure | MongoDB error returns status `FAILED`, 0 deletions attempted | **PASS** |
| 13 | Bounded Pagination | `maxObjects: 150` strictly halts after 3 pages of 50 items | **PASS** |
| 14 | Multi-Batch Reconciliation | Reconciles multi-page inventories across pagination tokens | **PASS** |
| 15 | Concurrency Reference Guard | Newly attached object during run is detected; deletion is aborted | **PASS** |
| 16 | Zero Secret Leakage | All reports audited for credentials, bucket names, and connection strings | **PASS** |
| 17 | Telemetry Compatibility | Ingests Phase 12 telemetry key via `options.targetKeys` and purges orphan | **PASS** |
| 18 | Authorization Boundaries | Preserves `protect` and `photoAccessLimiter` on `/photo` route | **PASS** |

### Cumulative Verification Suite (Phases 4–13)
| Test Suite | Focus | Results |
|:---|:---|:---:|
| `test_phase4_backend.js` | Sharp, R2 Foundation & Grievance Schema | **26 / 26 PASSED** |
| `test_phase5_integration.js` | Multipart & JSON Submission Integration | **34 / 34 PASSED** |
| `test_phase6_viewing.js` | Scope Authorization Matrix & Presigned URLs | **36 / 36 PASSED** |
| `test_phase7_resilience.js` | Early Failure & Compensating Transactions | **39 / 39 PASSED** |
| `test_phase8_consistency.js` | Mongo $\leftrightarrow$ R2 Consistency Baseline | **54 / 54 PASSED** |
| `test_phase9_security.js` | Security Hardening & Authorization Audit | **44 / 44 PASSED** |
| `test_phase10_web_pwa.js` | Web/PWA Photo Evidence & Service Worker | **54 / 54 PASSED** |
| `test_phase11_mobile.js` | React Native / Expo Photo Evidence Workflow | **64 / 64 PASSED** |
| `test_phase12_failure_retry.js` | Comprehensive Failure, Retry & Resilience Suite | **69 / 69 PASSED** |
| `test_phase13_consistency_reconciliation.js` | Long-Lived Consistency & Concurrency Hardening | **44 / 44 PASSED** |
| **Total Cumulative Tests** | **All Verification Suites (Phases 4–13)** | **464 / 464 PASSED (100%)** |

### Static Analysis & Build Verification
* **Mobile TypeScript**: `npx tsc --noEmit` in `mobile/` passed with **0 errors**.
* **Web Production Build**: `npm run build` in `client/` passed with **0 errors, 0 warnings** (`Compiled successfully.`).

---

## 7. Known Limitations & Unresolved Concerns

1. **Single-Region Concurrency**: The in-memory concurrency lock (`isServiceReconciling`) guards against overlapping runs within the same Node process. If deployed across multiple horizontal Render instances, multi-instance concurrency is mitigated by scheduling reconciliation as an isolated one-off cron job or maintenance task rather than concurrent automated HTTP hits.
2. **No Automatic Attachment Repair for State 2**: If an R2 object is permanently lost due to upstream provider corruption, the portal intentionally does not fabricate or replace it. The citizen or investigating officer must submit a follow-up timeline update with replacement photo evidence.

---

## 8. Deployment Confirmation

**Deployment was NOT performed.** All changes are staged and committed strictly on working branch `v2.0.0-photo-evidence`. Deployment remains reserved for Phase 17.

