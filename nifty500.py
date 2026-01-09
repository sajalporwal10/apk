#!/usr/bin/env python3
"""
fetch_nifty500_monthly_camarilla.py

Fetch last completed monthly OHLC for NIFTY 500 tickers and compute:
 - Camarilla R3 = Close + (High - Low) * 1.1 / 4
 - C3 (central pivot) = (High + Low + Close) / 3

Outputs CSV: nifty500_monthly_camarilla_YYYYMMDD.csv

Usage:
    python fetch_nifty500_monthly_camarilla.py
    python fetch_nifty500_monthly_camarilla.py --limit 20 --out sample.csv

Assumptions:
 - Monthly Camarilla levels use the *last completed calendar month* H/L/C as inputs.
 - R3 formula: R3 = C + (H-L) * 1.1 / 4.
 - C3 (central pivot) used here = (H + L + C) / 3.
"""
import io
import argparse
import time
import sys
from datetime import datetime, timedelta
import requests
import pandas as pd
import yfinance as yf
from tqdm import tqdm

NIFTY500_CSV_URL = "https://www.niftyindices.com/IndexConstituent/ind_nifty500list.csv"
CAM_MULT = 1.1  # standard expansion factor used in many Camarilla formulas

def fetch_nifty500_symbols(csv_url=NIFTY500_CSV_URL):
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    r = requests.get(csv_url, headers=headers, timeout=30)
    r.raise_for_status()
    df = pd.read_csv(io.StringIO(r.text))
    # try to find a symbol-like column
    col_candidates = [c for c in df.columns if any(x in c.lower() for x in ("symbol", "ticker", "code"))]
    if col_candidates:
        sym_col = col_candidates[0]
    else:
        # fallback
        for name in ("Code", "Symbol", "Ticker"):
            if name in df.columns:
                sym_col = name
                break
        else:
            sym_col = df.columns[0]
    symbols = df[sym_col].astype(str).str.strip().tolist()
    yahoo_symbols = []
    for s in symbols:
        s = s.upper()
        if not s or s.lower() in ("nan",):
            continue
        if s.endswith(".NS") or s.endswith(".BO"):
            yahoo_symbols.append(s)
        else:
            yahoo_symbols.append(s + ".NS")
    # dedupe preserving order
    seen = set()
    out = []
    for t in yahoo_symbols:
        if t not in seen:
            seen.add(t)
            out.append(t)
    return out

def fetch_monthly_df(ticker, period_days=800, max_retries=2):
    """
    Fetch monthly-resampled OHLC using yfinance with interval='1mo'.
    period_days: number of days of history to request; monthly rows are month-end.
    """
    period_str = f"{period_days}d"
    for attempt in range(max_retries + 1):
        try:
            df = yf.download(ticker, period=period_str, interval="1mo", progress=False, auto_adjust=False, threads=False)
            if df is None or df.empty:
                return None
            df = df.copy()
            df.index = pd.to_datetime(df.index)
            if isinstance(df.columns, pd.MultiIndex):
                # Flatten columns: drop the 'Ticker' level, keep 'Price' level
                df.columns = df.columns.get_level_values(0)
            return df
        except Exception:
            time.sleep(1 + attempt)
    return None

def last_completed_month_row(monthly_df, now_ts=None):
    """
    Return the last completed month row (a Series) from a monthly DataFrame.
    If the latest row corresponds to the current month (incomplete), it is ignored.
    """
    if monthly_df is None or monthly_df.empty:
        return None
    if now_ts is None:
        now_ts = datetime.utcnow()

    monthly = monthly_df.sort_index()
    # Filter out rows that belong to the current month/year
    completed = monthly[[not (idx.month == now_ts.month and idx.year == now_ts.year) for idx in monthly.index]]
    if completed.empty:
        # Try dropping last row if nothing else
        if len(monthly) >= 2:
            completed = monthly.iloc[:-1]
        else:
            return None
    return completed.iloc[-1]

