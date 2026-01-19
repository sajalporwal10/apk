# Product Requirement Document (PRD): Nifty 500 Camarilla Stock Screener App

## 1. Executive Summary
The goal is to develop an Android application that replicates the functionality of the existing `nifty500.py` Python script. The app will serve as a stock screener tool, automatically fetching NIFTY 500 data, calculating monthly Camarilla pivot points, and filtering key stocks that satisfy a specific "Narrow Range" criterion. This tool is designed to help traders identify potential breakout candidates based on historical monthly data.

## 2. Core Functional Requirements

### 2.1. Data Acquisition (Backend Logic)
The app operates on a "Fetch & Process" model. It involves two distinct data retrieval steps:

1.  **Symbol List Retrieval**:
    *   **Source**: The app must download the latest NIFTY 500 constituents list from the official NSE URL:  
        `https://www.niftyindices.com/IndexConstituent/ind_nifty500list.csv`
    *   **Parsing Logic**: The app must parse this CSV to extract the stock symbols. It generally looks for a column named "Symbol", "Ticker", or "Code".
    *   **Symbol Normalization**: To ensure compatibility with data providers (like Yahoo Finance), the app must append the `.NS` suffix to all symbols (e.g., `RELIANCE` becomes `RELIANCE.NS`).

2.  **Historical Market Data Fetching**:
    *   **Provider**: Yahoo Finance API (or equivalent reliable free source).
    *   **Granularity**: **Monthly** OHLC (Open, High, Low, Close) candles.
    *   **Depth**: Approximately 800 days (~2+ years) of history to ensure accurate monthly closing data is captured.

### 2.2. Calculation Engine
The core value proposition of the app is its specific calculation logic:

*   **Reference Period**: The app must strictly use the **Last Completed Month** for calculations.
    *   *Constraint*: If the current date is January 15th, the app must rely on the full candle from December. It must **ignore** the current incomplete January candle.
*   **Camarilla Pivot Formulas**:
    *   **Inputs**: High (H), Low (L), Close (C) of the reference month.
    *   **R3 (Resistance 3)**: `Close + (High - Low) * 1.1 / 4`
    *   **S3 (Support 3)**: `Close - (High - Low) * 1.1 / 4`
    *   **Rounding**: All calculate values (including displayed OHLC) must be rounded to the nearest Integer.
*   **Range Percentage Calculation**:
    *   **Formula**: `pct_range_r3 = ((R3 - S3) / S3) * 100`
    *   This metric represents the tightness of the trading range.

### 2.3. Screening & Filtering Logic
*   **The "6.5% Rule"**: The app must automatically filter the list of 501 stocks.
*   **Condition**: Any stock with a `pct_range_r3` **>= 6.5%** must be excluded.
*   **Objective**: Only display stocks with narrow consolidation ranges (< 6.5%), as these are prime candidates for high-momentum moves.

### 2.4. Sorting & Output
*   **Sorting**: The final filtered list must be sorted by `pct_range_r3` in **Ascending Order** (Tightest range first).
*   **Required Data Points for Display**:
    *   Stock Ticker (e.g., `RELIANCE.NS`)
    *   Reference Month (e.g., `2025-12`)
    *   Price Data: Open, High, Low, Close
    *   Calculated Levels: R3, S3
    *   Range Metric: `pct_range_r3` (formatted to 2 decimal places)

## 3. App Feature Recommendations

### 3.1. User Interface (UI)
*   **Dashboard / Home Screen**:
    *   Display the list of screened stocks (the "Golden List").
    *   Each list item should clearly show the **Ticker**, **Range %**, and key levels (**R3**, **S3**).
    *   **Visual Cues**: Use color coding (e.g., green for very tight ranges < 2%).
*   **Stock Detail View**:
    *   Tapping a stock from the list should open a detailed view.
    *   Show the full OHLC data for the reference month.
*   **Progress Feedback**:
    *   Fetching 500 stocks takes time. The app must have a **Progress Bar** or counter (e.g., "Scanning 134/501 Stocks...") to keep the user informed during the scan.
    *   **Cancel Option**: Allow the user to stop the scan mid-way.

### 3.2. Technical Constraints & Performance
*   **Rate Limiting**: To avoid IP bans from Yahoo Finance, the app must implement a delay between requests (similar to the script's `0.35s` sleep).
*   **Error Handling**:
    *   The app must generally "fail silently" or log errors for individual delisted stocks without crashing the entire scan.
    *   Skip stocks where data is missing or incomplete for the required month.
*   **Offline Access**:
    *   Once a scan is completed, save the results locally. The user should be able to open the app and see the last scan results without needing to fetch again immediately.

### 3.3. Export & Sharing
*   **CSV Export**: Allow users to export the filtered results as a `.csv` file (matching the current script output), which they can then share via email/WhatsApp or open in Excel.

## 4. Development Terminology Mapping
| Term | Description |
| :--- | :--- |
| **OHLC** | Open, High, Low, Close price data. |
| **R3** | Third level of Camarilla Resistance. |
| **S3** | Third level of Camarilla Support. |
| **Expansion Factor** | The `1.1` multiplier used in the Camarilla formula. |
| **Narrow Range** | A market condition where the difference between High and Low (or R3 and S3) is small relative to the price. |
