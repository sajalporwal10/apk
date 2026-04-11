// AsyncStorage persistence for Good Opportunity feature
// Stores tracked stocks, manages lifecycle, computes historical stats

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  OpportunityStock,
  OpportunityHistoryStats,
  OpportunityStatus,
  TRACKING_DURATION_DAYS,
  MAX_TRACKING_DAYS,
} from '../types/opportunity';

const OPPORTUNITY_KEY = '@sajalstonks_opportunities';
const OPPORTUNITY_SCAN_TS_KEY = '@sajalstonks_opp_scan_timestamp';

// ─── Core CRUD ───────────────────────────────────────────────────────

/**
 * Save the full opportunity list to storage
 */
export async function saveOpportunities(data: OpportunityStock[]): Promise<void> {
  try {
    await AsyncStorage.setItem(OPPORTUNITY_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving opportunities:', error);
  }
}

/**
 * Load all opportunities from storage
 */
export async function loadOpportunities(): Promise<OpportunityStock[]> {
  try {
    const raw = await AsyncStorage.getItem(OPPORTUNITY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OpportunityStock[];
  } catch (error) {
    console.error('Error loading opportunities:', error);
    return [];
  }
}

/**
 * Save scan timestamp
 */
export async function saveOpportunityScanTimestamp(): Promise<void> {
  try {
    await AsyncStorage.setItem(OPPORTUNITY_SCAN_TS_KEY, JSON.stringify(Date.now()));
  } catch (error) {
    console.error('Error saving scan timestamp:', error);
  }
}

/**
 * Get last scan timestamp
 */
export async function getOpportunityScanTimestamp(): Promise<Date | null> {
  try {
    const raw = await AsyncStorage.getItem(OPPORTUNITY_SCAN_TS_KEY);
    if (!raw) return null;
    return new Date(JSON.parse(raw));
  } catch (error) {
    return null;
  }
}

// ─── Merge new scan results into existing tracked stocks ─────────────

/**
 * Merge newly scanned opportunities with existing tracked stocks.
 * - Skips duplicates (same ticker already actively tracked)
 * - Allows re-adding expired/archived stocks with new surge data
 */
export async function mergeNewOpportunities(
  newStocks: OpportunityStock[]
): Promise<OpportunityStock[]> {
  const existing = await loadOpportunities();

  // Build map of actively tracked tickers
  const activeMap = new Map<string, OpportunityStock>();
  for (const stock of existing) {
    if (stock.status === 'tracking' || stock.status === 'alert_active' || stock.status === 'bought') {
      activeMap.set(stock.ticker, stock);
    }
  }

  // Add only non-duplicate new stocks
  const toAdd: OpportunityStock[] = [];
  for (const newStock of newStocks) {
    if (!activeMap.has(newStock.ticker)) {
      toAdd.push(newStock);
    }
  }

  const merged = [...existing, ...toAdd];
  await saveOpportunities(merged);
  return merged;
}

// ─── Stock actions ───────────────────────────────────────────────────

/**
 * Mark a stock as bought at current price with quantity (paper trading)
 */
export async function markAsBought(
  stockId: string,
  buyPrice: number,
  quantity: number = 1
): Promise<OpportunityStock[]> {
  const stocks = await loadOpportunities();
  const updated = stocks.map(s => {
    if (s.id !== stockId) return s;
    return {
      ...s,
      status: 'bought' as OpportunityStatus,
      buyPrice,
      buyDate: Date.now(),
      buyQuantity: quantity,
      outcome: 'pending' as const,
      outcomePercent: 0,
      peakPriceAfterBuy: buyPrice,
      troughPriceAfterBuy: buyPrice,
    };
  });
  await saveOpportunities(updated);
  return updated;
}

/**
 * Close a bought trade (user exits the position)
 */
export async function closeTrade(
  stockId: string,
  sellPrice: number
): Promise<OpportunityStock[]> {
  const stocks = await loadOpportunities();
  const updated = stocks.map(s => {
    if (s.id !== stockId || !s.buyPrice) return s;

    const outcomePercent = Math.round(
      ((sellPrice - s.buyPrice) / s.buyPrice) * 10000
    ) / 100;

    return {
      ...s,
      sellPrice,
      sellDate: Date.now(),
      isClosed: true,
      status: 'archived' as OpportunityStatus,
      outcome: outcomePercent >= 0 ? ('profit' as const) : ('loss' as const),
      outcomePercent,
    };
  });
  await saveOpportunities(updated);
  return updated;
}

/**
 * Extend tracking duration for a stock
 */
export async function extendTracking(
  stockId: string,
  additionalDays: number
): Promise<OpportunityStock[]> {
  const stocks = await loadOpportunities();
  const updated = stocks.map(s => {
    if (s.id !== stockId) return s;

    const newEndDate = s.trackingEndDate + additionalDays * 24 * 60 * 60 * 1000;
    const maxEndDate = s.surgeDate + MAX_TRACKING_DAYS * 24 * 60 * 60 * 1000;

    // Don't exceed 4 months from surge date
    const finalEndDate = Math.min(newEndDate, maxEndDate);

    // If stock was expired, re-activate it
    const newStatus: OpportunityStatus =
      s.status === 'expired' ? 'tracking' : s.status;

    return {
      ...s,
      trackingEndDate: finalEndDate,
      isExtended: true,
      status: newStatus,
    };
  });
  await saveOpportunities(updated);
  return updated;
}

/**
 * Archive a stock (manually remove from active tracking)
 */
export async function archiveOpportunity(
  stockId: string
): Promise<OpportunityStock[]> {
  const stocks = await loadOpportunities();
  const updated = stocks.map(s => {
    if (s.id !== stockId) return s;
    return { ...s, status: 'archived' as OpportunityStatus };
  });
  await saveOpportunities(updated);
  return updated;
}

/**
 * Delete an opportunity permanently
 */
export async function deleteOpportunity(
  stockId: string
): Promise<OpportunityStock[]> {
  const stocks = await loadOpportunities();
  const updated = stocks.filter(s => s.id !== stockId);
  await saveOpportunities(updated);
  return updated;
}

// ─── Historical stats computation ───────────────────────────────────

/**
 * Compute historical success rate and stats from all tracked opportunities
 */
export function computeHistoryStats(stocks: OpportunityStock[]): OpportunityHistoryStats {
  const totalOpportunities = stocks.length;
  const alertsTriggered = stocks.filter(
    s => s.alertTriggeredDate !== null
  ).length;

  const boughtStocks = stocks.filter(s => s.buyPrice !== null);
  const stocksBought = boughtStocks.length;

  const closedTrades = boughtStocks.filter(s => s.isClosed && s.outcomePercent !== null);
  const openTrades = boughtStocks.filter(s => !s.isClosed);

  const profitableCount = closedTrades.filter(s => s.outcome === 'profit').length;
  const lossCount = closedTrades.filter(s => s.outcome === 'loss').length;
  const pendingCount = openTrades.length;

  // Average return across closed trades
  let avgReturnPercent = 0;
  if (closedTrades.length > 0) {
    const totalReturn = closedTrades.reduce(
      (sum, s) => sum + (s.outcomePercent || 0),
      0
    );
    avgReturnPercent = Math.round((totalReturn / closedTrades.length) * 100) / 100;
  }

  // Best and worst trades
  let bestTrade: { ticker: string; returnPercent: number } | null = null;
  let worstTrade: { ticker: string; returnPercent: number } | null = null;

  for (const trade of closedTrades) {
    const pct = trade.outcomePercent || 0;
    const ticker = trade.ticker.replace('.NS', '');

    if (!bestTrade || pct > bestTrade.returnPercent) {
      bestTrade = { ticker, returnPercent: pct };
    }
    if (!worstTrade || pct < worstTrade.returnPercent) {
      worstTrade = { ticker, returnPercent: pct };
    }
  }

  // Success rate based on closed trades only
  const successRate =
    closedTrades.length > 0
      ? Math.round((profitableCount / closedTrades.length) * 10000) / 100
      : 0;

  return {
    totalOpportunities,
    alertsTriggered,
    stocksBought,
    profitableCount,
    lossCount,
    pendingCount,
    avgReturnPercent,
    bestTrade,
    worstTrade,
    successRate,
  };
}
