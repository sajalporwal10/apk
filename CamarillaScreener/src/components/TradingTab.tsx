// Trading Tab Component - Main trading screen with portfolio and positions

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Portfolio, Position, createEmptyPortfolio } from '../types/trading';
import { StockData } from '../types';
import { PortfolioSummary } from './PortfolioSummary';
import { PositionCard } from './PositionCard';
import { TradeHistory } from './TradeHistory';
import { TradeModal } from './TradeModal';
import {
    loadPortfolio,
    savePortfolio,
    sellPosition as sellPositionAction,
    resetPortfolio
} from '../services/tradingStorage';
import { calculatePortfolioSummary } from '../services/trading';
import { fetchCurrentPrice } from '../services/api';

interface TradingTabProps {
    stocks: StockData[]; // For updating current prices
}

type SubTab = 'positions' | 'history';

export const TradingTab: React.FC<TradingTabProps> = ({ stocks }) => {
    const [portfolio, setPortfolio] = useState<Portfolio>(createEmptyPortfolio());
    const [activeSubTab, setActiveSubTab] = useState<SubTab>('positions');
    const [isLoading, setIsLoading] = useState(true);
    const [isFetchingPrice, setIsFetchingPrice] = useState(false);
    const [sellModalVisible, setSellModalVisible] = useState(false);
    const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
    const [currentSellPrice, setCurrentSellPrice] = useState<number | null>(null);

    // Load portfolio on mount
    useEffect(() => {
        loadInitialPortfolio();
    }, []);

    // Update position prices when stocks data changes
    useEffect(() => {
        if (stocks.length > 0 && portfolio.positions.length > 0) {
            updatePrices();
        }
    }, [stocks]);

    const loadInitialPortfolio = async () => {
        setIsLoading(true);
        try {
            const loaded = await loadPortfolio();
            setPortfolio(loaded);
        } catch (error) {
            console.error('Error loading portfolio:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updatePrices = useCallback(async () => {
        const updatedPortfolio = { ...portfolio };
        let hasUpdates = false;

        updatedPortfolio.positions.forEach(position => {
            const stock = stocks.find(s => s.ticker === position.ticker);
            if (stock && stock.close) {
                position.currentPrice = stock.close;
                if (stock.r3) position.r3Target = stock.r3;
                if (stock.s3) position.s3StopLoss = stock.s3;
                hasUpdates = true;
            }
        });

        if (hasUpdates) {
            await savePortfolio(updatedPortfolio);
            setPortfolio(updatedPortfolio);
        }
    }, [portfolio, stocks]);

    const handleSellPress = async (position: Position) => {
        setSelectedPosition(position);
        setIsFetchingPrice(true);
        setCurrentSellPrice(null);

        try {
            // Fetch current market price
            const currentPrice = await fetchCurrentPrice(position.ticker);

            if (currentPrice !== null) {
                setCurrentSellPrice(currentPrice);
                // Update position's current price
                position.currentPrice = currentPrice;
            } else {
                // Fallback to stored price if fetch fails
                setCurrentSellPrice(position.currentPrice);
                Alert.alert(
                    'Price Update',
                    'Could not fetch live price. Using last known price.',
                    [{ text: 'OK' }]
                );
            }

            setSellModalVisible(true);
        } catch (error) {
            console.error('Error fetching price:', error);
            setCurrentSellPrice(position.currentPrice);
            setSellModalVisible(true);
        } finally {
            setIsFetchingPrice(false);
        }
    };

    const handleSellConfirm = async (quantity: number, notes: string) => {
        if (!selectedPosition || currentSellPrice === null) return;

        try {
            const updatedPortfolio = await sellPositionAction(
                portfolio,
                selectedPosition.ticker,
                quantity,
                currentSellPrice, // Use the fetched current price
                notes
            );
            setPortfolio(updatedPortfolio);
            Alert.alert(
                'Sold!',
                `Successfully sold ${quantity} shares of ${selectedPosition.ticker.replace('.NS', '')} at ₹${currentSellPrice.toFixed(2)}`
            );
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to sell position');
        }
    };

    const handleResetPortfolio = () => {
        Alert.alert(
            'Reset Portfolio',
            'This will reset your portfolio to ₹1,00,000 and clear all positions and history. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        const newPortfolio = await resetPortfolio();
                        setPortfolio(newPortfolio);
                    },
                },
            ]
        );
    };

    const summary = calculatePortfolioSummary(portfolio);

    return (
        <View style={styles.container}>
            {/* Portfolio Summary */}
            <PortfolioSummary summary={summary} />

            {/* Sub Tabs */}
            <View style={styles.subTabsContainer}>
                <TouchableOpacity
                    style={[styles.subTab, activeSubTab === 'positions' && styles.activeSubTab]}
                    onPress={() => setActiveSubTab('positions')}
                >
                    <Text style={[styles.subTabText, activeSubTab === 'positions' && styles.activeSubTabText]}>
                        📊 Positions ({portfolio.positions.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.subTab, activeSubTab === 'history' && styles.activeSubTab]}
                    onPress={() => setActiveSubTab('history')}
                >
                    <Text style={[styles.subTabText, activeSubTab === 'history' && styles.activeSubTabText]}>
                        📋 History ({portfolio.tradeHistory.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Positions View */}
            {activeSubTab === 'positions' && (
                <ScrollView
                    style={styles.scrollView}
                    refreshControl={
                        <RefreshControl
                            refreshing={isLoading}
                            onRefresh={loadInitialPortfolio}
                            tintColor="#00E5FF"
                        />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    {portfolio.positions.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>📈</Text>
                            <Text style={styles.emptyTitle}>No Positions Yet</Text>
                            <Text style={styles.emptyText}>
                                Go to Screener tab and tap on a stock{'\n'}to add it to your portfolio
                            </Text>
                        </View>
                    ) : (
                        portfolio.positions.map(position => (
                            <PositionCard
                                key={position.id}
                                position={position}
                                onSellPress={handleSellPress}
                                isLoading={isFetchingPrice && selectedPosition?.id === position.id}
                            />
                        ))
                    )}

                    {/* Reset Button */}
                    <TouchableOpacity style={styles.resetButton} onPress={handleResetPortfolio}>
                        <Text style={styles.resetButtonText}>🔄 Reset Portfolio</Text>
                    </TouchableOpacity>
                </ScrollView>
            )}

            {/* History View */}
            {activeSubTab === 'history' && (
                <TradeHistory trades={portfolio.tradeHistory} />
            )}

            {/* Sell Modal */}
            <TradeModal
                visible={sellModalVisible}
                onClose={() => {
                    setSellModalVisible(false);
                    setSelectedPosition(null);
                    setCurrentSellPrice(null);
                }}
                stock={null}
                position={selectedPosition ? { ...selectedPosition, currentPrice: currentSellPrice || selectedPosition.currentPrice } : null}
                mode="SELL"
                availableCash={portfolio.cash}
                onConfirm={handleSellConfirm}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    subTabsContainer: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 10,
        padding: 3,
    },
    subTab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeSubTab: {
        backgroundColor: 'rgba(0, 229, 255, 0.15)',
    },
    subTabText: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.5)',
    },
    activeSubTabText: {
        color: '#00E5FF',
    },
    scrollView: {
        flex: 1,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 60,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.5)',
        textAlign: 'center',
        lineHeight: 22,
    },
    resetButton: {
        marginHorizontal: 16,
        marginTop: 20,
        marginBottom: 30,
        paddingVertical: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    resetButtonText: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.5)',
    },
});
