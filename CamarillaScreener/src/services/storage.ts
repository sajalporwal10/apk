// Local storage service for caching scan results and comments

import AsyncStorage from '@react-native-async-storage/async-storage';
import { StockData, CachedScanResult, StockComment, CachedComments } from '../types';

const CACHE_KEY = '@sajalstonks_scan_results';
const COMMENTS_KEY = '@sajalstonks_comments';
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Save scan results to local storage
 */
export async function saveScanResults(data: StockData[]): Promise<void> {
    try {
        const cacheData: CachedScanResult = {
            timestamp: Date.now(),
            data
        };
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
        console.error('Error saving scan results:', error);
    }
}

/**
 * Load cached scan results from local storage
 */
export async function loadCachedResults(): Promise<StockData[] | null> {
    try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (!cached) return null;

        const parsed: CachedScanResult = JSON.parse(cached);

        // Check if cache is expired
        if (Date.now() - parsed.timestamp > CACHE_EXPIRY_MS) {
            return null;
        }

        return parsed.data;
    } catch (error) {
        console.error('Error loading cached results:', error);
        return null;
    }
}

/**
 * Get cache timestamp
 */
export async function getCacheTimestamp(): Promise<Date | null> {
    try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (!cached) return null;

        const parsed: CachedScanResult = JSON.parse(cached);
        return new Date(parsed.timestamp);
    } catch (error) {
        return null;
    }
}

/**
 * Clear cached results
 */
export async function clearCache(): Promise<void> {
    try {
        await AsyncStorage.removeItem(CACHE_KEY);
    } catch (error) {
        console.error('Error clearing cache:', error);
    }
}

// ==================== COMMENTS STORAGE ====================

/**
 * Save a comment for a stock
 */
export async function saveComment(ticker: string, comment: string): Promise<void> {
    try {
        const existing = await loadAllComments();
        existing[ticker] = {
            ticker,
            comment,
            updatedAt: Date.now()
        };
        await AsyncStorage.setItem(COMMENTS_KEY, JSON.stringify({ comments: existing }));
    } catch (error) {
        console.error('Error saving comment:', error);
    }
}

/**
 * Get comment for a specific stock
 */
export async function getComment(ticker: string): Promise<StockComment | null> {
    try {
        const comments = await loadAllComments();
        return comments[ticker] || null;
    } catch (error) {
        console.error('Error getting comment:', error);
        return null;
    }
}

/**
 * Load all comments
 */
export async function loadAllComments(): Promise<{ [ticker: string]: StockComment }> {
    try {
        const cached = await AsyncStorage.getItem(COMMENTS_KEY);
        if (!cached) return {};

        const parsed: CachedComments = JSON.parse(cached);
        return parsed.comments || {};
    } catch (error) {
        console.error('Error loading comments:', error);
        return {};
    }
}

/**
 * Delete a comment for a stock
 */
export async function deleteComment(ticker: string): Promise<void> {
    try {
        const existing = await loadAllComments();
        delete existing[ticker];
        await AsyncStorage.setItem(COMMENTS_KEY, JSON.stringify({ comments: existing }));
    } catch (error) {
        console.error('Error deleting comment:', error);
    }
}

/**
 * Get stocks with comments (for Comments tab)
 */
export async function getStocksWithComments(stocks: StockData[]): Promise<(StockData & { comment: StockComment })[]> {
    try {
        const comments = await loadAllComments();
        const stocksWithComments: (StockData & { comment: StockComment })[] = [];

        for (const stock of stocks) {
            const comment = comments[stock.ticker];
            if (comment && comment.comment.trim()) {
                stocksWithComments.push({ ...stock, comment });
            }
        }

        // Sort by most recently updated
        stocksWithComments.sort((a, b) => b.comment.updatedAt - a.comment.updatedAt);

        return stocksWithComments;
    } catch (error) {
        console.error('Error getting stocks with comments:', error);
        return [];
    }
}
