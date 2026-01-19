// API Services for fetching NIFTY 500 symbols and stock data
// Optimized with parallel batch processing for faster scanning

import { StockData, YahooChartResponse, SymbolInfo } from '../types';
import { computeR3S3, computePctRange, getLastCompletedMonth, formatDate } from '../utils/calculations';

const NIFTY500_CSV_URL = 'https://www.niftyindices.com/IndexConstituent/ind_nifty500list.csv';
const YAHOO_CHART_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

// Parallel batch configuration
const BATCH_SIZE = 8; // Process 8 stocks simultaneously
const BATCH_DELAY = 800; // Delay between batches (ms)
const REQUEST_TIMEOUT = 10000; // 10 second timeout per request

// Maximum percentage range filter (6.5% rule)
const MAX_PCT_RANGE = 6.5;

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms: number): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url: string, timeout: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36'
            }
        });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Fetch NIFTY 500 symbols with company names and sectors from NSE website
 */
export async function fetchNifty500Symbols(): Promise<SymbolInfo[]> {
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

        // Parse headers
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

        // Find column indices
        let symbolIndex = headers.findIndex(h => h.includes('symbol') || h.includes('ticker'));
        let companyIndex = headers.findIndex(h => h.includes('company') || h.includes('name'));
        let sectorIndex = headers.findIndex(h => h.includes('industry') || h.includes('sector'));

        if (symbolIndex === -1) symbolIndex = 0;
        if (companyIndex === -1) companyIndex = 1;
        if (sectorIndex === -1) sectorIndex = 2;

        const symbolInfos: SymbolInfo[] = [];
        const seen = new Set<string>();

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
            if (cols.length <= symbolIndex) continue;

            let symbol = cols[symbolIndex].toUpperCase();
            if (!symbol || symbol === 'NAN' || symbol === '') continue;

            // Add .NS suffix if not present
            if (!symbol.endsWith('.NS') && !symbol.endsWith('.BO')) {
                symbol = symbol + '.NS';
            }

            if (!seen.has(symbol)) {
                seen.add(symbol);
                symbolInfos.push({
                    symbol,
                    companyName: cols[companyIndex] || symbol.replace('.NS', ''),
                    sector: cols[sectorIndex] || 'Other'
                });
            }
        }

        return symbolInfos;
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
        const period1 = Math.floor(start.getTime() / 1000) - 86400;
        const period2 = Math.floor(end.getTime() / 1000) + 86400;

        const url = `${YAHOO_CHART_BASE}/${ticker}?interval=1mo&period1=${period1}&period2=${period2}`;

        const response = await fetchWithTimeout(url, REQUEST_TIMEOUT);

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
        // Silently fail for individual stocks
        return null;
    }
}

/**
 * Process a single stock and return StockData
 */
async function processStock(symbolInfo: SymbolInfo): Promise<StockData> {
    const { label } = getLastCompletedMonth();
    const { symbol: ticker, companyName, sector } = symbolInfo;

    const ohlc = await fetchMonthlyOHLC(ticker);

    if (!ohlc) {
        return {
            ticker,
            companyName,
            sector,
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
            companyName,
            sector,
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
        companyName,
        sector,
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
 * Process a batch of stocks in parallel
 */
async function processBatch(symbolInfos: SymbolInfo[]): Promise<StockData[]> {
    const promises = symbolInfos.map(info => processStock(info));
    const results = await Promise.all(promises);
    return results;
}

/**
 * Scan all NIFTY 500 stocks with parallel batch processing
 * ~5-8x faster than sequential processing
 */
export async function scanAllStocks(
    onProgress: (current: number, total: number, ticker: string) => void,
    shouldCancel: () => boolean
): Promise<StockData[]> {
    const symbolInfos = await fetchNifty500Symbols();
    const results: StockData[] = [];
    const total = symbolInfos.length;

    // Process in batches
    for (let i = 0; i < symbolInfos.length; i += BATCH_SIZE) {
        if (shouldCancel()) {
            break;
        }

        const batch = symbolInfos.slice(i, i + BATCH_SIZE);
        const batchTickers = batch.map(s => s.symbol.replace('.NS', '')).join(', ');

        // Update progress
        onProgress(Math.min(i + BATCH_SIZE, total), total, batchTickers);

        // Process batch in parallel
        const batchResults = await processBatch(batch);

        // Filter and add results
        for (const stockData of batchResults) {
            if (stockData.error === '') {
                results.push(stockData);
            }
        }

        // Delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < symbolInfos.length && !shouldCancel()) {
            await sleep(BATCH_DELAY);
        }
    }

    // Sort by pctRangeR3 ascending (tightest range first)
    results.sort((a, b) => {
        if (a.pctRangeR3 === null) return 1;
        if (b.pctRangeR3 === null) return -1;
        return a.pctRangeR3 - b.pctRangeR3;
    });

    return results;
}

/**
 * Group stocks by sector
 */
export function groupStocksBySector(stocks: StockData[]): { [sector: string]: StockData[] } {
    const groups: { [sector: string]: StockData[] } = {};

    for (const stock of stocks) {
        const sector = stock.sector || 'Other';
        if (!groups[sector]) {
            groups[sector] = [];
        }
        groups[sector].push(stock);
    }

    // Sort stocks within each sector by range
    for (const sector of Object.keys(groups)) {
        groups[sector].sort((a, b) => {
            if (a.pctRangeR3 === null) return 1;
            if (b.pctRangeR3 === null) return -1;
            return a.pctRangeR3 - b.pctRangeR3;
        });
    }

    return groups;
}
