# V2.0.0 — PHASE 6: SECURE EVIDENCE PHOTO VIEWING DOCUMENTATION

## 1. Overview & Architecture

Phase 6 implements the secure, authenticated viewing pipeline for photographic evidence attachments across Web/PWA and React Native/Expo clients. 

Cloudflare R2 remains strictly **private**. All photographic assets are retrieved via short-lived, cryptographically signed presigned GET URLs generated server-side following a rigorous multi-tier authorization check.

```
Client (Web / Mobile)
   │
   │ Authenticated GET /api/grievances/:id/photo (Bearer JWT)
   ▼
[1] JWT Authentication Middleware (`protect`)
   │
   ▼
[2] IP Rate Limiter (`photoAccessLimiter`, 120 req / 15 min)
   │
   ▼
[3] MongoDB Server-Side Grievance Lookup (`Grievance.findById`)
   │
   ▼
[4] Resource Authorization Matrix
   │ ├─ Citizen: Must match canonical citizen identity / associated IDs
   │ ├─ Officer: Must be the designated assignedTo officer
   │ ├─ Manager: Grievance category must match manager's active scope
   │ └─ Admin: Unconditional full read access
   │
   ▼
[5] Attachment Existence Verification (`grievance.attachment.storageKey`)
   │
   ▼
[6] Cloudflare R2 Presigned GET Generation (`storageService.generatePresignedGetUrl`)
   │
   ▼
Client Receives Temporary URL (Default 300s TTL)
   │
   ▼
Direct Secure Image Rendering (Native <img> or <Image />)
```

---

## 2. Backend Route & Controller Implementation

### 2.1 Route Definition
* **File:** [`routes/grievanceRoutes.js`](../routes/grievanceRoutes.js)
* **Path:** `GET /api/grievances/:id/photo`
* **Middleware Chain:**
  1. `protect` — Validates Bearer JWT, populates `req.user`.
  2. `photoAccessLimiter` — Throttles abusive requests (120 req / 15 min per IP).
  3. `getGrievancePhoto` — Controller handler.

### 2.2 Authorization Matrix in `getGrievancePhoto`
* **File:** [`controllers/grievanceController.js`](../controllers/grievanceController.js)
* **Logical Order of Checks:**
  1. **Authentication:** Rejects unauthenticated requests with HTTP 401.
  2. **Grievance Existence:** If `!grievance`, returns HTTP 404 `{ message: 'Grievance not found' }`.
  3. **Role & Scope Authorization:**
     * **Citizen:** Resolves canonical citizen IDs via `identityHelper.getAllAssociatedIds(req.user._id)`. If grievance citizen ID is not associated, returns HTTP 403.
     * **Field Officer (`officer` / `field_officer`):** Checks `String(grievance.assignedTo) === String(req.user._id)`. If unassigned or assigned to a different officer, returns HTTP 403.
     * **Civic Manager (`manager`):** If manager scope is not `'All'` and does not match `grievance.category`, returns HTTP 403.
     * **System Admin (`admin`):** Granted access across all categories and jurisdictions.
  4. **Attachment Verification:** If `!grievance.attachment || !grievance.attachment.storageKey`, returns HTTP 404 `{ message: 'No photographic evidence attached to this grievance' }`.
  5. **Storage Health:** If R2 environment variables are unconfigured, returns HTTP 503 `{ message: 'Object storage service is temporarily unavailable' }`.
  6. **Presigned URL Generation:** Calls `storageService.generatePresignedGetUrl(grievance.attachment.storageKey)` with expiration governed by `PHOTO_PRESIGNED_EXPIRES_IN` (default: 300 seconds).

### 2.3 API Response Contract
```json
{
  "photoUrl": "https://<account-id>.r2.cloudflarestorage.com/<bucket>/grievances/<uuid>.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...&X-Amz-Date=...&X-Amz-Expires=300&X-Amz-Signature=...",
  "expiresIn": 300,
  "attachment": {
    "originalName": "broken_pipe.jpg",
    "mimeType": "image/jpeg",
    "size": 450123,
    "dimensions": {
      "width": 1280,
      "height": 720
    },
    "uploadedAt": "2026-09-15T18:00:00.000Z"
  }
}
```
* **Security Note:** Neither `storageKey`, internal bucket names, nor AWS/R2 credentials are exposed in the client payload.

