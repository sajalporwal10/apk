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
    // P&L fields (populated on SELL trades)
    entryPrice?: number;       // Average entry price at time of sell
    pnl?: number;              // Profit/loss amount
    pnlPercent?: number;       // Profit/loss percentage
}

export interface Portfolio {
    cash: number;
    initialCapital: number;
    positions: Position[];
    tradeHistory: Trade[];
    lastUpdated: number;
    sessionId: string;         // Unique ID for this portfolio session
    sessionStartDate: number;  // When this session was created
}

export interface ArchivedSession {
    sessionId: string;
    startDate: number;
    endDate: number;
    initialCapital: number;
    finalValue: number;
    finalPnL: number;
    finalPnLPercent: number;
    tradeCount: number;
    tradeHistory: Trade[];
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
    sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    sessionStartDate: Date.now(),
});

