import flet as ft
import traceback

def main(page: ft.Page):
    page.title = "Debug Mode"
    page.scroll = "adaptive"
    
    # 1. Immediate "Hello World" to prove Flet is working
    status_text = ft.Text("Initializing Application...\nIf you see this, Flet is running.", size=20)
    error_text = ft.Text("", color="red", selectable=True)
    page.add(status_text, error_text)
    page.update()

    try:
        # 2. Deferred Imports (lazy load everything else)
        import time
        import json
        import csv
        import io
        import threading
        from datetime import datetime
        import urllib.request
        import urllib.error
        
        status_text.value += "\nImports successful."
        page.update()

        # --- Core Logic ---
        NIFTY500_CSV_URL = "https://www.niftyindices.com/IndexConstituent/ind_nifty500list.csv"
        CAM_MULT = 1.1

        def fetch_url(url):
            req = urllib.request.Request(
                url, 
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
            )
            context = None
            # Attempt to ignore SSL errors if that's the blocker
            try:
                import ssl
                context = ssl._create_unverified_context()
            except:
                pass
                
            with urllib.request.urlopen(req, timeout=10, context=context) as response:
                return response.read().decode('utf-8')

        def fetch_nifty500_symbols():
            try:
                csv_text = fetch_url(NIFTY500_CSV_URL)
                f = io.StringIO(csv_text)
                reader = csv.DictReader(f)
                
                # Normalize column names
                fieldnames = [fn.strip() for fn in reader.fieldnames] if reader.fieldnames else []
                sym_col = None
                for col in fieldnames:
                     if "symbol" in col.lower() or "ticker" in col.lower() or "code" in col.lower():
                         sym_col = col
                         break
                if not sym_col and fieldnames: sym_col = fieldnames[0]
                    
                yahoo_symbols = []
                for row in reader:
                    val = row.get(sym_col)
                    if not val:
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
                # Fallback list for offline testing
                return ["RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS"]

        def get_yahoo_data_pure(ticker):
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
            
            candles = []
            for i in range(len(timestamps)):
                if closes[i] is None: continue
                ts = timestamps[i]
                dt = datetime.utcfromtimestamp(ts)
                candles.append({
                    "date": dt,
                    "high": highs[i] if highs[i] is not None else 0,
                    "low": lows[i] if lows[i] is not None else 0,
                    "close": closes[i] if closes[i] is not None else 0
                })
            return candles

        def process_ticker(ticker):
            candles = get_yahoo_data_pure(ticker)
            if not candles: return None
            
            candles.sort(key=lambda x: x["date"])
            now_ts = datetime.utcnow()
            previous_month_candle = None
            
            for i in range(len(candles) - 1, -1, -1):
                c = candles[i]
                if not (c["date"].year == now_ts.year and c["date"].month == now_ts.month):
                    previous_month_candle = c
                    break
                    
            if not previous_month_candle: return None
                
            h = float(previous_month_candle["high"])
            l = float(previous_month_candle["low"])
            c = float(previous_month_candle["close"])
            
            diff = h - l
            r3 = c + (diff * CAM_MULT / 4.0)
            s3 = c - (diff * CAM_MULT / 4.0)
            
            if s3 == 0: return None
            pct_range = ((r3 - s3) / s3 * 100.0)
            last_close = float(candles[-1]["close"])
            
            return {
                "ticker": ticker,
                "r3": round(r3, 2),
                "s3": round(s3, 2),
                "pct_range": round(pct_range, 2),
                "close": round(last_close, 2)
            }

        # --- UI Components ---
        
        status_text.value = "Welcome. Tap scan to start."
        status_text.color = "green"
        page.update()

        stocks_data = []
        results_list = ft.ListView(expand=True, spacing=10)
        
        def run_scan(e):
            status_text.value = "Scanning..."
            status_text.color = "blue"
            page.update()
            
            def scan_thread():
                try:
                    symbols = fetch_nifty500_symbols()
                    symbols = symbols[:20] # Limit
                    
                    results = []
                    for i, tick in enumerate(symbols):
                         try:
                             res = process_ticker(tick)
                             if res and res["pct_range"] < 6.5:
                                 results.append(res)
                         except:
                             pass # Skip individual failures
                    
                    results.sort(key=lambda x: x["pct_range"])
                    stocks_data.clear()
                    stocks_data.extend(results)
                    
                    # Update UI on main thread
                    # (Note: In pure Flet/Python threading, need to be careful with UI updates)
                    # We will just refresh strictly at the end
                    scan_complete_ui()
                except Exception as thread_ex:
                    scan_error_ui(str(thread_ex))
                    
            threading.Thread(target=scan_thread, daemon=True).start()

        def scan_complete_ui():
            results_list.controls.clear()
            for stock in stocks_data:
                results_list.controls.append(
                    ft.Card(content=ft.Container(padding=10, content=ft.Column([
                        ft.Text(f"{stock['ticker']} ({stock['pct_range']}%)", weight="bold"),
                        ft.Text(f"R3: {stock['r3']} S3: {stock['s3']}")
                    ])))
                )
            status_text.value = f"Done. Found {len(stocks_data)}"
            status_text.color = "black"
            page.update()

        def scan_error_ui(msg):
            status_text.value = f"Scan Error: {msg}"
            status_text.color = "red"
            page.update()

        page.add(
            ft.ElevatedButton("Scan Market", on_click=run_scan),
            ft.Divider(),
            ft.Container(results_list, expand=True)
        )

    except Exception as e:
        # Crucial Catch-All
        err_msg = traceback.format_exc()
        status_text.value = "CRITICAL ERROR DETECTED:"
        status_text.color = "red"
        error_text.value = err_msg
        page.update()

if __name__ == "__main__":
    ft.app(target=main)
