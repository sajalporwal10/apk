// Types for Good Opportunity feature
// Tracks volume surge stocks and monitors for capitulation buy signals

export type OpportunityStatus = 'tracking' | 'alert_active' | 'bought' | 'expired' | 'archived';
export type AlertType = 'below_low' | 'near_open' | null;
export type TradeOutcome = 'pending' | 'profit' | 'loss' | null;

export interface OpportunityStock {
  id: string;
  ticker: string;
  companyName: string;
  sector: string;

  // Surge day OHLCV
  surgeDate: number;        // timestamp of the surge day
  surgeOpen: number;
  surgeHigh: number;
  surgeLow: number;
  surgeClose: number;
  surgeDayVolume: number;
  weekTotalVolume: number;  // sum of previous 5 trading days' volume
  volumeMultiple: number;   // (surgeDayVolume / weekTotalVolume) * 100

  // Tracking window
  trackingStartDate: number;
  trackingEndDate: number;  // default 30 days from surge
  isExtended: boolean;

  // Alert state
  status: OpportunityStatus;
  alertType: AlertType;
  alertTriggeredDate: number | null;
  alertPrice: number | null;

  // Current market state
  currentPrice: number | null;
  lastCheckedDate: number | null;
  priceChangeFromSurge: number | null; // % change from surge close

  // Buy tracking (when user acts on the alert / paper trade)
  buyPrice: number | null;
  buyDate: number | null;
  buyQuantity: number | null;  // number of shares (paper trading)

  // Sell / close tracking
  sellPrice: number | null;
  sellDate: number | null;
  isClosed: boolean;

  // Outcome tracking
  outcome: TradeOutcome;
  outcomePercent: number | null;
  peakPriceAfterBuy: number | null;
  troughPriceAfterBuy: number | null;
}

export interface OpportunityHistoryStats {
  totalOpportunities: number;
  alertsTriggered: number;
  stocksBought: number;
  profitableCount: number;
  lossCount: number;
  pendingCount: number;
  avgReturnPercent: number;
  bestTrade: { ticker: string; returnPercent: number } | null;
  worstTrade: { ticker: string; returnPercent: number } | null;
  successRate: number; // percentage of profitable trades
}

// Constants
export const TRACKING_DURATION_DAYS = 30;
export const MAX_TRACKING_DAYS = 120;           // 4 months max
export const NEAR_OPEN_THRESHOLD = 0.02;        // 2% of surge day's open
export const EXTEND_OPTIONS_DAYS = [30, 60, 90]; // days to add when extending
