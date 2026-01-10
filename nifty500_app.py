import flet as ft
import time
import requests
import pandas as pd
# import yfinance as yf # Removing yfinance to prevent Android crash
from datetime import datetime
import threading

# --- Core Logic (Adapted from original script) ---

NIFTY500_CSV_URL = "https://www.niftyindices.com/IndexConstituent/ind_nifty500list.csv"
CAM_MULT = 1.1

# Helper to fetch data via requests directly
def get_yahoo_data(ticker):
    try:
        # Use Yahoo Finance Chart API
        # Range 5y to ensure we get enough monthly data
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1mo&range=5y"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
        resp = requests.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        
        result = data.get("chart", {}).get("result", [])
        if not result: return None
        
        quote = result[0]
        timestamps = quote.get("timestamp", [])
        indicators = quote.get("indicators", {}).get("quote", [{}])[0]
        
        opens = indicators.get("open", [])
        highs = indicators.get("high", [])
        lows = indicators.get("low", [])
        closes = indicators.get("close", [])
        
        # Create DataFrame
        df_dict = {
            "Open": opens,
            "High": highs,
            "Low": lows,
            "Close": closes
        }
        df = pd.DataFrame(df_dict, index=pd.to_datetime(timestamps, unit='s'))
        df.dropna(inplace=True)
        return df
    except Exception as e:
        print(f"Error fetching {ticker}: {e}")
        return None

def fetch_monthly_data(ticker):
    return get_yahoo_data(ticker)

def process_ticker(ticker):
    # Logic to compute R3/S3
    monthly_df = fetch_monthly_data(ticker)
    if monthly_df is None or monthly_df.empty: return None
    
    now_ts = datetime.utcnow()
    monthly = monthly_df.sort_index()
    completed = monthly[[not (idx.month == now_ts.month and idx.year == now_ts.year) for idx in monthly.index]]
    
    if completed.empty:
        if len(monthly) >= 2: completed = monthly.iloc[:-1]
        else: return None
            
    row = completed.iloc[-1]
    
    h = float(row.get("High", 0))
    l = float(row.get("Low", 0))
    c = float(row.get("Close", 0))
    
    diff = h - l
    r3 = c + (diff * CAM_MULT / 4.0)
    s3 = c - (diff * CAM_MULT / 4.0)
    
    if s3 == 0: return None
    pct_range = ((r3 - s3) / s3 * 100.0)
    
    return {
        "ticker": ticker,
        "r3": round(r3, 2),
        "s3": round(s3, 2),
        "pct_range": round(pct_range, 2),
        "close": round(c, 2)
    }

# --- UI Application ---

def main(page: ft.Page):
    page.title = "Nifty 500 Screener"
    page.theme_mode = ft.ThemeMode.LIGHT
    page.padding = 20

    # -- State --
    stocks_data = []
    
    # Load saved comments from local storage
    # Structure: {"TICKER": "Comment string", ...}
    saved_comments = page.client_storage.get("user_comments") or {}

    # -- Controls --
    results_list = ft.ListView(expand=True, spacing=10)
    status_text = ft.Text("Ready to scan.")
    progress_bar = ft.ProgressBar(visible=False)
    
    def save_comment(ticker, comment):
        saved_comments[ticker] = comment
        page.client_storage.set("user_comments", saved_comments)
        page.update()
        # Refresh list to show updated icon/status if needed
        render_list()

    def open_comment_dialog(stock):
        ticker = stock["ticker"]
        existing_comment = saved_comments.get(ticker, "")
        
        comment_field = ft.TextField(
            value=existing_comment, 
            multiline=True, 
            min_lines=3, 
            max_lines=5,
            label="Your Analysis / Comment"
        )
        
        def close_dlg(e):
            dialog.open = False
            page.update()

        def save_dlg(e):
            save_comment(ticker, comment_field.value)
            dialog.open = False
            page.update()
            
        dialog = ft.AlertDialog(
            title=ft.Text(f"Notes for {ticker}"),
            content=status_text, # Placeholder, replacing with content below
            actions=[
                ft.TextButton("Cancel", on_click=close_dlg),
                ft.TextButton("Save", on_click=save_dlg),
            ],
            actions_alignment=ft.MainAxisAlignment.END,
        )
        # Fix content assignment
        dialog.content = ft.Column([
            ft.Text(f"R3: {stock['r3']}  S3: {stock['s3']}"),
            ft.Text(f"Range: {stock['pct_range']}%", color="green" if stock['pct_range'] < 5 else "orange"),
            ft.Divider(),
            comment_field
        ], tight=True, width=400)
        
        page.dialog = dialog
        dialog.open = True
        page.update()

    def render_list():
        results_list.controls.clear()
        if not stocks_data:
            results_list.controls.append(ft.Text("No stocks found matching criteria."))
        else:
            for stock in stocks_data:
                has_comment = stock["ticker"] in saved_comments and saved_comments[stock["ticker"]]
                
                # Card for each stock
                card = ft.Card(
                    content=ft.Container(
                        content=ft.Column([
                            ft.ListTile(
                                leading=ft.Icon(ft.icons.SHOW_CHART),
                                title=ft.Text(f"{stock['ticker']}"),
                                subtitle=ft.Text(f"Range: {stock['pct_range']}% | Close: {stock['close']}"),
                                trailing=ft.IconButton(
                                    icon=ft.icons.NOTE_ADD if not has_comment else ft.icons.NOTE,
                                    icon_color="blue" if has_comment else "grey",
                                    on_click=lambda e, s=stock: open_comment_dialog(s)
                                ),
                            ),
                            ft.Container(
                                content=ft.Row([
                                    ft.Text(f"R3: {stock['r3']}", weight="bold"),
                                    ft.Text(f"S3: {stock['s3']}", weight="bold"),
                                ], alignment=ft.MainAxisAlignment.SPACE_EVENLY),
                                padding=10
                            )
                        ]),
                        padding=5
                    )
                )
                results_list.controls.append(card)
        page.update()

    def run_scan(e):
        status_text.value = "Fetching symbols..."
        progress_bar.visible = True
        page.update()
        
        # Run in thread to not freeze UI
        def scan_thread():
            symbols = fetch_nifty500_symbols()
            # For demo, limit to first 20 or user argument 
            # In a real app, maybe process in chunks
            symbols = symbols[:20] if len(symbols) > 20 else symbols 
            
            results = []
            
            total = len(symbols)
            for i, tick in enumerate(symbols):
                update_status(f"Scanning {tick} ({i+1}/{total})...")
                res = process_ticker(tick)
                if res and res["pct_range"] < 6.5: # Filter
                    results.append(res)
            
            # Sort by pct range
            results.sort(key=lambda x: x["pct_range"])
            
            stocks_data.clear()
            stocks_data.extend(results)
            
            scan_complete()

        threading.Thread(target=scan_thread, daemon=True).start()

    def update_status(msg):
        status_text.value = msg
        page.update()

    def scan_complete():
        status_text.value = f"Scan complete. Found {len(stocks_data)} stocks."
        progress_bar.visible = False
        render_list()

    # -- Layout --
    page.add(
        ft.Row([
            ft.Text("Camarilla Screener", size=20, weight="bold"),
            ft.IconButton(ft.icons.REFRESH, on_click=run_scan)
        ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
        progress_bar,
        status_text,
        ft.Divider(),
        results_list
    )

if __name__ == "__main__":
    ft.app(target=main)
