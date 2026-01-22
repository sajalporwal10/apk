// Trading Storage Service - Persist portfolio data locally

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Portfolio, Position, Trade, createEmptyPortfolio, DEFAULT_INITIAL_CAPITAL } from '../types/trading';

const PORTFOLIO_KEY = '@camarilla_portfolio';

// Load portfolio from storage
export const loadPortfolio = async (): Promise<Portfolio> => {
    try {
        const data = await AsyncStorage.getItem(PORTFOLIO_KEY);
        if (data) {
            return JSON.parse(data);
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

// Reset portfolio to initial state
export const resetPortfolio = async (initialCapital: number = DEFAULT_INITIAL_CAPITAL): Promise<Portfolio> => {
    const newPortfolio: Portfolio = {
        cash: initialCapital,
        initialCapital,
        positions: [],
        tradeHistory: [],
        lastUpdated: Date.now(),
    };
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

// Sell a position (partial or full)
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

    if (quantity === position.quantity) {
        // Close entire position
        portfolio.positions = portfolio.positions.filter(p => p.ticker !== ticker);
    } else {
        // Partial sell
        position.quantity -= quantity;
    }

    // Add cash
    portfolio.cash += totalValue;

    // Add to trade history
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
