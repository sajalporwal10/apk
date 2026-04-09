// API service for Good Opportunity feature
// Scans Nifty 500 for volume surge stocks and refreshes tracked prices

import { OpportunityStock, OpportunityStatus, NEAR_OPEN_THRESHOLD, TRACKING_DURATION_DAYS } from '../types/opportunity';
import { fetchNifty500Symbols } from './api';
import { SymbolInfo, YahooChartResponse } from '../types';

const YAHOO_CHART_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';
const BATCH_SIZE = 8;
const BATCH_DELAY = 800;
const REQUEST_TIMEOUT = 10000;

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

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

// ─── Daily OHLCV with volume comparison ─────────────────────────────

interface DailySurgeData {
  surgeDate: number;
  open: number;
  high: number;
  low: number;
  close: number;
  todayVolume: number;
  weekTotalVolume: number;
  volumeMultiple: number; // (todayVol / weekTotalVol) * 100
}

/**
 * Fetch daily OHLCV for a stock (last ~15 trading days)
 * Returns surge-day data if today's volume > total of last 5 days
 */
async function fetchDailySurgeData(ticker: string): Promise<DailySurgeData | null> {
  try {
    const formattedTicker = ticker.endsWith('.NS') ? ticker : `${ticker}.NS`;

    const now = Math.floor(Date.now() / 1000);
    const fifteenDaysAgo = now - (15 * 24 * 60 * 60);

    const url = `${YAHOO_CHART_BASE}/${formattedTicker}?interval=1d&period1=${fifteenDaysAgo}&period2=${now}`;
    const response = await fetchWithTimeout(url, REQUEST_TIMEOUT);

    if (!response.ok) return null;

    const data: YahooChartResponse = await response.json();

    if (!data.chart.result || data.chart.result.length === 0) return null;

    const result = data.chart.result[0];
    const quote = result.indicators.quote[0];

    if (!quote || !quote.volume || quote.volume.length < 6) return null;

    // Build valid days array with full OHLCV
    const validDays: {
      timestamp: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }[] = [];

    for (let i = 0; i < quote.volume.length; i++) {
      if (
        quote.volume[i] && quote.volume[i] > 0 &&
        quote.open[i] !== null &&
        quote.high[i] !== null &&
        quote.low[i] !== null &&
        quote.close[i] !== null
      ) {
        validDays.push({
          timestamp: result.timestamp[i],
          open: quote.open[i],
          high: quote.high[i],
          low: quote.low[i],
          close: quote.close[i],
          volume: quote.volume[i],
        });
      }
    }

    if (validDays.length < 6) return null; // Need today + 5 previous

    // Today = last valid day
    const today = validDays[validDays.length - 1];

    // Sum of previous 5 trading days' volume
    const weekDays = validDays.slice(
      Math.max(0, validDays.length - 6),
      validDays.length - 1
    );
    const weekTotalVolume = weekDays.reduce((sum, d) => sum + d.volume, 0);

    // Check: today's volume must exceed total of last 5 days
    if (today.volume <= weekTotalVolume) return null;

    const volumeMultiple = Math.round((today.volume / weekTotalVolume) * 100);

    return {
      surgeDate: today.timestamp * 1000, // convert to JS timestamp (ms)
      open: Math.round(today.open * 100) / 100,
      high: Math.round(today.high * 100) / 100,
      low: Math.round(today.low * 100) / 100,
      close: Math.round(today.close * 100) / 100,
      todayVolume: today.volume,
      weekTotalVolume,
      volumeMultiple,
    };
  } catch (error) {
    return null;
  }
}

// ─── Scan all Nifty 500 for volume surges ────────────────────────────

/**
 * Scan all Nifty 500 stocks for volume surges.
 * Returns new OpportunityStock entries for qualifying stocks.
 */
