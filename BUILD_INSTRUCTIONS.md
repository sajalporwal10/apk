# How to Build the Camarilla Screener App

You have the complete source code for the Camarilla Screener Android App. Since the build process requires specific development tools (Android SDK, Java JDK), here is how you can build the APK on your own machine.

## Prerequisites
1.  **Node.js**: Install Node.js (v20 or newer recommended) from [nodejs.org](https://nodejs.org/).
2.  **Java JDK**: Install OpenJDK 17. (Required for Android builds).
3.  **Android Studio**: Install Android Studio and set up the Android SDK.

## Option 1: Build with EAS (Easiest)
If you have an Expo account (free), this is the simplest method as it builds in the cloud.

1.  **Unzip the project**:
    ```bash
    unzip camarilla_screener_source.zip
    cd CamarillaScreener
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Install EAS CLI**:
    ```bash
    npm install -g eas-cli
    ```

4.  **Login to Expo**:
    ```bash
    eas login
    ```

5.  **Build the APK**:
    ```bash
    eas build -p android --profile preview
    ```
    *This will generate a downloadable link for your APK.*

## Option 2: Build Locally (No Account Required)
If you have Android Studio installed and configured:

1.  **Navigate to the project**:
    ```bash
    cd CamarillaScreener
    npm install
    ```

2.  **Generate Android Projects**:
    ```bash
    npx expo prebuild --platform android
    ```

3.  **Build APK with Gradle**:
    ```bash
    cd android
    ./gradlew assembleRelease
    ```

4.  **Locate APK**:
    The built APK will be found at:
    `CamarillaScreener/android/app/build/outputs/apk/release/app-release.apk`

## Troubleshooting
*   **Rate Limiting**: The app is configured with a 1.5-second delay between stock fetches to respect Yahoo Finance's rate limits. If you still see errors, you can increase `REQUEST_DELAY` in `src/services/api.ts`.
*   **Network Errors**: Ensure your device has internet access. The initial scan fetches the NIFTY 500 list from NSE India.
