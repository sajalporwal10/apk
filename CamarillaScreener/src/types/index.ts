// Type definitions for the Camarilla Stock Screener App

export interface StockData {
    ticker: string;
    yearMonth: string | null;
    periodEnd: string | null;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    r3: number | null;
    s3: number | null;
    pctRangeR3: number | null;
    error: string;
}

export interface StockComment {
    ticker: string;
    comment: string;
    updatedAt: number;
}

export interface ScanProgress {
    current: number;
    total: number;
    currentTicker: string;
    isScanning: boolean;
    isCancelled: boolean;
}

export interface CachedScanResult {
    timestamp: number;
    data: StockData[];
}

export interface CachedComments {
    comments: { [ticker: string]: StockComment };
}

export type RangeFilter = 'under5' | 'between5and6.5';

export type TabType = 'screener' | 'comments';

export interface YahooChartResult {
    timestamp: number[];
    indicators: {
        quote: Array<{
            open: number[];
            high: number[];
            low: number[];
            close: number[];
            volume: number[];
        }>;
    };
}

export interface YahooChartResponse {
    chart: {
        result: YahooChartResult[] | null;
        error: { code: string; description: string } | null;
    };
}
