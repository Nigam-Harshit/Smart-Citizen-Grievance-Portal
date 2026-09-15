# V2.0.0 Phase 8: MongoDB ↔ Cloudflare R2 Consistency, Orphan Detection & Reconciliation

## 1. Overview & Architectural Principles

In V2.0.0 of the **Smart Citizen Grievance Management & Analytics Portal**, photographic evidence attachments are stored in a private Cloudflare R2 object storage bucket, while grievance metadata, audit history, and attachment references reside in MongoDB Atlas.

Because distributed transactions spanning an object store and a document database cannot be natively atomic without heavyweight external brokers, consistency between MongoDB and Cloudflare R2 relies on:
1. **Synchronous Primary Flow with In-Line Compensating Transactions (Phase 7):**
   - Pre-commit failure: If MongoDB write fails after R2 upload, the backend immediately attempts compensating `deleteFromR2(storageKey)`.
   - If compensating deletion fails, an `[ORPHAN_RECONCILIATION_REQUIRED]` structured log is emitted with full telemetry.
2. **Periodic Non-Destructive Reconciliation Engine (Phase 8):**
   - Independent background audit comparing MongoDB references and Cloudflare R2 bucket state.
   - Zero distributed brokers required: No Redis, Celery, Kafka, SQS, RabbitMQ, or Cloudflare Workers.
   - Operates strictly in **Dry-Run mode by default** (`dryRun: true`). Destructive purging requires explicit operator opt-in (`--delete` flag or `{ "dryRun": false }`).
   - Strict **24-Hour Safety Window**: Objects created recently are protected from deletion to prevent race conditions with in-flight submissions.
   - **Abort Safeguards**: If either MongoDB inventory or Cloudflare R2 listing encounters an error, destructive deletion is completely aborted.

---

## 2. Consistency States & Classification Matrix

During a reconciliation execution, every item is categorized into one of five definitive consistency states:

| State Code | Description | Risk Level | Action (Dry-Run) | Action (Destructive / `--delete`) |
| :--- | :--- | :--- | :--- | :--- |
| **`HEALTHY`** | R2 object exists AND is referenced by an active MongoDB Grievance record. | None | Recorded as healthy. | No action taken. |
| **`MISSING_R2_OBJECT`** | MongoDB references a `storageKey`, but the object does not exist in R2 (or HEAD returns 404). | High (Data Loss / Tamper) | Logged as anomaly with `grievanceId`. | **Non-destructive to DB**: Document metadata is preserved for administrative audit. |
| **`RECENT_UNREFERENCED_OBJECT`** | R2 object exists under `grievances/*` with no MongoDB reference, but `lastModified` is within the safety window (< 24h). | Low (Likely in-flight submission) | Logged as recent unreferenced item. | **Protected from deletion**. Never deleted. |
| **`ORPHAN_R2_OBJECT`** | R2 object exists under `grievances/*` with no MongoDB reference, and `lastModified` is older than the safety window (>= 24h). | Medium (Storage waste) | Flagged as orphan candidate. | **Purged from R2 via `deleteFromR2`**. |
| **`MALFORMED_METADATA`** | MongoDB record contains an attachment with an invalid `storageKey` (outside `grievances/`, path traversal, or shared duplicate key). | High (Integrity issue) | Logged as malformed metadata anomaly. | Flagged in report; never passed to R2 deletion. |

---

## 3. Safety Window Rationale

### The Race Condition
A citizen begins submitting a grievance with a photo:
1. `POST /api/grievances` receives multipart data.
2. The image is normalized and uploaded to R2 at timestamp `T0` with key `grievances/<uuid>.jpg`.
3. An administrative reconciliation run starts concurrently at `T0 + 500ms`.
4. The reconciliation queries MongoDB: the document has not yet been written (`Grievance.create` is pending).
5. If reconciliation immediately deleted unreferenced objects, it would delete the citizen's photo before MongoDB finishes saving!

### The Solution: 24-Hour Safety Window (Default: 86,400,000 ms)
- Any R2 object with `LastModified` within `safetyWindowMs` is classified as `RECENT_UNREFERENCED_OBJECT`.
- Even in destructive mode (`dryRun: false` / `--delete`), recent objects are **strictly skipped and preserved**.
- Only objects older than 24 hours (configurable via `--safety-window-hours=<N>`) are eligible for orphan deletion.

---

## 4. Pagination & Scaling Strategy

Cloudflare R2 (S3-compatible API) limits `ListObjectsV2` responses to at most 1,000 keys per page.
The reconciliation engine handles arbitrary bucket sizes safely:
- Uses `ListObjectsV2Command` with `ContinuationToken` in a loop inside `storageService.listAllObjects`.
- Strictly scopes listing to `prefix: 'grievances/'`.
- Streams keys and metadata (`Key`, `LastModified`, `Size`) into memory without fetching object content/bodies.
- Queries MongoDB using lean projections: `Grievance.find({ 'attachment.storageKey': { $exists: true } }, 'attachment.storageKey _id createdAt')`.
- Fast in-memory hash set indexing allows reconciling hundreds of thousands of records with minimal memory footprint.

---

## 5. Safeguards & Abort Conditions

The reconciliation engine enforces fail-safe design principles:

