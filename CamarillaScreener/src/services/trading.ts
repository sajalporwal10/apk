// Trading Calculations Service

import { Portfolio, PortfolioSummary, Position } from '../types/trading';

// Calculate P&L for a single position
export const calculatePositionPnL = (position: Position): { pnl: number; pnlPercent: number } => {
    const investedValue = position.quantity * position.entryPrice;
    const currentValue = position.quantity * position.currentPrice;
    const pnl = currentValue - investedValue;
    const pnlPercent = investedValue > 0 ? (pnl / investedValue) * 100 : 0;
    return { pnl, pnlPercent };
};

// Calculate distance to R3 target
export const calculateDistanceToTarget = (position: Position): number | null => {
    if (!position.r3Target) return null;
    return ((position.r3Target - position.currentPrice) / position.currentPrice) * 100;
};

// Calculate distance to S3 stop loss
export const calculateDistanceToStopLoss = (position: Position): number | null => {
    if (!position.s3StopLoss) return null;
    return ((position.currentPrice - position.s3StopLoss) / position.currentPrice) * 100;
};

// Calculate portfolio summary
export const calculatePortfolioSummary = (portfolio: Portfolio): PortfolioSummary => {
    let totalInvested = 0;
    let totalCurrentValue = 0;
    let bestPerformer: Position | null = null;
    let worstPerformer: Position | null = null;
    let bestPnLPercent = -Infinity;
    let worstPnLPercent = Infinity;

    portfolio.positions.forEach(position => {
        const invested = position.quantity * position.entryPrice;
        const current = position.quantity * position.currentPrice;
        totalInvested += invested;
        totalCurrentValue += current;

        const { pnlPercent } = calculatePositionPnL(position);

        if (pnlPercent > bestPnLPercent) {
            bestPnLPercent = pnlPercent;
            bestPerformer = position;
        }
        if (pnlPercent < worstPnLPercent) {
            worstPnLPercent = pnlPercent;
            worstPerformer = position;
        }
    });

    const totalValue = portfolio.cash + totalCurrentValue;
    const totalPnL = totalValue - portfolio.initialCapital;
    const totalPnLPercent = portfolio.initialCapital > 0
        ? (totalPnL / portfolio.initialCapital) * 100
        : 0;

    return {
        totalValue,
        totalInvested,
        totalCash: portfolio.cash,
        totalPnL,
        totalPnLPercent,
        positionCount: portfolio.positions.length,
        bestPerformer,
        worstPerformer,
    };
};

// Format currency
export const formatCurrency = (amount: number): string => {
    if (Math.abs(amount) >= 10000000) {
        return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (Math.abs(amount) >= 100000) {
        return `₹${(amount / 100000).toFixed(2)} L`;
    } else if (Math.abs(amount) >= 1000) {
        return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

// Format percentage
export const formatPercent = (percent: number): string => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
};

// Calculate days held
export const calculateDaysHeld = (entryDate: number): number => {
    const now = Date.now();
    const diff = now - entryDate;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
};
