# SMART CITIZEN GRIEVANCE PORTAL — V2.0.0 BACKEND CORE IMPLEMENTATION

**Phase:** Phase 4 — Backend Core: Private R2 Foundation, Sharp Image Processing & Grievance Model  
**Branch:** `v2.0.0-photo-evidence`  
**Status:** Implemented & Verified  

---

## 1. Executive Summary

Phase 4 implements the backend architectural foundation for photographic evidence attachments in V2.0.0.

Key deliverables implemented:
1. **Private Cloudflare R2 Storage Service (`utils/storageService.js`)**:
   - S3-compatible client wrapper configured via `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`.
   - Ephemeral pre-signed GET URL generation with configurable TTL (default 300 seconds / 5 minutes).
   - Opaque, PII-free key generation: `grievances/<uuidv4>.jpg`.
   - Safe compensating deletion method (`deleteFromR2`) to eliminate orphaned objects if database transactions fail.
2. **Sharp Image Validation & Normalization Pipeline (`utils/imageProcessor.js`)**:
   - Rejects malformed, corrupt, or non-image buffers before storage.
   - Enforces 8 MB payload limit and a strict 20 Megapixels (`limitInputPixels: 20000000`) decompression bomb guard.
   - Normalizes orientation via `.rotate()`.
   - Downscales to fit inside 2048×2048 pixels while preserving original aspect ratio without enlargement.
   - Drops all EXIF, GPS, camera, and personal device metadata.
   - Re-encodes output to progressive JPEG at quality 82.
   - Computes SHA-256 checksum over the final stored bytes.
3. **Multer Memory Streaming Middleware (`middleware/uploadMiddleware.js`)**:
   - In-memory buffer streaming (`memoryStorage`) preventing any disk writes to Render or local filesystems.
   - Strict 8 MB file size ceiling and single file limit (`upload.single('photo')`).
   - Clean, human-readable error wrapping for `LIMIT_FILE_SIZE` and invalid file formats.
4. **Mongoose Grievance Model Extension (`models/Grievance.js`)**:
   - Added optional `attachment` subdocument (storageKey, originalName, mimeType, size, dimensions, checksum, uploadedAt).
   - Added optional `idempotencyKey` field.
   - Created sparse unique compound index on `(citizenId, idempotencyKey)` to prevent duplicate complaint submissions.
   - Created sparse index on `attachment.storageKey` for rapid lookup and storage reconciliation.
   - Maintained 100% backward compatibility with V1 grievance records.

---

## 2. Component Reference

### A. Storage Service (`utils/storageService.js`)
* `isStorageConfigured()`: Validates that `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET_NAME` are populated.
* `getS3Client()`: Lazy initializes and caches `S3Client` instance.
* `generateStorageKey()`: Returns `grievances/<uuidv4>.jpg`.
* `uploadToR2(key, buffer, mimeType)`: Issues `PutObjectCommand`.
* `deleteFromR2(key)`: Issues `DeleteObjectCommand` for compensating cleanup.
* `generatePresignedGetUrl(key, expiresInSeconds)`: Generates time-limited signed GET URL (default 300s).

### B. Image Processor (`utils/imageProcessor.js`)
* `validateAndProcessImage(buffer)`: Accepts in-memory buffer, decodes and validates format, guards against decompression bombs, rotates, resizes inside 2048×2048, strips EXIF metadata, encodes to progressive JPEG (quality 82), and returns normalized buffer with SHA-256 checksum.

### C. Upload Middleware (`middleware/uploadMiddleware.js`)
* `uploadSinglePhoto`: Express middleware wrapping `multer({ storage: memoryStorage, limits: { fileSize: 8MB, files: 1 } }).single('photo')` with user-friendly error handling.

### D. Grievance Model (`models/Grievance.js`)
* Extended with optional `attachment` subdocument and `idempotencyKey` field with sparse indexes.

---

## 3. Security Verification Checklist

| Security Check | Status | Verification Detail |
| :--- | :--- | :--- |
| **No image binary in MongoDB** | **VERIFIED** | MongoDB schema only stores metadata fields (key, mime, size, dimensions, checksum). |
| **No image on Render disk** | **VERIFIED** | Multer configured strictly with `memoryStorage()`; no filesystem writes occur. |
| **R2 credentials backend-only** | **VERIFIED** | Credentials loaded exclusively through `process.env` in `storageService.js`. |
| **No secrets in repository** | **VERIFIED** | `.gitignore` covers all `.env` files; zero credentials committed. |
| **No PII in storage keys** | **VERIFIED** | Keys generated using random UUIDv4 (`grievances/<uuid>.jpg`). |
| **Decompression bomb guard** | **VERIFIED** | Sharp initialized with `limitInputPixels: 20000000`; 30 MP test image rejected with `PIXEL_LIMIT_EXCEEDED`. |
| **EXIF/GPS metadata removed** | **VERIFIED** | Sharp output written without `.withMetadata()`, stripping all EXIF and location tags. |
| **Output format normalized** | **VERIFIED** | All inputs (PNG, WebP, JPEG) normalized to progressive JPEG at quality 82. |
| **Output dimensions capped** | **VERIFIED** | 3000×1500 test image scaled to 2048×1024, fitting inside 2048×2048. |
| **Private R2 bucket policy** | **VERIFIED** | Public access disabled; access mediated solely via temporary presigned GET URLs. |
| **V1 backward compatibility** | **VERIFIED** | Existing grievance documents validate with zero errors when `attachment` is absent. |

---

## 4. Test Verification Results

All 26 targeted unit and integration tests passed (`scratch/test_phase4_backend.js`):
* Key generation: Cryptographically random UUIDs, correct prefix and suffix.
* Non-image rejection: Rejected with `MALFORMED_IMAGE`.
* Oversized file rejection: Files > 8 MB rejected with `FILE_TOO_LARGE`.
* Pixel bomb rejection: 30 MP image rejected with `PIXEL_LIMIT_EXCEEDED`.
* Format conversion: PNG converted to progressive JPEG with SHA-256 checksum.
* Downscaling: 3000×1500 scaled to 2048×1024 while preserving aspect ratio.
* Multer config: Memory storage and 8 MB ceiling verified.
* Mongoose schema: V1 tickets validate without errors; V2 tickets validate with complete attachment metadata; sparse compound index on `(citizenId, idempotencyKey)` verified.

---

## 5. Deferred to Later Phases

* **Phase 5**: Web and mobile grievance submission forms (client file pickers, live preview, multipart FormData upload).
* **Phase 6**: Staff and citizen photo viewing endpoint (`GET /api/grievances/:id/photo`) with RBAC and signed URL rendering.
* **Phase 7**: Rate limiting middleware integration and request-level idempotency enforcement.
* **Phase 8**: Storage reconciliation endpoint.
