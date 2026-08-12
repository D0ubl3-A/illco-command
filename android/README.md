# iLLCo AI Android / Google Play build

This directory contains the Android release wrapper for `https://illcoai.tech/`.

## Package

- App name: `iLLCo AI`
- Application ID: `tech.illcoai.app`
- Version: `1.0.0` (`versionCode 1`)
- Minimum SDK: 26
- Compile SDK: 36
- Target SDK: 36
- Release artifact: `app/build/outputs/bundle/release/app-release.aab`

## Build locally

Open the `android/` directory in Android Studio, or use JDK 17 + Gradle 8.13:

```bash
gradle bundleRelease
```

## Signed Play Store build

Never commit the upload keystore or its passwords. The GitHub Actions workflow supports these repository secrets:

- `ANDROID_KEYSTORE_BASE64` — base64-encoded upload keystore
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

When those are present, `.github/workflows/android-playstore.yml` creates a signed AAB. Without them, it creates an unsigned validation AAB.

Create and permanently retain one upload key before the first production submission. Google Play uses that upload identity for later releases when Play App Signing is enabled.

Example keystore creation:

```bash
keytool -genkeypair -v -keystore illco-upload.jks -alias illco-upload -keyalg RSA -keysize 4096 -validity 10000
```

Encode it for the GitHub secret:

```bash
base64 -w 0 illco-upload.jks
```

On macOS use:

```bash
base64 -i illco-upload.jks | tr -d '\n'
```

## Google Play submission

Upload the signed `.aab` to Play Console. Complete the store listing, screenshots, app icon, privacy policy, Data safety form, content rating, app access instructions if any login-gated functionality exists, and testing/release requirements shown in the account.

The Android app intentionally requests only Internet/network access plus legacy download storage access capped at API 28. HTTPS-only network security is enforced.