export async function scanGoodOpportunities(
  onProgress: (current: number, total: number, ticker: string) => void,
  shouldCancel: () => boolean,
  existingTracked: OpportunityStock[] = []
): Promise<OpportunityStock[]> {
  const symbolInfos = await fetchNifty500Symbols();
  const total = symbolInfos.length;

  // Build set of currently tracked tickers (that are still active)
  const activeTickers = new Set(
    existingTracked
      .filter(s => s.status === 'tracking' || s.status === 'alert_active' || s.status === 'bought')
      .map(s => s.ticker)
  );

  const results: OpportunityStock[] = [];

  for (let i = 0; i < symbolInfos.length; i += BATCH_SIZE) {
    if (shouldCancel()) break;

    const batch = symbolInfos.slice(i, i + BATCH_SIZE);
    const batchTickers = batch.map(s => s.symbol.replace('.NS', '')).join(', ');

    onProgress(Math.min(i + BATCH_SIZE, total), total, batchTickers);

    const promises = batch.map(async (info: SymbolInfo) => {
      // Skip if already actively tracked
      if (activeTickers.has(info.symbol)) return null;

      const surgeData = await fetchDailySurgeData(info.symbol);
      if (!surgeData) return null;

      const now = Date.now();
      const trackingEndDate = now + TRACKING_DURATION_DAYS * 24 * 60 * 60 * 1000;

      const opportunity: OpportunityStock = {
        id: `opp_${info.symbol}_${surgeData.surgeDate}`,
        ticker: info.symbol,
        companyName: info.companyName,
        sector: info.sector || 'Other',

        surgeDate: surgeData.surgeDate,
        surgeOpen: surgeData.open,
        surgeHigh: surgeData.high,
        surgeLow: surgeData.low,
        surgeClose: surgeData.close,
        surgeDayVolume: surgeData.todayVolume,
        weekTotalVolume: surgeData.weekTotalVolume,
        volumeMultiple: surgeData.volumeMultiple,

        trackingStartDate: now,
        trackingEndDate,
        isExtended: false,

        status: 'tracking',
        alertType: null,
        alertTriggeredDate: null,
        alertPrice: null,

        currentPrice: surgeData.close,
        lastCheckedDate: now,
        priceChangeFromSurge: 0,

        buyPrice: null,
        buyDate: null,
        sellPrice: null,
        sellDate: null,
        isClosed: false,

        outcome: null,
        outcomePercent: null,
        peakPriceAfterBuy: null,
        troughPriceAfterBuy: null,
      };

      return opportunity;
    });

    const batchResults = await Promise.all(promises);
    for (const result of batchResults) {
      if (result) results.push(result);
    }

    if (i + BATCH_SIZE < symbolInfos.length && !shouldCancel()) {
      await sleep(BATCH_DELAY);
    }
  }

  // Sort by volume multiple descending (highest surge first)
  results.sort((a, b) => b.volumeMultiple - a.volumeMultiple);

  return results;
}

// ─── Refresh prices & check buy-zone alerts ──────────────────────────

/**
 * Fetch current price for a single stock
 */
