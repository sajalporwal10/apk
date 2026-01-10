import flet as ft
import time
import json
import csv
import io
import threading
from datetime import datetime
import urllib.request
import urllib.error

# --- Core Logic (Pure Python Standard Library) ---

NIFTY500_CSV_URL = "https://www.niftyindices.com/IndexConstituent/ind_nifty500list.csv"
CAM_MULT = 1.1

def fetch_url(url):
    """Helper to fetch URL using standard library urllib"""
    req = urllib.request.Request(
        url, 
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    )
    with urllib.request.urlopen(req, timeout=10) as response:
        return response.read().decode('utf-8')

def fetch_nifty500_symbols():
    try:
        csv_text = fetch_url(NIFTY500_CSV_URL)
        
        # Parse CSV using standard library
        f = io.StringIO(csv_text)
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
        # Return fallback list if fetch fails so app is usable
        return ["RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS"]

def get_yahoo_data_pure(ticker):
    try:
        # Range 2y to ensure we get enough monthly data
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1mo&range=2y"
        json_text = fetch_url(url)
        data = json.loads(json_text)
        
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
    
    # Current Close (using last candle available)
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
    # Theme Setup
    page.title = "Nifty 500 Screener"
    page.theme_mode = ft.ThemeMode.LIGHT
    page.theme = ft.Theme(
        color_scheme_seed=ft.colors.INDIGO,
        visual_density=ft.VisualDensity.COMFORTABLE,
        use_material3=True
    )
    page.bgcolor = ft.colors.GREY_100
    page.padding = 0  
    page.window_width = 400
    page.window_height = 800

    # -- State --
    stocks_data = []
    saved_comments = page.client_storage.get("user_comments") or {}

    # -- Controls --
    
    # Custom Card for Stock
    def create_stock_card(stock):
        has_comment = stock["ticker"] in saved_comments and saved_comments[stock["ticker"]]
        
        range_val = stock['pct_range']
        range_color = ft.colors.GREEN_700 if range_val < 3 else ft.colors.ORANGE_700
        
        return ft.Card(
            elevation=2,
            surface_tint_color=ft.colors.SURFACE_TINT,
            margin=ft.margin.symmetric(vertical=6, horizontal=12),
            content=ft.Container(
                padding=12,
                content=ft.Column([
                    ft.Row([
                        ft.Column([
                            ft.Text(stock['ticker'], size=16, weight=ft.FontWeight.BOLD, color=ft.colors.ON_SURFACE),
                            ft.Text(f"Close: {stock['close']}", size=12, color=ft.colors.GREY_700),
                        ]),
                        ft.Container(expand=True),
                        ft.IconButton(
                            icon=ft.icons.NOTES if has_comment else ft.icons.ADD_COMMENT_OUTLINED,
                            icon_color=ft.colors.PRIMARY if has_comment else ft.colors.GREY_400,
                            tooltip="Add Note",
                            on_click=lambda e: open_comment_dialog(stock)
                        )
                    ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
                    
                    ft.Container(height=8),
                    
                    ft.Row([
                        ft.Container(
                            content=ft.Column([
                                ft.Text("Range", size=10, color=ft.colors.GREY_600),
                                ft.Text(f"{range_val}%", size=14, weight="bold", color=range_color)
                            ]),
                            bgcolor=ft.colors.with_opacity(0.1, range_color),
                            padding=8,
                            border_radius=8,
                            expand=1
                        ),
                        ft.Container(width=8),
                        ft.Container(
                            content=ft.Column([
                                ft.Text("R3 / S3", size=10, color=ft.colors.GREY_600),
                                ft.Text(f"{stock['r3']} / {stock['s3']}", size=14, weight="bold")
                            ]),
                            bgcolor=ft.colors.GREY_200,
                            padding=8,
                            border_radius=8,
                            expand=2
                        )
                    ])
                ])
            )
        )

    results_list = ft.ListView(expand=True, padding=ft.padding.only(bottom=80))

    def show_snack(message, is_error=False):
        page.snack_bar = ft.SnackBar(
            content=ft.Text(message, color=ft.colors.WHITE),
            bgcolor=ft.colors.RED_700 if is_error else ft.colors.GREY_900
        )
        page.snack_bar.open = True
        page.update()

    def save_comment(ticker, comment):
        saved_comments[ticker] = comment
        page.client_storage.set("user_comments", saved_comments)
        page.update()
        render_list()
        show_snack(f"Note saved for {ticker}")

    def open_comment_dialog(stock):
        ticker = stock["ticker"]
        existing_comment = saved_comments.get(ticker, "")
        
        comment_field = ft.TextField(
            value=existing_comment, 
            multiline=True, 
            min_lines=3, 
            max_lines=5,
            label="Analysis Notes",
            border_radius=10,
            filled=True
        )
        
        def close_dlg(e):
            page.dialog.open = False
            page.update()

        def save_dlg(e):
            save_comment(ticker, comment_field.value)
            page.dialog.open = False
            page.update()
            
        dialog = ft.AlertDialog(
            title=ft.Text(f"{ticker}"),
            content=ft.Column([
                ft.ListTile(
                    leading=ft.Icon(ft.icons.ANALYTICS),
                    title=ft.Text("Price Levels"),
                    subtitle=ft.Text(f"R3: {stock['r3']} | S3: {stock['s3']}")
                ),
                comment_field
            ], tight=True, width=300),
            actions=[
                ft.TextButton("Cancel", on_click=close_dlg),
                ft.ElevatedButton("Save", on_click=save_dlg),
            ],
            actions_alignment=ft.MainAxisAlignment.END,
        )
        
        page.dialog = dialog
        dialog.open = True
        page.update()

    def render_list():
        results_list.controls.clear()
        if not stocks_data:
            # Empty state
            results_list.controls.append(
                ft.Container(
                    content=ft.Column([
                        ft.Icon(ft.icons.SEARCH_OFF, size=50, color=ft.colors.GREY_400),
                        ft.Text("No stocks found (< 6.5% range)", color=ft.colors.GREY_500)
                    ], horizontal_alignment=ft.CrossAxisAlignment.CENTER),
                    alignment=ft.alignment.center,
                    padding=40
                )
            )
        else:
            for stock in stocks_data:
                results_list.controls.append(create_stock_card(stock))
        page.update()

    def run_scan(e):
        # Disable FAB
        fab.disabled = True
        fab.content = ft.ProgressRing(width=20, height=20, stroke_width=2, color=ft.colors.ON_PRIMARY_CONTAINER)
        page.update()
        
        show_snack("Fetching symbols (limit 30)...")
        
        def scan_thread():
            try:
                symbols = fetch_nifty500_symbols()
                symbols = symbols[:30] if len(symbols) > 0 else [] 
                
                results = []
                total = len(symbols)
                
                for i, tick in enumerate(symbols):
                    res = process_ticker(tick)
                    if res and res["pct_range"] < 6.5: 
                        results.append(res)
                
                results.sort(key=lambda x: x["pct_range"])
                stocks_data.clear()
                stocks_data.extend(results)
                
                scan_complete(len(stocks_data))
                
            except Exception as Ex:
                print(Ex)
                scan_error(str(Ex))

        threading.Thread(target=scan_thread, daemon=True).start()

    def scan_complete(count):
        fab.disabled = False
        fab.content = ft.Icon(ft.icons.REFRESH)
        show_snack(f"Found {count} stocks.")
        render_list()

    def scan_error(err_msg):
        fab.disabled = False
        fab.content = ft.Icon(ft.icons.REFRESH)
        show_snack(f"Error: {err_msg}", is_error=True)
        page.update()

    # -- Layout --
    
    app_bar = ft.AppBar(
        leading=ft.Icon(ft.icons.SHOW_CHART),
        leading_width=40,
        title=ft.Text("Camarilla Screener"),
        center_title=False,
        bgcolor=ft.colors.SURFACE_VARIANT,
        actions=[]
    )
    
    fab = ft.FloatingActionButton(
        icon=ft.icons.REFRESH,
        text="Scan",
        on_click=run_scan,
        bgcolor=ft.colors.PRIMARY_CONTAINER,
    )

    page.add(
        app_bar,
        ft.Container(results_list, expand=True)
    )
    page.floating_action_button = fab

if __name__ == "__main__":
    ft.app(target=main)
