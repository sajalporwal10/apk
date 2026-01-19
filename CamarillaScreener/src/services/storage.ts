// Local storage service for caching scan results

import AsyncStorage from '@react-native-async-storage/async-storage';
import { StockData, CachedScanResult } from '../types';

const CACHE_KEY = '@camarilla_scan_results';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

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