async function fetchLatestPrice(ticker: string): Promise<number | null> {
  try {
    const formattedTicker = ticker.endsWith('.NS') ? ticker : `${ticker}.NS`;
    const now = Math.floor(Date.now() / 1000);
    const fiveDaysAgo = now - (5 * 24 * 60 * 60);

    const url = `${YAHOO_CHART_BASE}/${formattedTicker}?interval=1d&period1=${fiveDaysAgo}&period2=${now}`;
    const response = await fetchWithTimeout(url, REQUEST_TIMEOUT);

    if (!response.ok) return null;

    const data: YahooChartResponse = await response.json();
    if (!data.chart.result || data.chart.result.length === 0) return null;

    const quote = data.chart.result[0].indicators.quote[0];
    if (!quote || !quote.close || quote.close.length === 0) return null;

    // Get most recent non-null close price
    for (let i = quote.close.length - 1; i >= 0; i--) {
      if (quote.close[i] !== null) {
        return Math.round(quote.close[i] * 100) / 100;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Check if a stock is in the buy zone
 * - Below surge day's low (capitulation breakdown)
 * - Within 2% of surge day's opening price
 */
function checkBuyZone(
  currentPrice: number,
  surgeOpen: number,
  surgeLow: number
): { inBuyZone: boolean; alertType: 'below_low' | 'near_open' | null } {
  // Check capitulation: price below surge day's low
  if (currentPrice <= surgeLow) {
    return { inBuyZone: true, alertType: 'below_low' };
  }

  // Check near open: within 2% of surge day's opening price
  const openDiff = Math.abs(currentPrice - surgeOpen) / surgeOpen;
  if (openDiff <= NEAR_OPEN_THRESHOLD) {
    return { inBuyZone: true, alertType: 'near_open' };
  }

  return { inBuyZone: false, alertType: null };
}

/**
 * Refresh prices for all tracked stocks and update alert states.
 * Processes in batches to avoid rate limiting.
 */
export async function refreshTrackedPrices(
  stocks: OpportunityStock[],
  onProgress?: (current: number, total: number, ticker: string) => void,
  shouldCancel?: () => boolean
): Promise<OpportunityStock[]> {
  const now = Date.now();

  // Only refresh active stocks (not closed/archived by user)
  const activeStocks = stocks.filter(
    s => s.status === 'tracking' || s.status === 'alert_active' || (s.status === 'bought' && !s.isClosed)
  );
  const inactiveStocks = stocks.filter(
    s => !(s.status === 'tracking' || s.status === 'alert_active' || (s.status === 'bought' && !s.isClosed))
  );

  const updatedActive: OpportunityStock[] = [];
  const total = activeStocks.length;

  for (let i = 0; i < activeStocks.length; i += BATCH_SIZE) {
    if (shouldCancel?.()) break;

    const batch = activeStocks.slice(i, i + BATCH_SIZE);
    const batchTickers = batch.map(s => s.ticker.replace('.NS', '')).join(', ');

    onProgress?.(Math.min(i + BATCH_SIZE, total), total, batchTickers);

    const promises = batch.map(async (stock) => {
      const updated = { ...stock };

      // Check if tracking has expired
      if (now > updated.trackingEndDate && updated.status !== 'bought') {
        updated.status = 'expired';
        return updated;
      }

      // Fetch current price
      const price = await fetchLatestPrice(stock.ticker);
      if (price === null) return updated; // Keep old state if fetch fails

      updated.currentPrice = price;
      updated.lastCheckedDate = now;
      updated.priceChangeFromSurge = Math.round(
        ((price - stock.surgeClose) / stock.surgeClose) * 10000
      ) / 100; // % change with 2 decimal places

      // Update buy tracking if stock was bought
      if (updated.status === 'bought' && updated.buyPrice && !updated.isClosed) {
        updated.outcomePercent = Math.round(
          ((price - updated.buyPrice) / updated.buyPrice) * 10000
        ) / 100;
        updated.outcome = updated.outcomePercent >= 0 ? 'profit' : 'loss';
        updated.peakPriceAfterBuy = Math.max(price, updated.peakPriceAfterBuy || 0);
        updated.troughPriceAfterBuy = updated.troughPriceAfterBuy
          ? Math.min(price, updated.troughPriceAfterBuy)
          : price;
      }

      // Check buy zone for tracking stocks
      if (updated.status === 'tracking' || updated.status === 'alert_active') {
        const { inBuyZone, alertType } = checkBuyZone(price, stock.surgeOpen, stock.surgeLow);

        if (inBuyZone) {
          updated.status = 'alert_active';
          updated.alertType = alertType;
          if (!updated.alertTriggeredDate) {
            updated.alertTriggeredDate = now;
            updated.alertPrice = price;
          }
        } else {
          // Was in buy zone but no longer — keep tracking
          if (updated.status === 'alert_active') {
            updated.status = 'tracking';
          }
        }
      }

      return updated;
    });

    const batchResults = await Promise.all(promises);
    updatedActive.push(...batchResults);

    if (i + BATCH_SIZE < activeStocks.length && !shouldCancel?.()) {
      await sleep(BATCH_DELAY);
    }
  }

  // Also expire any inactive tracking stocks that passed their end date
  const updatedInactive = inactiveStocks.map(stock => {
    if (stock.status === 'tracking' && now > stock.trackingEndDate) {
      return { ...stock, status: 'expired' as OpportunityStatus };
    }
    return stock;
  });

  return [...updatedActive, ...updatedInactive];
}