def compute_r3_s3(high, low, close, cam_mult=CAM_MULT):
    """
    Camarilla R3 and S3:
      R3 = close + (high - low) * cam_mult / 4
      S3 = close - (high - low) * cam_mult / 4
    """
    diff = high - low
    r3 = close + (diff * cam_mult / 4.0)
    s3 = close - (diff * cam_mult / 4.0)
    return r3, s3

def main(argv=None):
    parser = argparse.ArgumentParser(description="Fetch NIFTY500 monthly OHLC and compute Camarilla R3 and S3")
    parser.add_argument("--out", "-o", default=None, help="Output CSV filename")
    parser.add_argument("--limit", "-l", type=int, default=None, help="Limit to first N tickers (for testing)")
    parser.add_argument("--batch-pause", type=float, default=0.35, help="Pause between requests (seconds)")
    parser.add_argument("--months-history", type=int, default=800, help="Days window to request (approx). Default 800 days (~2+ years)")
    args = parser.parse_args(argv)

    print("Downloading NIFTY 500 symbols...")
    try:
        symbols = fetch_nifty500_symbols()
    except Exception as e:
        print("Failed to fetch NIFTY 500 list:", e, file=sys.stderr)
        return 1

    if args.limit:
        symbols = symbols[: args.limit]

    print(f"Found {len(symbols)} tickers; computing last completed month's R3 and S3 for each...")

    out_rows = []
    now_ts = datetime.utcnow()
    for ticker in tqdm(symbols, desc="tickers"):
        monthly_df = fetch_monthly_df(ticker, period_days=args.months_history)
        if monthly_df is None or monthly_df.empty:
            out_rows.append({
                "ticker": ticker,
                "year_month": None,
                "period_end": None,
                "open": None, "high": None, "low": None, "close": None,
                "r3": None, "s3": None, "pct_range_r3": None,
                "error": "no_data"
            })
            time.sleep(args.batch_pause)
            continue

        row = last_completed_month_row(monthly_df, now_ts=now_ts)
        if row is None or row.empty:
            out_rows.append({
                "ticker": ticker,
                "year_month": None,
                "period_end": None,
                "open": None, "high": None, "low": None, "close": None,
                "r3": None, "s3": None, "pct_range_r3": None,
                "error": "no_completed_month"
            })
            time.sleep(args.batch_pause)
            continue

        h = round(float(row.get("High", float("nan"))))
        l = round(float(row.get("Low", float("nan"))))
        o = round(float(row.get("Open", float("nan"))))
        c = round(float(row.get("Close", float("nan"))))
        r3, s3 = compute_r3_s3(h, l, c)
        r3 = round(r3)
        s3 = round(s3)
        
        pct_range_r3 = ((r3 - s3) / s3 * 100.0) if (s3 is not None and s3 != 0) else None
        
        if pct_range_r3 is None or pct_range_r3 >= 6.5:
            time.sleep(args.batch_pause)
            continue
            
        pct_range_r3 = round(pct_range_r3, 2)

        out_rows.append({
            "ticker": ticker,
            "year_month": row.name.strftime("%Y-%m"),
            "period_end": row.name.strftime("%Y-%m-%d"),
            "open": int(o), "high": int(h), "low": int(l), "close": int(c),
            "r3": int(r3), "s3": int(s3), "pct_range_r3": pct_range_r3,
            "error": ""
        })
        time.sleep(args.batch_pause)

    df = pd.DataFrame(out_rows)
    if not df.empty and "pct_range_r3" in df.columns:
        df = df.sort_values("pct_range_r3", ascending=True)
    out_fn = args.out or f"nifty500_monthly_camarilla_{datetime.utcnow().strftime('%Y%m%d')}.csv"
    df.to_csv(out_fn, index=False)
    print(f"Wrote {len(df)} rows to {out_fn}")
    # Print a short preview for immediate feedback
    preview = df[df["error"] == ""].sort_values("pct_range_r3").head(20)[["ticker","year_month","period_end","open","high","low","close","r3","s3","pct_range_r3"]]
    if not preview.empty:
        print("\nSample (closest pct_range_r3):")
        print(preview.to_string(index=False))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())