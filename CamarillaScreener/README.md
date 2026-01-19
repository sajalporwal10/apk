# Camarilla Screener - NIFTY 500 Stock Screener App

A React Native (Expo) Android application that screens NIFTY 500 stocks based on monthly Camarilla pivot points.

## Features

- **Automatic Symbol Fetching**: Downloads the latest NIFTY 500 stock list from NSE
- **Monthly Camarilla Calculations**: Computes R3 and S3 levels using last completed month's data
- **6.5% Range Filter**: Filters stocks with tight consolidation (< 6.5% R3-S3 range)
- **Sorted Results**: Displays stocks sorted by tightest range first
- **Offline Caching**: Stores last scan results for offline viewing
- **CSV Export**: Share/export results as CSV file
- **Beautiful Dark UI**: Modern, premium dark theme with color-coded indicators

## Tech Stack

- **React Native** with Expo
- **TypeScript** for type safety
- **AsyncStorage** for local caching
- **Expo File System** & **Expo Sharing** for CSV export

## Project Structure

```
CamarillaScreener/
├── App.tsx                    # Main application component
├── src/
│   ├── types/
│   │   └── index.ts           # TypeScript type definitions
│   ├── components/
│   │   ├── StockListItem.tsx  # Stock list item component
│   │   ├── StockDetailsModal.tsx # Stock details modal
│   │   ├── ScanProgress.tsx   # Scan progress indicator
│   │   └── index.ts           # Component exports
│   ├── services/
│   │   ├── api.ts             # NIFTY 500 & Yahoo Finance API
│   │   ├── storage.ts         # AsyncStorage caching
│   │   └── export.ts          # CSV export functionality
│   └── utils/
│       └── calculations.ts    # Camarilla pivot calculations
├── app.json                   # Expo configuration
└── package.json               # Dependencies
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Android Studio (for Android builds) or Expo Go app

### Installation

```bash
# Navigate to project directory
cd CamarillaScreener

# Install dependencies
npm install

# Start development server
npm start
```

### Running on Device

**Option 1: Expo Go (Quick Testing)**
```bash
npx expo start
```
Then scan the QR code with Expo Go app on your Android device.

**Option 2: Development Build**
```bash
npx expo run:android
```

### Building APK

**For development APK:**
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build APK
eas build -p android --profile preview
```

**For local APK (without Expo account):**
```bash
# Generate native Android project
npx expo prebuild --platform android

# Navigate to android folder and build
cd android
./gradlew assembleRelease
```

The APK will be in `android/app/build/outputs/apk/release/`

## Camarilla Formulas Used

```
R3 = Close + (High - Low) × 1.1 / 4
S3 = Close - (High - Low) × 1.1 / 4

Range % = ((R3 - S3) / S3) × 100
```

## API Sources

- **NIFTY 500 List**: NSE India (`niftyindices.com`)
- **Stock Data**: Yahoo Finance (via public chart API)

## Notes

- The scan fetches data for ~500 stocks with rate limiting (0.35s delay between requests)
- Full scan takes approximately 3-5 minutes
- Only stocks with range < 6.5% are shown in results
- Results are cached locally for 24 hours

## License

MIT License - Free for personal and commercial use.
