# 📱 Smart Citizen Mobile App (React Native + TypeScript)

This directory contains the cross-platform **Smart Citizen Grievance Portal** mobile application built for Android (standalone APK) and iOS (Progressive Web App).

---

## 🏛️ Architecture Overview

```
                      SMART CITIZEN PLATFORM
                             BACKEND
                 https://smart-citizen-grievance-portal.onrender.com
                                │
                  ┌─────────────┼─────────────┐
                  │             │             │
                  ▼             ▼             ▼
               WEBSITE       ANDROID          iOS
            Vercel SPA      Native APK     iOS PWA
                                │
                           GitHub Release
```

- **Framework**: React Native + TypeScript (Expo SDK 57)
- **Backend API**: Live Node.js / Express API on Render (`https://smart-citizen-grievance-portal.onrender.com`)
- **Token Security**: OS-encrypted hardware storage (`expo-secure-store`) for iOS Keychain & Android Keystore
- **Color Identity**: Dark slate `#0F172A`, municipal card `#1E293B`, gold accent `#C9962C`

---

## 🚀 Mobile App Features (V1 Scope)

1. **Splash & Auto-Login**: Validates encrypted hardware JWT token on app launch.
2. **Citizen Registration**: Simplified 3-required-field registration (`Full Name`, `Email`, `Password`).
3. **Citizen Home & Duty Queue**: Real-time unresolved complaint tracking from production database.
4. **Lodge Grievance**: Complaint filing across categories (`Sanitation`, `Water Supply`, `Roads`, `Electricity`, `Public Safety`), priority levels (`Low`, `Medium`, `High`, `Critical`), landmark location, and contact phone prompt if missing from profile.
5. **My Grievances**: Complaint inventory with filter tabs (`All`, `Open`, `In Progress`, `Resolved`) and officer tags.
6. **Grievance Details & 4-Step Stepper**: Complete ticket specs, resolution lifecycle stepper (`Submitted` → `Review` → `Inspection` → `Resolved`), timeline logs, and interactive citizen follow-up response posting.
7. **Profile Settings**: Contact phone & residential address editing, account details, and secure sign-out.

---

## 📦 Building the Android Standalone APK

To build the standalone `.apk` executable locally:

```bash
# 1. Navigate to mobile directory
cd mobile

# 2. Install dependencies
npm install

# 3. Export Android native Hermes bundle
npx expo export --platform android

# 4. Generate Android native workspace (if not present)
npx expo prebuild --platform android

# 5. Build native release APK
cd android
./gradlew assembleRelease
```

The output APK will be generated at:
`mobile/android/app/build/outputs/apk/release/app-release.apk`

---

## 🌐 Zero-Cost ($0) GitHub Release Distribution Procedure

To distribute the Android APK to citizens without paying Google Play Store registration fees ($0 strategy):

1. **Tag a Release Version**:
   ```bash
   git tag -a v1.0.0 -m "Release Smart Citizen Mobile App v1.0.0"
   git push origin v1.0.0
   ```

2. **Publish GitHub Release**:
   - Go to your GitHub repository: `https://github.com/Nigam-Harshit/Smart-Citizen-Grievance-Portal`
   - Click **Releases** → **Draft a new release**.
   - Select tag `v1.0.0`.
   - Title: `Smart Citizen Mobile App v1.0.0 (Android APK)`
   - Attach `app-release.apk` under **Assets**.
   - Publish Release!

3. **Citizen Installation**:
   - Citizens visit the release page on their Android phone: `https://github.com/Nigam-Harshit/Smart-Citizen-Grievance-Portal/releases/latest`
   - Tap `app-release.apk` to download and install directly!