1. **Dry-Run by Default:**
   - Both CLI (`scripts/reconcileStorage.js`) and API (`POST /api/admin-maintenance/reconcile-storage`) default to `dryRun: true`.
   - Destructive deletion requires explicit `--delete` CLI flag or `{ "dryRun": false }` payload.
2. **Abort on Partial Inventory:**
   - If MongoDB query fails (e.g., timeout, network blip): The run immediately aborts with status `FAILED` and `orphansDeletedCount: 0`.
   - If Cloudflare R2 listing fails: The run immediately aborts with status `FAILED` and `orphansDeletedCount: 0`.
   - If Cloudflare R2 storage is unconfigured: Returns `FAILED` with zero actions.
3. **Strict Namespace & Traversal Protection:**
   - Keys must match `^grievances\/[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$`.
   - Any key containing `..`, `\`, null bytes, or outside the `grievances/` prefix is rejected and skipped.
4. **Non-Destructive to Database:**
   - Missing R2 objects are flagged in reports, but the database records are **never** automatically modified or deleted.

---

## 6. CLI Maintenance Tool Usage

The script is located at `scripts/reconcileStorage.js`.

### Commands
```bash
# Non-destructive audit (Dry-Run mode, default 24h window)
npm run reconcile:dry
# or
node scripts/reconcileStorage.js --dry-run

# Execute destructive orphan cleanup
node scripts/reconcileStorage.js --delete

# Specify custom safety window (e.g., 48 hours)
node scripts/reconcileStorage.js --delete --safety-window-hours=48

# Enable verbose logging of examined keys
node scripts/reconcileStorage.js --verbose
```

### Sample CLI Output
```
[ReconcileStorage] Starting MongoDB <-> Cloudflare R2 Reconciliation...
[ReconcileStorage] Mode: DRY RUN (Audit Only)
[ReconcileStorage] Safety Window: 24 hours (86400000 ms)

============================================================
           RECONCILIATION SUMMARY REPORT
============================================================
Execution ID:            rec_1773605481745_yv0aae
Status:                  COMPLETE
Dry Run:                 YES (No deletions performed)
Duration:                412 ms
MongoDB References:      1,420
Cloudflare R2 Objects:   1,428
Healthy Matches:         1,418
Missing R2 Objects:      2
Recent Unreferenced:     3
Orphan Candidates:       7
Orphans Deleted:         0
Deletion Failures:       0
Malformed Metadata:      0
============================================================
```

---

## 7. Protected Admin Maintenance API

For remote maintenance and monitoring integrations, a protected route is available:

- **Endpoint:** `POST /api/admin-maintenance/reconcile-storage`
- **Authentication:** Requires `x-maintenance-secret` header (or `Authorization: Bearer <AdminJWT>`).
- **Request Body (Dry Run):**
  ```json
  {
    "dryRun": true,
    "safetyWindowHours": 24
  }
  ```
- **Request Body (Destructive Cleanup):**
  ```json
  {
    "dryRun": false,
    "safetyWindowHours": 24
  }
  ```
- **Response Format:**
  ```json
  {
    "success": true,
    "message": "Storage reconciliation audit completed successfully (Dry Run).",
    "report": {
      "executionId": "rec_1773605481745_yv0aae",
      "timestamp": "2026-09-16T01:45:00.000Z",
      "status": "COMPLETE",
      "dryRun": true,
      "summary": {
        "mongoReferencesCount": 1420,
        "r2ObjectsCount": 1428,
        "healthyCount": 1418,
        "missingR2Count": 2,
        "recentUnreferencedCount": 3,
        "orphanCandidatesCount": 7,
        "orphansDeletedCount": 0,
        "deletionFailuresCount": 0,
        "malformedMetadataCount": 0
      },
      "details": {
        "missingR2Objects": [
          { "storageKey": "grievances/old-missing-id.jpg", "grievanceId": "60d0fe4f5311236168a109ca" }
        ],
        "recentUnreferenced": [
          { "key": "grievances/in-flight-upload.jpg", "lastModified": "2026-09-16T01:30:00.000Z", "size": 312040 }
        ],
        "orphanCandidates": [
          { "key": "grievances/stale-unreferenced.jpg", "lastModified": "2026-09-10T12:00:00.000Z", "size": 521090 }
        ],
        "deletedOrphans": [],
        "deletionFailures": [],
        "malformedMetadata": []
      }
    }
  }
  ```

---

## 8. Production Operations Playbook & Recommendations

1. **Recommended Automation Schedule:**
   - Daily automated dry-run report (`npm run reconcile:dry`) executed via standard scheduler (e.g. system cron, GitHub Actions, or monitoring worker) alerting operators if `missingR2Count > 0` or `orphanCandidatesCount > 50`.
   - Weekly operator-supervised cleanup (`npm run reconcile -- --delete`) to reclaim R2 storage.
2. **Monitoring & Alerting Triggers:**
   - `status === "FAILED"`: Immediate alert. Storage or database connectivity issue.
   - `missingR2Count > 0`: Immediate warning. Indicates potential data loss or manual deletion in R2.
   - `orphansDeletedCount > 0`: Informational notification confirming reclaimed storage space.
3. **Zero Secrets in Logs:**
   - All reconciliation logs, CLI outputs, and API responses strictly omit AWS secret keys, access tokens, and raw connection URIs.
