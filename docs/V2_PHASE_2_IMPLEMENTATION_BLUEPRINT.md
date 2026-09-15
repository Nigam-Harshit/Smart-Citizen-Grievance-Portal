# SMART CITIZEN GRIEVANCE PORTAL — V2.0.0 IMPLEMENTATION BLUEPRINT
## Photographic Evidence Attachment Architecture & Exact Change Map

**Document Version:** 2.0.0-draft  
**Target Branch:** `v2.0.0-photo-evidence`  
**Baseline Commit:** `27a63c0`  
**Status:** Frozen Implementation Plan (Phase 2)  

---

## 1. Executive Summary

This document specifies the authoritative, repository-grounded engineering blueprint for implementing **V2.0.0 Photographic Evidence Attachments** in the Smart Citizen Grievance Management & Analytics Portal.

The architecture enforces:
* **One optional photo attachment** per grievance at creation time.
* **Zero image binary persistence in MongoDB** (MongoDB Atlas persists strictly metadata and object references).
* **Zero local disk persistence on Render** (Render's Node.js instance processes uploads purely as ephemeral in-memory buffer streams).
* **Cloudflare R2** private object storage with server-generated non-identifying UUID keys.
* **Sharp** in-memory validation, EXIF stripping, orientation correction, and progressive JPEG normalization.
* **Strict backend-enforced RBAC and jurisdiction authorization** gating temporary presigned GET URLs (5-minute TTL).
* **Full backward compatibility** with V1 grievances, database records, mobile builds, and Web PWA caching.
* **Compensating transaction cleanup** ensuring zero orphaned R2 objects when MongoDB save operations fail.

---

## 2. Confirmed Repository Current State

* **Backend:** Express `^5.2.1` (`server.js`), Mongoose `^9.2.1` (`models/Grievance.js`), `jsonwebtoken` `^9.0.3` (`middleware/authMiddleware.js`).
* **Existing Middleware:** Only `express.json()` is registered in `server.js`. Multipart body parsing (`multer`) is not present.
* **Image Processing:** No image libraries (`sharp`, `jimp`) currently installed.
* **Object Storage:** No cloud storage SDK (`@aws-sdk/client-s3`) currently installed.
* **Web Client:** React 19 SPA (`client/src/pages/citizen/SubmitGrievance.js`), Axios `^1.13.5` (`client/src/utils/api.js`), Service Worker `smart-citizen-pwa-v2` (`client/public/sw.js`).
* **Mobile Client:** Expo SDK `~57.0.18`, React Native `0.86.3` (`mobile/package.json`), `expo-secure-store` (`~57.0.2`), custom `requestAPI` fetch client (`mobile/src/services/api.ts`).
* **Rate Limiting & Idempotency:** None currently present in the codebase.

---

## 3. Exact File Inventory

### A. Files to MODIFY

| File | Current Responsibility | Required V2 Change | Technical Rationale | Risk | Implementation Phase |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `package.json` | Root backend dependencies | Add `multer`, `sharp`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `express-rate-limit`, `uuid` | Core dependencies for upload processing, image normalization, and R2 presigning | Low | Phase 3 |
| `models/Grievance.js` | Grievance Mongoose schema | Add optional `attachment` subdocument and `idempotencyKey` index | Stores R2 object metadata, dimensions, checksum, and duplicate prevention | Low | Phase 4 |
| `controllers/grievanceController.js` | CRUD, SLA, and scope enforcement | Extend `createGrievance` to handle `req.file` buffer and R2 upload; add `getGrievancePhotoUrl` | Coordinates pipeline and generates temporary signed GET URLs | Medium | Phase 4 & Phase 6 |
| `routes/grievanceRoutes.js` | Route declarations | Add `upload.single('photo')` to `POST /`, add `GET /:id/photo` | Binds multipart middleware and photo access route | Low | Phase 4 & Phase 6 |
| `server.js` | Express app entry point | Register rate limiters, expose feature flag in `/api/health` | Protects API from upload flooding and reports capability to clients | Low | Phase 4 |
| `client/src/pages/citizen/SubmitGrievance.js` | Web grievance form | Add file picker, live preview, remove/replace buttons, FormData submission | Enables web citizens to attach photographic evidence | Medium | Phase 5 |
| `client/src/pages/citizen/GrievanceDetail.js` | Citizen ticket detail view | Fetch signed URL from `GET /api/grievances/:id/photo` and render preview | Allows citizen to view verified evidence photo | Low | Phase 6 |
| `client/src/pages/officer/OfficerGrievances.js` | Officer Kanban view | Add photo badge indicator and modal photo viewer | Field officers inspect evidence before site visits | Low | Phase 6 |
| `client/src/pages/admin/Grievances.js` | Admin/Manager tracker table | Add photo badge indicator and modal photo viewer | Managers/admins inspect evidence during triage/assignment | Low | Phase 6 |
| `mobile/package.json` | Mobile dependencies | Add `expo-image-picker` | Native camera capture and gallery photo selection | Medium | Phase 3 |
| `mobile/app.json` | Expo configuration | Add camera and photo library permission descriptions | Required by iOS and Android runtime permission models | Low | Phase 5 |
| `mobile/src/services/api.ts` | Mobile HTTP client | Support `FormData` without forcing `Content-Type: application/json` or `JSON.stringify` | Permits binary multipart upload over fetch | Low | Phase 5 |
| `mobile/src/services/grievanceService.ts` | Mobile grievance API service | Update `postGrievance` to support FormData; add `fetchGrievancePhotoUrl` | Connects mobile screens to V2 backend endpoints | Low | Phase 5 & Phase 6 |
| `mobile/src/screens/SubmitGrievanceScreen.tsx` | Mobile grievance form | Add camera/gallery picker, preview thumbnail, remove button, FormData submission | Enables mobile citizens to take/select photo | Medium | Phase 5 |
| `mobile/src/screens/GrievanceDetailScreen.tsx` | Mobile ticket detail view | Fetch signed URL and render image thumbnail with tap-to-expand modal | Field staff and citizens view photo on mobile | Low | Phase 6 |

---

### B. Files to CREATE

| Proposed Path | Responsibility | Interface / Exports | Consumers | Justification |
| :--- | :--- | :--- | :--- | :--- |
| `utils/storageService.js` | Cloudflare R2 S3 client wrapper | `uploadToR2(key, buffer, mimeType)`, `deleteFromR2(key)`, `generatePresignedGetUrl(key, expiresInSeconds)` | `grievanceController.js`, maintenance tasks | Isolates AWS SDK calls; centralizes bucket configuration and error mapping. |
| `utils/imageProcessor.js` | Sharp image processing and validation pipeline | `validateAndProcessImage(buffer)` returning `{ buffer, info, metadata }` | `grievanceController.js` | Isolates image decoding, pixel limit guards, orientation fix, EXIF stripping, and JPEG encoding. |
| `middleware/uploadMiddleware.js` | Multer memory storage and upload guards | `uploadSinglePhoto` (multer configured with memoryStorage, 8 MB limit) | `routes/grievanceRoutes.js` | Reusable multipart middleware with centralized error handling for file size violations. |
| `middleware/rateLimiter.js` | Express rate limiters | `createGrievanceLimiter`, `photoAccessLimiter` | `routes/grievanceRoutes.js` | Prevents upload abuse, denial-of-service, and presigned URL spam. |
| `routes/maintenanceRoutes.js` (Extend) | Storage reconciliation endpoint | `POST /api/admin-maintenance/reconcile-storage` | System Administrators | Scans R2 for orphaned objects unreferenced in MongoDB and cleans them safely. |

---

### C. Files Explicitly NOT to Touch

* `models/User.js`: User authentication, roles, password hashes, and scopes are frozen.
* `models/Citizen.js`: Citizen identity profiles and escalation risk formulas are unaffected.
* `models/GrievanceUpdate.js`: Timeline update logs remain purely textual notes.
* `models/AuditLog.js`: Audit log structure is preserved.
* `middleware/authMiddleware.js`: Existing `protect`, `requireRole`, `adminOrManager` guards work perfectly as-is.
* `utils/identityHelper.js`: Dual-identity resolution remains intact.
* `client/public/sw.js`: Service worker already ignores `/api/*` and external storage domains.
* `mobile/src/services/secureStore.ts`: Token persistence works perfectly as-is.
* `controllers/authController.js`: Registration, login, profile updates are frozen.
* `controllers/dashboardController.js`: Analytics and duty queues remain unchanged.

---

## 4. Database Change Plan (`models/Grievance.js`)

The `Grievance` Mongoose schema is extended with an optional `attachment` subdocument and an `idempotencyKey` field.

```javascript
// models/Grievance.js additions
attachment: {
  storageKey: {
    type: String,
    trim: true
  },
  originalName: {
    type: String,
    trim: true
  },
  mimeType: {
    type: String,
    default: 'image/jpeg'
  },
  size: {
    type: Number // Processed JPEG size in bytes
  },
  dimensions: {
    width: { type: Number },
    height: { type: Number }
  },
  checksum: {
    type: String // SHA-256 hex digest of processed buffer
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
},
idempotencyKey: {
  type: String,
  trim: true,
  sparse: true
}
```

### Indexes
* `grievanceSchema.index({ citizenId: 1, idempotencyKey: 1 }, { unique: true, sparse: true });`
* `grievanceSchema.index({ 'attachment.storageKey': 1 }, { sparse: true });`

### Backward Compatibility Guarantee
* Existing grievances without photos have `attachment: undefined`.
* Mongoose schema queries for existing records will return normal documents without errors.
* No data migration script is needed.

---

## 5. Backend Upload & Processing Pipeline

```text
Incoming Request (POST /api/grievances)
  │
  ├─ 1. Rate Limiter (createGrievanceLimiter: max 10 requests / 15 min per user)
  ├─ 2. Authentication (protect middleware verifies JWT)
  ├─ 3. Multer Multipart Middleware (uploadSinglePhoto)
  │      ├─ Storage: memoryStorage (no disk writes)
  │      ├─ File field: 'photo'
  │      ├─ Max files: 1
  │      └─ Max file size: 8 MB (8,388,608 bytes)
  │
  ▼
Grievance Controller (createGrievance)
  │
  ├─ 4. Check Feature Flag:
  │      If req.file exists but PHOTO_UPLOAD_ENABLED !== 'true':
  │      Return HTTP 400 "Photographic evidence uploads are temporarily disabled"
  │
  ├─ 5. Check Idempotency:
  │      If idempotencyKey supplied:
  │      Find existing grievance -> if found, return HTTP 200 with existing doc
  │
  ├─ 6. Validate Text Fields:
  │      Validate title, description, category, location
  │
  ├─ 7. Image Processing Pipeline (imageProcessor.js via Sharp):
  │      ├─ Input validation: Buffer magic bytes match JPEG / PNG / WebP
  │      ├─ Pixel guard: sharp(buffer, { limitInputPixels: 20000000 }) (20 MP max)
  │      ├─ Orientation fix: .rotate() (auto-orient by EXIF orientation tag)
  │      ├─ Resize: .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
  │      ├─ Strip metadata: Default behavior drops EXIF, GPS, camera metadata
  │      ├─ Encode: .jpeg({ quality: 82, progressive: true })
  │      └─ Calculate SHA-256 checksum and metadata (width, height, size)
  │
  ├─ 8. Storage Upload (storageService.js via @aws-sdk/client-s3):
  │      ├─ Key format: grievances/<uuidv4>.jpg (opaque, no PII)
  │      ├─ Command: PutObjectCommand({ Bucket, Key, Body, ContentType: 'image/jpeg' })
  │      └─ Track uploadedKey for rollback
  │
  ├─ 9. Database Persistence (MongoDB Atlas):
  │      Create Grievance with attachment metadata and SLA calculation
  │
  ├─ 10. Compensating Transaction on Failure:
  │      If MongoDB save fails after R2 PutObject succeeded:
  │      Execute deleteFromR2(uploadedKey) immediately to prevent orphan
  │
  └─ 11. Response:
         Return HTTP 201 with created Grievance document
```

---

## 6. Authorization & Photo Access Architecture

Signed URLs are generated on-demand and are never stored in the database.

### Photo Access Endpoint: `GET /api/grievances/:id/photo`

```text
Client Request: GET /api/grievances/:id/photo
Headers: Authorization: Bearer <JWT>
  │
  ├─ 1. Rate Limiter (photoAccessLimiter: max 60 requests / 15 min per user)
  ├─ 2. Authentication: protect middleware verifies JWT and loads req.user
  │
  ▼
Grievance Photo Controller (getGrievancePhotoUrl)
  │
  ├─ 3. Resource Fetch:
  │      Find Grievance by req.params.id
  │      If not found: return HTTP 404 "Grievance not found"
  │
  ├─ 4. Scope & Role Authorization Gate:
  │      ├─ Citizen:
  │      │    Check: getAllAssociatedIds(req.user._id).includes(grievance.citizenId)
  │      │    If false: return HTTP 403 "Access forbidden: You can only view photos for your own grievances"
  │      │
  │      ├─ Field Officer:
  │      │    Check: grievance.assignedTo == req.user._id
  │      │    If false: return HTTP 403 "Access forbidden: Grievance is not assigned to you"
  │      │
  │      ├─ Civic Manager:
  │      │    Check: req.user.scope === 'All' || grievance.category === req.user.scope
  │      │    If false: return HTTP 403 "Access forbidden: Grievance outside your manager jurisdiction"
  │      │
  │      └─ System Admin:
  │           Permitted system-wide
  │
  ├─ 5. Attachment Verification:
  │      Check if grievance.attachment?.storageKey exists
  │      If false: return HTTP 404 "No photographic evidence attached to this grievance"
  │
  ├─ 6. Presigned GET Generation (storageService.js via @aws-sdk/s3-request-presigner):
  │      Command: GetObjectCommand({ Bucket, Key: grievance.attachment.storageKey })
  │      getSignedUrl(s3, command, { expiresIn: 300 }) // 5-minute time-to-live
  │
  └─ 7. Response:
         HTTP 200 JSON:
         {
           "photoUrl": "https://<account>.r2.cloudflarestorage.com/...",
           "expiresIn": 300,
           "metadata": {
             "originalName": grievance.attachment.originalName,
             "size": grievance.attachment.size,
             "dimensions": grievance.attachment.dimensions,
             "uploadedAt": grievance.attachment.uploadedAt
           }
         }
```

---

## 7. Failure, Fallback & Consistency Matrix

| Failure Scenario | Detection Mechanism | User-Facing Result | Backend Action | Cleanup / Compensation |
| :--- | :--- | :--- | :--- | :--- |
| **Incoming file > 8 MB** | Multer `LIMIT_FILE_SIZE` error | HTTP 400: "File exceeds 8 MB limit" | Rejects before Sharp decoding | No storage created; memory released |
| **Malformed/Spoofed Image** | Sharp header/magic byte rejection | HTTP 400: "Invalid or unsupported image file" | Aborts pipeline | No storage created |
| **Decompression Bomb (> 20 MP)** | Sharp `limitInputPixels` exception | HTTP 400: "Image pixel dimensions exceed allowed limit" | Aborts decode | Protects server memory |
| **R2 Upload Network Failure** | S3Client PutObject error | HTTP 500: "Failed to securely store evidence attachment" | Logs error; aborts DB creation | No DB record created |
| **R2 PutObject Succeeded, Mongo Save Failed** | Mongoose `ValidationError` / connection drop | HTTP 500: "Failed to lodge grievance record" | Catches error in controller | **Compensating Delete:** Calls `deleteFromR2(storageKey)`. If delete fails, logs CRITICAL alert for reconciliation. |
| **R2 Object Disappeared / Deleted** | S3Client returns NoSuchKey on signed URL access | HTTP 404: "Attached photographic evidence is temporarily unavailable" | Logs storage discrepancy | Audit log recorded |
| **Duplicate Rapid Click / Network Retry** | `idempotencyKey` matched in MongoDB | HTTP 200: Returns the existing grievance document | Skips second processing and upload | Prevents duplicate tickets |
| **Feature Flag Disabled (`PHOTO_UPLOAD_ENABLED=false`)** | Flag check in controller | HTTP 400: "Photo evidence uploads are currently disabled" | Skips upload pipeline | No upload created |

---

## 8. Storage Reconciliation Plan (`routes/maintenanceRoutes.js`)

A dedicated maintenance route `POST /api/admin-maintenance/reconcile-storage` handles eventual consistency:

1. **R2 Scan**: Enumerates all keys under `grievances/` prefix in the R2 bucket.
2. **Age Filter**: Ignores files created within the last 2 hours to avoid deleting files from in-flight uploads.
3. **MongoDB Lookup**: Queries all distinct `attachment.storageKey` values from the `Grievance` collection.
4. **Orphan Deletion**: For any R2 key not present in the MongoDB set:
   * Deletes object via `DeleteObjectCommand`.
   * Logs deleted key and byte savings.
5. **Missing Object Detection**: For any MongoDB record whose key is missing from R2:
   * Flags grievance record in audit log for administrative review.
6. **Execution**: Callable on-demand by system administrators using `MAINTENANCE_SECRET`.

---

## 9. Dependency Plan

### Backend Dependencies (`package.json`)
* `multer` (`^1.4.5-lts.1`): Multipart streaming parser with `memoryStorage`.
* `sharp` (`^0.33.5`): High-performance image processing, auto-orientation, EXIF stripping, resizing, and JPEG encoding.
* `@aws-sdk/client-s3` (`^3.758.0`): Official AWS SDK v3 client for Cloudflare R2 S3-compatible operations.
* `@aws-sdk/s3-request-presigner` (`^3.758.0`): Official presigned GET URL generator.
* `express-rate-limit` (`^7.5.0`): IP and user-based throttling.
* `uuid` (`^11.1.0`): Cryptographically secure UUIDv4 generator for opaque storage keys.

### Mobile Dependencies (`mobile/package.json`)
* `expo-image-picker` (`~57.0.0` or compatible with Expo 57): Access to camera capture and native photo library.

### Web Dependencies (`client/package.json`)
* *No new packages required.* Native HTML5 `<input type="file" accept="image/*">`, `FormData`, and `axios` are already present.

---

## 10. Environment Variable Plan

| Variable Name | Purpose | Location | Secret? | Default / Fallback Behavior |
| :--- | :--- | :--- | :--- | :--- |
| `PHOTO_UPLOAD_ENABLED` | Global kill-switch for photographic uploads | Render Dashboard & `.env` | No | Default: `'false'`. When false, photo uploads are rejected and UI hides photo inputs. |
| `R2_ACCOUNT_ID` | Cloudflare Account ID for S3 endpoint | Render Dashboard & `.env` | Yes | Required if `PHOTO_UPLOAD_ENABLED=true`. |
| `R2_ACCESS_KEY_ID` | R2 API Token Access Key | Render Dashboard & `.env` | Yes | Required if `PHOTO_UPLOAD_ENABLED=true`. |
| `R2_SECRET_ACCESS_KEY` | R2 API Token Secret Key | Render Dashboard & `.env` | Yes | Required if `PHOTO_UPLOAD_ENABLED=true`. **NEVER ship to frontend/mobile.** |
| `R2_BUCKET_NAME` | Cloudflare R2 Bucket Name | Render Dashboard & `.env` | No | e.g. `smart-citizen-grievance-evidence` |
| `PHOTO_PRESIGNED_EXPIRES_IN` | TTL for signed GET URLs in seconds | Render Dashboard & `.env` | No | Default: `300` (5 minutes) |

---

## 11. Security Threat Model

| Threat | Attack Surface | Mitigation in V2.0.0 Architecture | Residual Risk |
| :--- | :--- | :--- | :--- |
| **Malicious Executable / Polyglot File** | Upload file input | Sharp parses and decompresses raster pixels; outputs clean re-encoded progressive JPEG buffer. Non-image bytes are dropped. | Negligible |
| **Decompression Bomb (Zip/Pixel Bomb)** | Image decoder memory | Sharp initialized with strict `limitInputPixels: 20000000` (20 MP max). Aborts before memory exhaustion. | Negligible |
| **GPS / PII Leakage in Photo Metadata** | Citizen EXIF data | Sharp strips all EXIF, XMP, IPTC, and location metadata during normalization. | Zero |
| **IDOR / Unauthorized Photo Snooping** | Photo access endpoint | `GET /api/grievances/:id/photo` verifies JWT, role, ownership, assignment, and manager scope before presigning. | Negligible |
| **Direct Cloudflare R2 Bucket Scraping** | Public Internet | R2 bucket is strictly private. Direct access without signed URL returns HTTP 403. | Zero |
| **Presigned URL Interception / Sharing** | Network transmission | URLs expire in 300 seconds (5 minutes); transmitted exclusively over HTTPS. | Low |
| **Predictable / Enumerable Storage Keys** | Storage namespace | Keys use cryptographically random UUIDv4 (`grievances/<uuidv4>.jpg`). No user or grievance IDs in key. | Zero |
| **Denial of Service / Upload Flooding** | Grievance creation endpoint | `express-rate-limit` throttles creation (max 10 / 15 min per citizen); 8 MB buffer cap prevents OOM. | Low |

---

## 12. V1 Regression Boundary

The following existing capabilities are completely decoupled from photo attachments and must continue operating identically:
1. **Text-only Grievance Creation**: `POST /api/grievances` without `req.file` executes standard V1 creation.
2. **Role Authentication & JWT**: `protect`, token refresh, and login are untouched.
3. **SLA Deadlines & Escalation Engine**: SLA deadline calculations and explainable risk scores are untouched.
4. **Officer Assignment & Duty Queues**: Assignment logic and manager category scoping remain identical.
5. **Timeline Updates**: `GrievanceUpdate` timeline comments and status transitions are untouched.
6. **Mobile Token Persistence**: `expo-secure-store` session management remains identical.
7. **PWA Offline Service Worker**: Static asset caching is untouched.

---

## 13. Phased Implementation Sequence (Roadmap for Phases 3–10)

* **Phase 3 — Dependency & Configuration Setup**: Install backend and mobile dependencies; register environment variables.
* **Phase 4 — Backend Core (Upload, Processing & Storage)**: Implement `imageProcessor.js`, `storageService.js`, `uploadMiddleware.js`, and extend `Grievance.js` schema.
* **Phase 5 — Citizen Submission (Web & Mobile)**: Update `SubmitGrievance.js` (Web) and `SubmitGrievanceScreen.tsx` (Mobile) with image capture, preview, and multipart upload.
* **Phase 6 — Staff & Citizen Photo Viewing**: Implement `GET /api/grievances/:id/photo`; update Web detail and Mobile detail screens with authenticated image viewer.
* **Phase 7 — Rate Limiting & Idempotency Integration**: Mount `rateLimiter.js` and enforce `idempotencyKey` handling.
* **Phase 8 — Storage Reconciliation & Maintenance**: Extend `routes/maintenanceRoutes.js` with orphan cleanup.
* **Phase 9 — Integration & Regression Verification**: Validate end-to-end upload, presigned viewing, and V1 backward compatibility.
* **Phase 10 — Production Deployment & Acceptance**: Deploy to Render & Vercel, compile APK, and verify live R2 storage.

---

## 14. Unknowns / Deferred Decisions

1. **R2 Credentials Provisioning**: Actual Cloudflare R2 bucket and token credentials must be supplied by the user in Phase 3.
2. **Mobile Hardware Camera Testing**: Camera capture verification on physical Android hardware requires APK compilation or Expo Go testing in Phase 9.
3. **Exact Sharp Quality Constant**: Baseline set at `82`; fine-tuning based on visual compression ratio deferred to Phase 4 test benchmarks.

---

**BLUEPRINT AUTHORIZED — NO CODEBASE IMPLEMENTATION HAS OCCURRED.**