---

## 3. Web / PWA Implementation Details

### 3.1 Detail View Integration
* **File:** [`client/src/pages/citizen/GrievanceDetail.js`](../client/src/pages/citizen/GrievanceDetail.js)
* **Lifecycle:** When `grievance.attachment` exists, triggers authenticated `API.get('/api/grievances/${id}/photo')`.
* **UI States:**
  * **Loading:** Clean skeleton indicator ("Retrieving secure evidence photo...").
  * **Error / Fallback:** Graceful alert box ("Evidence photo currently unavailable") with a "↻ Retry Loading Photo" button.
  * **Render:** Displays normalized image thumbnail, filename, size, dimensions, and a "🔍 Click to enlarge" trigger.
  * **Full-Resolution Lightbox:** Accessible modal dialog with click-outside / ESC close semantics.
  * **Absent Attachment:** If the grievance has no attachment (V1 or text-only), the card is completely omitted with zero broken elements.

### 3.2 Service Worker Security Audit
* **File:** [`client/public/sw.js`](../client/public/sw.js)
* **Cross-Origin Bypass:** Added explicit origin check `if (url.origin !== self.location.origin) return;`.
* **Guarantee:** Cloudflare R2 requests carrying temporary AWS authentication signatures are NEVER intercepted, stored, or cached in Service Worker caches, preserving bearer credential confidentiality.

---

## 4. React Native / Expo Mobile Implementation Details

### 4.1 Service Method
* **File:** [`mobile/src/services/grievanceService.ts`](../mobile/src/services/grievanceService.ts)
* Implemented `fetchGrievancePhoto(id: string)` with typed response `GrievancePhotoResponse`.

### 4.2 Screen Integration
* **File:** [`mobile/src/screens/GrievanceDetailScreen.tsx`](../mobile/src/screens/GrievanceDetailScreen.tsx)
* **Behavior:** Automatically fetches presigned URL on mount if `grievance.attachment` is populated.
* **UI States:**
  * Displays loading indicator (`ActivityIndicator`) during presigned URL generation.
  * Displays warning message with `evidenceRetryBtn` if URL request fails or network drops.
  * Renders native `<Image source={{ uri: photoUrl }} resizeMode="cover" />` with `onError` fallback.
  * Renders metadata badge (`originalName`, file size, dimensions).
  * Omitted when `attachment` is absent, preventing unnecessary API calls.

---

## 5. Security & Rate-Limiting Guarantees

1. **Server-Derived Keys:** The client has zero ability to specify or manipulate the target `storageKey`. The key is always read from the authenticated MongoDB grievance record.
2. **Short-Lived Bearer Token:** Presigned URLs expire after 300 seconds (5 minutes).
3. **No Persistent Client Storage:** Presigned URLs are stored only in React/React Native component memory state (`useState`). They are never persisted to `localStorage`, `sessionStorage`, or `AsyncStorage`.
4. **Zero Credential Exposure:** Neither web bundles, mobile JavaScript bundles, nor API responses contain R2 account IDs, access keys, secret keys, or bucket names.
5. **Rate Limiting:** `middleware/rateLimiter.js` caps photo URL generation to 120 requests per 15 minutes per IP.

---

## 6. Verification & Test Coverage

* **Phase 6 Verification Suite (`scratch/test_phase6_viewing.js`):** **36 / 36 PASSED**
  * Group 1: 401 unauthenticated, 404 nonexistent grievance.
  * Group 2: Full authorization matrix (Citizen own vs other, Officer assigned vs other, Manager inside scope vs outside scope, Admin).
  * Group 3: Attachment presence check, server-derived storage key verification, response payload sanitization.
  * Group 4: 503 unconfigured storage, 500 provider exception handling without leaking stack traces.
  * Group 5: PWA Service Worker caching bypass audit.
  * Group 6: Client code credential & storage audit.
* **Phase 5 Regression Suite (`scratch/test_phase5_integration.js`):** **34 / 34 PASSED**
* **Phase 4 Regression Suite (`scratch/test_phase4_backend.js`):** **26 / 26 PASSED**
* **Mobile TypeScript Compilation (`npx tsc --noEmit`):** **0 errors**
* **Web Production Build (`npm run build --prefix client`):** **Compiled successfully**
