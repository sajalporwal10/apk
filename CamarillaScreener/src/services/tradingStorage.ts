// Trading Storage Service - Persist portfolio data locally

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Portfolio, Position, Trade, ArchivedSession, createEmptyPortfolio, DEFAULT_INITIAL_CAPITAL } from '../types/trading';
import { calculatePortfolioSummary } from './trading';

const PORTFOLIO_KEY = '@camarilla_portfolio';
const ARCHIVE_KEY = '@camarilla_archived_sessions';

// Load portfolio from storage
export const loadPortfolio = async (): Promise<Portfolio> => {
    try {
        const data = await AsyncStorage.getItem(PORTFOLIO_KEY);
        if (data) {
            const portfolio = JSON.parse(data);
            // Migration: add sessionId if missing (from old data)
            if (!portfolio.sessionId) {
                portfolio.sessionId = `session_${portfolio.lastUpdated || Date.now()}_migrated`;
                portfolio.sessionStartDate = portfolio.lastUpdated || Date.now();
            }
            return portfolio;
        }
        return createEmptyPortfolio();
    } catch (error) {
        console.error('Error loading portfolio:', error);
        return createEmptyPortfolio();
    }
};

// Save portfolio to storage
export const savePortfolio = async (portfolio: Portfolio): Promise<void> => {
    try {
        portfolio.lastUpdated = Date.now();
        await AsyncStorage.setItem(PORTFOLIO_KEY, JSON.stringify(portfolio));
    } catch (error) {
        console.error('Error saving portfolio:', error);
        throw error;
    }
};

// Load archived sessions
export const loadArchivedSessions = async (): Promise<ArchivedSession[]> => {
    try {
        const data = await AsyncStorage.getItem(ARCHIVE_KEY);
        if (data) {
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        console.error('Error loading archives:', error);
        return [];
    }
};

// Save archived sessions
const saveArchivedSessions = async (sessions: ArchivedSession[]): Promise<void> => {
    try {
        await AsyncStorage.setItem(ARCHIVE_KEY, JSON.stringify(sessions));
    } catch (error) {
        console.error('Error saving archives:', error);
    }
};

// Archive current portfolio session before reset
const archiveCurrentSession = async (portfolio: Portfolio): Promise<void> => {
    // Only archive if there's meaningful activity
    if (portfolio.tradeHistory.length === 0) return;

    const summary = calculatePortfolioSummary(portfolio);

    const archivedSession: ArchivedSession = {
        sessionId: portfolio.sessionId,
        startDate: portfolio.sessionStartDate,
        endDate: Date.now(),
        initialCapital: portfolio.initialCapital,
        finalValue: summary.totalValue,
        finalPnL: summary.totalPnL,
        finalPnLPercent: summary.totalPnLPercent,
        tradeCount: portfolio.tradeHistory.length,
        tradeHistory: [...portfolio.tradeHistory],
    };

    const archives = await loadArchivedSessions();
    archives.unshift(archivedSession); // Most recent first
    await saveArchivedSessions(archives);
};

// Reset portfolio to initial state (archives current session first)
export const resetPortfolio = async (initialCapital: number = DEFAULT_INITIAL_CAPITAL): Promise<Portfolio> => {
    // Load current portfolio to archive it
    const currentPortfolio = await loadPortfolio();
    await archiveCurrentSession(currentPortfolio);

    // Create fresh portfolio
    const newPortfolio = createEmptyPortfolio();
    newPortfolio.cash = initialCapital;
    newPortfolio.initialCapital = initialCapital;

    await savePortfolio(newPortfolio);
    return newPortfolio;
};

// Generate unique ID
export const generateId = (): string => {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Add a new position (BUY)
export const addPosition = async (
    portfolio: Portfolio,
    ticker: string,
    companyName: string,
    sector: string,
    quantity: number,
    price: number,
    r3Target: number | null,
    s3StopLoss: number | null,
    notes: string = ''
): Promise<Portfolio> => {
    const totalCost = quantity * price;

    if (totalCost > portfolio.cash) {
        throw new Error('Insufficient funds');
    }

    // Check if position already exists
    const existingPosition = portfolio.positions.find(p => p.ticker === ticker);

    if (existingPosition) {
        // Average up/down existing position
        const totalQuantity = existingPosition.quantity + quantity;
        const avgPrice = ((existingPosition.quantity * existingPosition.entryPrice) + (quantity * price)) / totalQuantity;

        existingPosition.quantity = totalQuantity;
        existingPosition.entryPrice = avgPrice;
        existingPosition.currentPrice = price;
        if (r3Target) existingPosition.r3Target = r3Target;
        if (s3StopLoss) existingPosition.s3StopLoss = s3StopLoss;
    } else {
        // Create new position
        const newPosition: Position = {
            id: generateId(),
            ticker,
            companyName,
            sector,
            quantity,
            entryPrice: price,
            currentPrice: price,
            r3Target,
            s3StopLoss,
            entryDate: Date.now(),
            notes,
        };
        portfolio.positions.push(newPosition);
    }

    // Deduct cash
    portfolio.cash -= totalCost;

    // Add to trade history
    const trade: Trade = {
        id: generateId(),
        ticker,
        companyName,
        type: 'BUY',
        quantity,
        price,
        totalValue: totalCost,
        timestamp: Date.now(),
        notes,
    };
    portfolio.tradeHistory.unshift(trade);

    await savePortfolio(portfolio);
    return portfolio;
};

// Sell a position (partial or full) — now with P&L tracking
export const sellPosition = async (
    portfolio: Portfolio,
    ticker: string,
    quantity: number,
    price: number,
    notes: string = ''
): Promise<Portfolio> => {
    const position = portfolio.positions.find(p => p.ticker === ticker);

    if (!position) {
        throw new Error('Position not found');
    }

    if (quantity > position.quantity) {
        throw new Error('Insufficient quantity');
    }

    const totalValue = quantity * price;

    // Calculate P&L for this sell trade
    const entryPrice = position.entryPrice;
    const investedValue = quantity * entryPrice;
    const pnl = totalValue - investedValue;
    const pnlPercent = investedValue > 0 ? (pnl / investedValue) * 100 : 0;

    if (quantity === position.quantity) {
        // Close entire position
        portfolio.positions = portfolio.positions.filter(p => p.ticker !== ticker);
    } else {
        // Partial sell
        position.quantity -= quantity;
    }

    // Add cash
    portfolio.cash += totalValue;

    // Add to trade history with P&L data
    const trade: Trade = {
        id: generateId(),
        ticker,
        companyName: position.companyName,
        type: 'SELL',
        quantity,
        price,
        totalValue,
        timestamp: Date.now(),
        notes,
        entryPrice,
        pnl: Math.round(pnl * 100) / 100,
        pnlPercent: Math.round(pnlPercent * 100) / 100,
    };
    portfolio.tradeHistory.unshift(trade);

    await savePortfolio(portfolio);
    return portfolio;
};

// Update current prices for all positions
export const updatePositionPrices = async (
    portfolio: Portfolio,
    priceMap: { [ticker: string]: number }
): Promise<Portfolio> => {
    portfolio.positions.forEach(position => {
        if (priceMap[position.ticker] !== undefined) {
            position.currentPrice = priceMap[position.ticker];
        }
    });
    await savePortfolio(portfolio);
    return portfolio;
};
