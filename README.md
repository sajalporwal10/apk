# Nifty 500 Camarilla Screener App

## Overview
This is a Flet-based Android application that scans Nifty 500 stocks for Camarilla pivot points and allows you to add comments/notes to them.

## Installation & Running Locally
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Run the app:
   ```bash
   python main.py
   ```

## Building the APK (Android App)
Building an APK requires the Flutter SDK and Android SDK.

### Option 1: Build via GitHub Actions (Recommended)
You can build the APK easily without installing anything on your computer:
1. Upload this folder to a GitHub repository.
2. Go to the "Actions" tab in your repository.
3. Select the "Build APK" workflow (it runs automatically on push).
4. Once completed, download the artifact named `nifty500-release` which contains the APK file.
5. Install the APK on your Android device.

### Option 2: Build Locally
If you have Flutter and Android SDK installed:
1. Install Flet:
   ```bash
   pip install flet
   ```
2. Build the APK:
   ```bash
   flet build apk
   ```
   The output located in `build/app/outputs/flutter-apk/app-release.apk`.
