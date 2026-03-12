// Trading Tab Component - Main trading screen with portfolio and positions
// Features: Triple-confirmation reset, trade history export, P&L tracking

import React, { useState, useCallback } from 'react';
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
import { exportTradeHistoryToCSV } from '../services/export';

interface TradingTabProps {
    stocks: StockData[]; // For updating current prices
    portfolio: Portfolio; // Now received from parent
    onPortfolioChange: (portfolio: Portfolio) => void; // Callback to update parent state
    onRefreshPortfolio: () => void; // Callback to reload portfolio from storage
}

type SubTab = 'positions' | 'history';

export const TradingTab: React.FC<TradingTabProps> = ({
    stocks,
    portfolio,
    onPortfolioChange,
    onRefreshPortfolio
}) => {
    const [activeSubTab, setActiveSubTab] = useState<SubTab>('positions');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingPrice, setIsFetchingPrice] = useState(false);
    const [sellModalVisible, setSellModalVisible] = useState(false);
    const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
    const [currentSellPrice, setCurrentSellPrice] = useState<number | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [resetConfirmCount, setResetConfirmCount] = useState(0);

    const handleRefresh = async () => {
        setIsLoading(true);
        try {
            onRefreshPortfolio();
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
            onPortfolioChange(updatedPortfolio);
        }
    }, [portfolio, stocks, onPortfolioChange]);

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
            onPortfolioChange(updatedPortfolio);
            Alert.alert(
                'Sold!',
                `Successfully sold ${quantity} shares of ${selectedPosition.ticker.replace('.NS', '')} at ₹${currentSellPrice.toFixed(2)}`
            );
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to sell position');
        }
    };

    // Triple-confirmation reset flow
    const handleResetPortfolio = () => {
        const confirmMessages = [
            {
                title: '⚠️ Reset Portfolio (1/3)',
                message: 'This will reset your portfolio to ₹1,00,000 and close all positions.\n\nYour trade history will be ARCHIVED (not deleted).\n\nAre you sure?',
            },
            {
                title: '⚠️ Are You Sure? (2/3)',
                message: 'This action cannot be undone.\n\nAll open positions will be closed and cash reset to ₹1,00,000.\n\nConfirm again to proceed.',
            },
            {
                title: '🚨 Final Confirmation (3/3)',
                message: 'THIS IS YOUR LAST CHANCE.\n\nYour current session will be archived.\nPortfolio will be completely reset.\n\nProceed with reset?',
            },
        ];

        const showConfirmation = (step: number) => {
            const config = confirmMessages[step];
            Alert.alert(
                config.title,
                config.message,
                [
                    { text: 'Cancel', style: 'cancel', onPress: () => setResetConfirmCount(0) },
                    {
                        text: step < 2 ? 'Continue' : '🔴 Reset Now',
                        style: 'destructive',
                        onPress: async () => {
                            if (step < 2) {
                                showConfirmation(step + 1);
                            } else {
                                // Final confirmation passed - do the reset
                                const newPortfolio = await resetPortfolio();
                                onPortfolioChange(newPortfolio);
                                setResetConfirmCount(0);
                                Alert.alert(
                                    'Portfolio Reset ✅',
                                    'Your previous session has been archived.\nStarting fresh with ₹1,00,000.',
                                    [{ text: 'OK' }]
                                );
                            }
                        },
                    },
                ]
            );
        };

        showConfirmation(0);
    };

    // Export trade history
    const handleExportHistory = async () => {
        if (portfolio.tradeHistory.length === 0) {
            Alert.alert('No Trades', 'No trade history to export yet.');
            return;
        }

        setIsExporting(true);
        try {
            await exportTradeHistoryToCSV(portfolio.tradeHistory);
        } catch (error) {
            Alert.alert('Export Failed', 'Could not export trade history. Please try again.');
        } finally {
            setIsExporting(false);
        }
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
                            onRefresh={handleRefresh}
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

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                        {/* Export Button */}
                        <TouchableOpacity
                            style={[styles.actionButton, styles.exportActionButton]}
                            onPress={handleExportHistory}
                            disabled={isExporting || portfolio.tradeHistory.length === 0}
                        >
                            {isExporting ? (
                                <ActivityIndicator size="small" color="#00E5FF" />
                            ) : (
                                <Text style={styles.exportActionText}>📤 Export Trade History</Text>
                            )}
                        </TouchableOpacity>

                        {/* Reset Button */}
                        <TouchableOpacity
                            style={styles.resetButton}
                            onPress={handleResetPortfolio}
                        >
                            <Text style={styles.resetButtonText}>🔄 Reset Portfolio</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            )}

            {/* History View */}
            {activeSubTab === 'history' && (
                <View style={styles.historyContainer}>
                    <TradeHistory trades={portfolio.tradeHistory} />

                    {/* Export button at bottom of history */}
                    {portfolio.tradeHistory.length > 0 && (
                        <TouchableOpacity
                            style={[styles.historyExportButton, isExporting && { opacity: 0.5 }]}
                            onPress={handleExportHistory}
                            disabled={isExporting}
                        >
                            {isExporting ? (
                                <ActivityIndicator size="small" color="#00E5FF" />
                            ) : (
                                <Text style={styles.historyExportText}>📤 Export as CSV</Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
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
    historyContainer: {
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
    // Action Buttons
    actionButtons: {
        marginTop: 20,
        marginBottom: 30,
        gap: 10,
    },
    actionButton: {
        marginHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    exportActionButton: {
        backgroundColor: 'rgba(0, 229, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(0, 229, 255, 0.3)',
    },
    exportActionText: {
        fontSize: 13,
        color: '#00E5FF',
        fontWeight: '600',
    },
    resetButton: {
        marginHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'rgba(255, 82, 82, 0.08)',
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 82, 82, 0.2)',
    },
    resetButtonText: {
        fontSize: 13,
        color: 'rgba(255, 82, 82, 0.7)',
        fontWeight: '600',
    },
    historyExportButton: {
        marginHorizontal: 16,
        marginVertical: 10,
        paddingVertical: 12,
        backgroundColor: 'rgba(0, 229, 255, 0.1)',
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0, 229, 255, 0.3)',
    },
    historyExportText: {
        fontSize: 13,
        color: '#00E5FF',
        fontWeight: '600',
    },
});
