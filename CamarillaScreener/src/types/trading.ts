// Trading Types for Paper Trading Feature

export interface Position {
    id: string;
    ticker: string;
    companyName: string;
    sector: string;
    quantity: number;
    entryPrice: number;
    currentPrice: number;
    r3Target: number | null;  // Profit target
    s3StopLoss: number | null;  // Stop loss
    entryDate: number;  // timestamp
    notes: string;
}

export interface Trade {
    id: string;
    ticker: string;
    companyName: string;
    type: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    totalValue: number;
    timestamp: number;
    notes: string;
}

export interface Portfolio {
    cash: number;
    initialCapital: number;
    positions: Position[];
    tradeHistory: Trade[];
    lastUpdated: number;
}

export interface PortfolioSummary {
    totalValue: number;
    totalInvested: number;
    totalCash: number;
    totalPnL: number;
    totalPnLPercent: number;
    positionCount: number;
    bestPerformer: Position | null;
    worstPerformer: Position | null;
}

export const DEFAULT_INITIAL_CAPITAL = 100000; // ₹1,00,000

export const createEmptyPortfolio = (): Portfolio => ({
    cash: DEFAULT_INITIAL_CAPITAL,
    initialCapital: DEFAULT_INITIAL_CAPITAL,
    positions: [],
    tradeHistory: [],
    lastUpdated: Date.now(),
});
