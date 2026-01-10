import flet as ft
import time
import requests
import csv
import io

# --- Core Logic (Pure Python version) ---

NIFTY500_CSV_URL = "https://www.niftyindices.com/IndexConstituent/ind_nifty500list.csv"
CAM_MULT = 1.1

def fetch_nifty500_symbols():
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
        r = requests.get(NIFTY500_CSV_URL, headers=headers, timeout=30)
        r.raise_for_status()
        
        # Parse CSV using standard library
        f = io.StringIO(r.text)
        reader = csv.DictReader(f)
        
        # Normalize column names to find the symbol column
        fieldnames = [fn.strip() for fn in reader.fieldnames] if reader.fieldnames else []
        sym_col = None
        for col in fieldnames:
             if "symbol" in col.lower() or "ticker" in col.lower() or "code" in col.lower():
                 sym_col = col
                 break
        
        if not sym_col and fieldnames:
            sym_col = fieldnames[0] # Fallback
            
        yahoo_symbols = []
        for row in reader:
            # reader keys might match original fieldnames (with spaces?)
            # DictReader uses the keys from fieldnames (which we haven't stripped in the reader obj, only in our list)
            # So let's find the specific key in row that matches our sym_col name
            val = row.get(sym_col)
            if not val:
                 # Try finding key with whitespace
                 for k in row.keys():
                     if k.strip() == sym_col:
                         val = row[k]
                         break
            
            if val:
                s = val.strip().upper()
                if not s or s == "NAN": continue
                if s.endswith(".NS") or s.endswith(".BO"):
                    yahoo_symbols.append(s)
                else:
                    yahoo_symbols.append(s + ".NS")
                    
        return list(set(yahoo_symbols))
    except Exception as e:
        print(f"Error fetching symbols: {e}")
        return []

def get_yahoo_data_pure(ticker):
    try:
        # Range 2y to ensure we get enough monthly data
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1mo&range=2y"
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
        
        if not timestamps or not closes: return None
        
        # Combine into list of dicts for easier processing
        candles = []
        for i in range(len(timestamps)):
            if closes[i] is None: continue # Skip incomplete data
            
            ts = timestamps[i]
            dt = datetime.utcfromtimestamp(ts)
            candles.append({
                "date": dt,
                "high": highs[i] if highs[i] is not None else 0,
                "low": lows[i] if lows[i] is not None else 0,
                "close": closes[i] if closes[i] is not None else 0
            })
            
        return candles
    except Exception as e:
        print(f"Error fetching {ticker}: {e}")
        return None

def process_ticker(ticker):
    candles = get_yahoo_data_pure(ticker)
    if not candles: return None
    
    # Sort just in case
    candles.sort(key=lambda x: x["date"])
    
    now_ts = datetime.utcnow()
    
    # Logic: Find the last COMPLETED month.
    # A candle is "current month" if cand.year == now.year and cand.month == now.month
    # We want the latest candle that is NOT current month.
    
    previous_month_candle = None
    
    # Iterate backwards
    for i in range(len(candles) - 1, -1, -1):
        c = candles[i]
        if not (c["date"].year == now_ts.year and c["date"].month == now_ts.month):
            previous_month_candle = c
            break
            
    if not previous_month_candle:
        return None
        
    h = float(previous_month_candle["high"])
    l = float(previous_month_candle["low"])
    c = float(previous_month_candle["close"])
    
    diff = h - l
    r3 = c + (diff * CAM_MULT / 4.0)
    s3 = c - (diff * CAM_MULT / 4.0)
    
    if s3 == 0: return None
    pct_range = ((r3 - s3) / s3 * 100.0)
    
    # Current Close (from the VERY LATEST candle, even if partial month)
    # Using the last candle in the list for 'Close' price reference
    last_close = float(candles[-1]["close"])
    
    return {
        "ticker": ticker,
        "r3": round(r3, 2),
        "s3": round(s3, 2),
        "pct_range": round(pct_range, 2),
        "close": round(last_close, 2)
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
