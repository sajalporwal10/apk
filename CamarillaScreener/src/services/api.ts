// API Services for fetching NIFTY 500 symbols and stock data

import { StockData, YahooChartResponse } from '../types';
import { computeR3S3, computePctRange, getLastCompletedMonth, formatDate } from '../utils/calculations';

const NIFTY500_CSV_URL = 'https://www.niftyindices.com/IndexConstituent/ind_nifty500list.csv';
const YAHOO_CHART_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

// Rate limiting delay (milliseconds)
const REQUEST_DELAY = 1500;

// Maximum percentage range filter (6.5% rule)
const MAX_PCT_RANGE = 6.5;

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms: number): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch NIFTY 500 symbols from NSE website
 */
export async function fetchNifty500Symbols(): Promise<string[]> {
    try {
        const response = await fetch(NIFTY500_CSV_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch NIFTY 500 list: ${response.status}`);
        }

        const csvText = await response.text();
        const lines = csvText.split('\n');

        if (lines.length < 2) {
            throw new Error('Invalid CSV format');
        }

        // Find the symbol column
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        let symbolIndex = headers.findIndex(h =>
            h.includes('symbol') || h.includes('ticker') || h.includes('code')
        );

        if (symbolIndex === -1) symbolIndex = 0;

        const symbols: string[] = [];
        const seen = new Set<string>();

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',');
            if (cols.length > symbolIndex) {
                let symbol = cols[symbolIndex].trim().toUpperCase().replace(/"/g, '');
                if (!symbol || symbol === 'NAN' || symbol === '') continue;

                // Add .NS suffix if not present
                if (!symbol.endsWith('.NS') && !symbol.endsWith('.BO')) {
                    symbol = symbol + '.NS';
                }

                if (!seen.has(symbol)) {
                    seen.add(symbol);
                    symbols.push(symbol);
                }
            }
        }

        return symbols;
    } catch (error) {
        console.error('Error fetching NIFTY 500 symbols:', error);
        throw error;
    }
}

/**
 * Fetch monthly OHLC data for a single ticker from Yahoo Finance
 */
async function fetchMonthlyOHLC(ticker: string): Promise<{
    open: number;
    high: number;
    low: number;
    close: number;
    timestamp: number;
} | null> {
    try {
        const { start, end } = getLastCompletedMonth();

        // Get period timestamps (Unix seconds)
        const period1 = Math.floor(start.getTime() / 1000) - 86400; // Day before start
        const period2 = Math.floor(end.getTime() / 1000) + 86400; // Day after end

        const url = `${YAHOO_CHART_BASE}/${ticker}?interval=1mo&period1=${period1}&period2=${period2}`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            return null;
        }

        const data: YahooChartResponse = await response.json();

        if (!data.chart.result || data.chart.result.length === 0) {
            return null;
        }

        const result = data.chart.result[0];
        const quote = result.indicators.quote[0];

        if (!quote || quote.open.length === 0) {
            return null;
        }

        // Get the last complete month's data (usually the first entry if we fetched correctly)
        // Find the entry that matches our target month
        const targetMonth = start.getMonth();
        const targetYear = start.getFullYear();

        for (let i = 0; i < result.timestamp.length; i++) {
            const date = new Date(result.timestamp[i] * 1000);
            if (date.getMonth() === targetMonth && date.getFullYear() === targetYear) {
                return {
                    open: Math.round(quote.open[i]),
                    high: Math.round(quote.high[i]),
                    low: Math.round(quote.low[i]),
                    close: Math.round(quote.close[i]),
                    timestamp: result.timestamp[i]
                };
            }
        }

        // Fallback: use the first available data point
        if (quote.open[0] !== null && quote.high[0] !== null &&
            quote.low[0] !== null && quote.close[0] !== null) {
            return {
                open: Math.round(quote.open[0]),
                high: Math.round(quote.high[0]),
                low: Math.round(quote.low[0]),
                close: Math.round(quote.close[0]),
                timestamp: result.timestamp[0]
            };
        }

        return null;
    } catch (error) {
        console.error(`Error fetching data for ${ticker}:`, error);
        return null;
    }
}

/**
 * Process a single stock and return StockData
 */
async function processStock(ticker: string): Promise<StockData> {
    const { label } = getLastCompletedMonth();

    const ohlc = await fetchMonthlyOHLC(ticker);

    if (!ohlc) {
        return {
            ticker,
            yearMonth: null,
            periodEnd: null,
            open: null,
            high: null,
            low: null,
            close: null,
            r3: null,
            s3: null,
            pctRangeR3: null,
            error: 'no_data'
        };
    }

    const { r3, s3 } = computeR3S3(ohlc.high, ohlc.low, ohlc.close);
    const pctRangeR3 = computePctRange(r3, s3);

    // Filter out stocks with range >= 6.5%
    if (pctRangeR3 === null || pctRangeR3 >= MAX_PCT_RANGE) {
        return {
            ticker,
            yearMonth: label,
            periodEnd: formatDate(new Date(ohlc.timestamp * 1000)),
            open: ohlc.open,
            high: ohlc.high,
            low: ohlc.low,
            close: ohlc.close,
            r3,
            s3,
            pctRangeR3,
            error: 'filtered_out'
        };
    }

    return {
        ticker,
        yearMonth: label,
        periodEnd: formatDate(new Date(ohlc.timestamp * 1000)),
        open: ohlc.open,
        high: ohlc.high,
        low: ohlc.low,
        close: ohlc.close,
        r3,
        s3,
        pctRangeR3,
        error: ''
    };
}

/**
 * Scan all NIFTY 500 stocks with progress callback
 */
export async function scanAllStocks(
    onProgress: (current: number, total: number, ticker: string) => void,
    shouldCancel: () => boolean
): Promise<StockData[]> {
    const symbols = await fetchNifty500Symbols();
    const results: StockData[] = [];

    for (let i = 0; i < symbols.length; i++) {
        if (shouldCancel()) {
            break;
        }

        const ticker = symbols[i];
        onProgress(i + 1, symbols.length, ticker);

        const stockData = await processStock(ticker);

        // Only add stocks that passed the filter (no error or error !== 'filtered_out')
        if (stockData.error === '') {
            results.push(stockData);
        }

        await sleep(REQUEST_DELAY);
    }

    // Sort by pctRangeR3 ascending (tightest range first)
    results.sort((a, b) => {
        if (a.pctRangeR3 === null) return 1;
        if (b.pctRangeR3 === null) return -1;
        return a.pctRangeR3 - b.pctRangeR3;
    });

    return results;
}
