# SMART CITIZEN GRIEVANCE PORTAL — V2.0.0 DEPENDENCY & CONFIGURATION FOUNDATION

**Phase:** Phase 3 — Dependency & Configuration Setup  
**Branch:** `v2.0.0-photo-evidence`  
**Status:** Completed Foundation  

---

## 1. Dependencies Added

### Backend (`package.json`)

| Dependency | Version Added | Purpose in V2 Architecture | Runtime Compatibility |
| :--- | :--- | :--- | :--- |
| `multer` | `^2.4.0` | In-memory multipart streaming parser (`uploadSinglePhoto`). Enforces single file and 8 MB ceiling. | Compatible with Express 5 and Node 18–26 |
| `sharp` | `^0.35.4` | C++ libvips image engine for image validation, EXIF stripping, rotation correction, resizing to max 2048×2048, and JPEG encoding (~82 quality). | Native prebuilt binaries for win32-x64 (local) and linux-x64 (Render) |
| `@aws-sdk/client-s3` | `^3.1132.0` | Official AWS SDK v3 client for Cloudflare R2 S3-compatible API operations (`PutObjectCommand`, `DeleteObjectCommand`). | Standard modular AWS SDK v3 |
| `@aws-sdk/s3-request-presigner` | `^3.1132.0` | Generates temporary authorized presigned GET URLs with 300s TTL. | Integrates directly with `@aws-sdk/client-s3` |
| `express-rate-limit` | `^8.7.0` | In-memory throttling for grievance creation and photo presigned access endpoints. | Compatible with Express 5 middleware chain |
| `uuid` | `^14.0.2` | Cryptographically secure UUIDv4 generation for opaque storage keys (`grievances/<uuidv4>.jpg`). | Zero-conflict standard utility |

### Mobile (`mobile/package.json`)

| Dependency | Version Added | Purpose in V2 Architecture | Runtime Compatibility |
| :--- | :--- | :--- | :--- |
| `expo-image-picker` | `~57.0.18` | Native device camera capture and photo gallery selection with pre-upload compression. | Matches Expo SDK `~57.0.18` and React Native `0.86.3` |

### Web (`client/package.json`)
* *No new packages required.* Native HTML5 `<input type="file">`, `FormData`, and Axios are fully sufficient.

---

## 2. Environment Configuration Plan

All V2 configuration parameters follow the project's existing environment variable conventions:

| Variable Name | Classification | Default Value | Purpose |
| :--- | :--- | :--- | :--- |
| `PHOTO_UPLOAD_ENABLED` | Non-secret | `false` | Global kill-switch for photographic evidence. When `false`, photo uploads are rejected and UI inputs are hidden. |
| `R2_ACCOUNT_ID` | Secret | *None* | Cloudflare account identifier for R2 S3 endpoint (`https://<account_id>.r2.cloudflarestorage.com`). |
| `R2_ACCESS_KEY_ID` | Secret | *None* | Cloudflare R2 API token Access Key ID. |
| `R2_SECRET_ACCESS_KEY` | Secret | *None* | Cloudflare R2 API token Secret Access Key. **Never expose to client or mobile.** |
| `R2_BUCKET_NAME` | Non-secret | *None* | Name of the private Cloudflare R2 bucket (e.g. `smart-citizen-grievance-evidence`). |
| `PHOTO_PRESIGNED_EXPIRES_IN` | Non-secret | `300` | Expiration time for temporary signed GET URLs in seconds (5 minutes). |

Template placeholders added to `.env.example`.

---

## 3. Secret Safety Confirmation

1. All credentials remain externalized in `.env` and Render dashboard environment configuration.
2. Root `.gitignore` explicitly ignores `.env` and local environment files.
3. No Cloudflare R2 secrets, API tokens, or credentials are hardcoded or committed to git.
4. Client-side and mobile bundles are completely isolated from R2 secret keys.

---

## 4. Verification Checkpoint

* Backend dependencies verified via `node -e "require('multer'); require('sharp'); require('@aws-sdk/client-s3'); require('@aws-sdk/s3-request-presigner'); require('express-rate-limit'); require('uuid');"`.
* Mobile dependency verified via `expo-image-picker@57.0.18` matching Expo SDK 57.
* Lockfiles updated consistently with zero `--force` or `--legacy-peer-deps` workarounds.
* Safe default `PHOTO_UPLOAD_ENABLED=false` configured.
