# Phase 18: AWS S3 Integration, Cloud Cost Governance & Application Safety Net

## 1. Executive Summary

Phase 18 completes the production cloud storage architecture of the **Smart Citizen Grievance Management & Analytics Portal (V2.0.0)** by replacing Cloudflare R2 object storage with **Amazon Simple Storage Service (AWS S3)** while maintaining seamless backward compatibility, and deploying an institutional-grade **9-Layer Cloud Cost Governor and Safety Net**.

The core system invariants achieved in Phase 18 are:
1. **Private Object Storage with AWS S3**: All photographic evidence is stored in private AWS S3 buckets with AWS Block Public Access enabled, Object Ownership Enforced (BucketOwnerEnforced), and AES256 server-side encryption (SSE-S3). Zero public bucket policies or public ACLs exist.
2. **Backend-Authorized Ephemeral Presigned URLs**: Client applications (Web, PWA, Mobile Android) never hold AWS credentials. Access to evidence images is granted exclusively through short-lived (300-second TTL), backend-generated AWS S3 presigned GET URLs with strict RBAC and IDOR protection.
3. **9-Layer Cost Governor Defense-in-Depth**: An automated, concurrency-safe usage ledger (`models/StorageUsage.js`) enforces hard monthly storage ceilings (2,048 MB default, well below AWS 5 GB free tier), monthly upload limits (1,000 photos), daily throttles (200 photos), per-citizen quotas (20 photos/month), per-IP throttles (30 photos/month), and consecutive-failure circuit breakers.
4. **V1 Grievance Continuity**: When storage limits are reached or circuit breakers trip into `SAFE_MODE`, photographic evidence uploads return HTTP 503 (`PHOTO_STORAGE_SAFE_MODE`), but standard text-only grievance lodging continues succeeding normally with HTTP 201 Created.
5. **100% Backward Compatibility**: All 15 cumulative test suites across Phases 4 through 18 pass cleanly (**619 / 619 assertions passing**), Mobile TypeScript compiles with **0 errors**, Expo Android exports successfully (**1.6 MB**), and Web builds with zero errors.

---

## 2. AWS S3 Integration & Security Architecture

### 2.1 Object Storage Configuration

AWS S3 configuration is managed server-side via standard environment variables:

| Environment Variable | Description | Production Default / Example |
| :--- | :--- | :--- |
| `AWS_REGION` | AWS Regional Endpoint | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | Dedicated IAM Service Account Key | Server-only credential |
| `AWS_SECRET_ACCESS_KEY` | Dedicated IAM Service Account Secret | Server-only credential |
| `S3_BUCKET_NAME` | S3 Evidence Bucket Name | `smart-citizen-evidence` |
| `PHOTO_PRESIGNED_EXPIRES_IN` | Presigned GET URL Expiration TTL | `300` (5 minutes) |
| `AWS_S3_ENDPOINT` | Optional local S3 endpoint override | Optional (LocalStack/MinIO) |

### 2.2 Least-Privilege IAM Policy

The backend service account requires only the minimum permissions necessary to manage evidence attachments under the `grievances/*` namespace:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowEvidenceObjectOperations",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::smart-citizen-evidence/grievances/*"
    },
    {
      "Sid": "AllowEvidenceNamespaceListing",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::smart-citizen-evidence",
      "Condition": {
        "StringLike": {
          "s3:prefix": [
            "grievances/*",
            "grievances/"
          ]
        }
      }
    }
  ]
}
```

### 2.3 S3 Bucket Security Baseline

1. **Block Public Access (All 4 settings enabled)**:
   - `BlockPublicAcls: true`
   - `IgnorePublicAcls: true`
   - `BlockPublicPolicy: true`
   - `RestrictPublicBuckets: true`
2. **Object Ownership**: Enforced (`BucketOwnerEnforced`), completely disabling ACLs.
3. **Default Encryption**: Server-Side Encryption with Amazon S3 managed keys (`SSE-S3`, `AES256`).
4. **Transport Security**: Bucket policy enforcing `aws:SecureTransport: true` (HTTPS only).

---

## 3. 9-Layer Defense-in-Depth Cost Governor Architecture

To prevent uncontrolled cloud expenditure, storage exhaustion, or denial-of-wallet attacks, Phase 18 deploys a comprehensive 9-layer defense model:

```text
Request Intake
  │
  ├─► Layer 1: Global Administrative Feature Flag (PHOTO_UPLOAD_ENABLED=false -> HTTP 400)
  │
  ├─► Layer 2: Express Rate Limiter (createGrievanceLimiter: 10 req / 15m)
  │
  ├─► Layer 3: Multer Pre-Buffer Payload Size Ceiling (8 MB hard reject)
  │
  ├─► Layer 4: Client Quotas (Per-Citizen: 20/mo, Per-IP: 30/mo, Daily: 200/day)
  │
  ├─► Layer 5: Atomic Concurrency-Safe Quota Reservation ($expr check on monthly limit)
  │
  ├─► Layer 6: Sharp Normalization (2048px max edge, 80% JPEG, strip EXIF metadata)
  │
  ├─► Layer 7: Private AWS S3 PutObject with SSE-S3 AES256 Encryption
  │
  ├─► Layer 8: Compensating Transaction on DB Failure (S3 delete + quota release)
  │
  └─► Layer 9: Consecutive Failure Circuit Breaker (5 failures -> auto-trip SAFE_MODE)
```

### 3.1 MongoDB Storage Usage Ledger (`models/StorageUsage.js`)

Storage consumption is tracked in monthly ledger documents keyed by `period` (`YYYY-MM`):

* `totalUploads`: Cumulative count of successful evidence uploads.
* `totalStoredBytes`: Total stored size in bytes across all active attachments.
* `reservedBytes`: In-flight quota currently reserved by concurrent upload requests.
* `photoAccessRequests`: Number of presigned GET URL requests issued.
* `uploadFailures`: Cumulative count of failed upload operations.
* `consecutiveFailures`: Current run of consecutive failures (resets on successful commit).
* `status`: Current governor state (`ACTIVE`, `SAFE_MODE`, `DISABLED`).
* `safeModeReason`: Reason for circuit breaker tripping.
* `dailyUsage`: Itemized daily breakdown (`date`, `uploads`, `bytes`).
* `userUsage`: Itemized citizen breakdown (`userId`, `uploads`).
* `ipUsage`: Itemized network breakdown (`ip`, `uploads`).

### 3.2 Atomic Quota Reservation Mathematics

To eliminate concurrency race conditions where multiple simultaneous uploads bypass monthly limits, `costGovernorService.reserveUploadQuota` executes an atomic `$findOneAndUpdate` leveraging `$expr`:

$$\text{totalStoredBytes} + \text{reservedBytes} + \text{resBytes} \le \text{maxStorageBytes}$$

```javascript
const updated = await StorageUsage.findOneAndUpdate(
  {
    period,
    status: 'ACTIVE',
    totalUploads: { $lt: limits.monthlyUploadLimit },
    $expr: {
      $lte: [
        { $add: ['$totalStoredBytes', '$reservedBytes', resBytes] },
        maxStorageBytes
      ]
    }
  },
  { $inc: { reservedBytes: resBytes } },
  { new: true }
);
```

If the atomic reservation fails:
* If monthly upload or byte ceilings are exceeded, the governor automatically trips the period's circuit breaker into `SAFE_MODE`.
* The incoming request is cleanly rejected with HTTP 503 (`PHOTO_STORAGE_SAFE_MODE`).
* Concurrently executing requests cannot over-allocate storage.

---

## 4. Administrative Endpoints & Safe Mode Reset

Two new administrative maintenance endpoints are exposed under `/api/admin-maintenance`, protected by constant-time secret comparison (`safeSecretCompare`) and the `maintenanceLimiter`:

### 4.1 Storage Telemetry (`GET /api/admin-maintenance/storage-usage`)

Returns comprehensive telemetry including monthly usage, remaining quotas, and current utilization percentage:

```json
{
  "period": "2026-09",
  "status": "ACTIVE",
  "safeModeReason": null,
  "totalUploads": 4,
  "totalStoredBytes": 5242880,
  "totalStoredMB": 5.0,
  "reservedBytes": 0,
  "photoAccessRequests": 18,
  "uploadFailures": 0,
  "consecutiveFailures": 0,
  "quota": {
    "monthlyUploadLimit": 1000,
    "monthlyStorageLimitMB": 2048,
    "dailyUploadLimit": 200,
    "remainingUploads": 996,
    "remainingStorageMB": 2043.0,
    "utilizationPercent": 0.24
  },
  "lastReconciledAt": "2026-09-17T14:28:00.000Z",
  "updatedAt": "2026-09-17T14:28:00.000Z"
}
```

### 4.2 Circuit Breaker Reset (`POST /api/admin-maintenance/reset-safe-mode`)

Allows authorized administrators to reset `SAFE_MODE` back to `ACTIVE`. The endpoint enforces strict pre-conditions:
* Rejects reset with HTTP 400 if current stored bytes hard-exceeds `PHOTO_MONTHLY_STORAGE_LIMIT_MB`.
* Rejects reset with HTTP 400 if current upload count hard-exceeds `PHOTO_MONTHLY_UPLOAD_LIMIT`.
* On success, resets `status` to `ACTIVE`, clears `safeModeReason`, and zeroes `consecutiveFailures`.

---

## 5. Verification Results

| Test Suite | Scope | Assertions | Status |
| :--- | :--- | :---: | :---: |
| Phase 4 | Backend Core Architecture | 26 / 26 | **PASS (100%)** |
| Phase 5 | Integration & Contracts | 34 / 34 | **PASS (100%)** |
| Phase 6 | Photo Viewing & TTL | 36 / 36 | **PASS (100%)** |
| Phase 7 | Failure, Retry & Resilience | 39 / 39 | **PASS (100%)** |
| Phase 8 | Consistency & Integrity | 54 / 54 | **PASS (100%)** |
| Phase 9 | Security & IDOR Hardening | 44 / 44 | **PASS (100%)** |
| Phase 10 | Web & PWA Implementation | 54 / 54 | **PASS (100%)** |
| Phase 11 | Mobile React Native / Expo | 64 / 64 | **PASS (100%)** |
| Phase 12 | Failure/Retry Hardening | 69 / 69 | **PASS (100%)** |
| Phase 13 | S3/R2 Reconciliation Engine | 44 / 44 | **PASS (100%)** |
| Phase 14 | Deep Security & Adversarial Audit | 45 / 45 | **PASS (100%)** |
| Phase 15 | Full Regression Gate | 33 / 33 | **PASS (100%)** |
| Phase 16 | Real Device Verification | 36 / 36 | **PASS (100%)** |
| Phase 17 | Production Deployment Verification | 18 / 18 | **PASS (100%)** |
| Phase 18 | **AWS S3 & Cost Governance** | **23 / 23** | **PASS (100%)** |
| **Grand Total** | **Cumulative Test Corpus** | **619 / 619** | **PASS (100%)** |

### Client Artifact Verifications
* **Mobile TypeScript**: `npx tsc --noEmit` -> **0 errors**.
* **Mobile Android Expo**: `npx expo export --platform android` -> **Successful bundle (1.6 MB)**.
* **Web Production Build**: `npm run build` -> **Successful production build**.

