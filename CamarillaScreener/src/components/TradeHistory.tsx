// Trade History Component - Shows all past transactions with P&L, filters, and search

import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Trade } from '../types/trading';
import { formatCurrency } from '../services/trading';

interface TradeHistoryProps {
    trades: Trade[];
}

type TradeFilter = 'all' | 'BUY' | 'SELL';

export const TradeHistory: React.FC<TradeHistoryProps> = ({ trades }) => {
    const [filter, setFilter] = useState<TradeFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredTrades = useMemo(() => {
        return trades.filter(trade => {
            // Type filter
            if (filter !== 'all' && trade.type !== filter) return false;

            // Search filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const ticker = trade.ticker.replace('.NS', '').toLowerCase();
                const company = (trade.companyName || '').toLowerCase();
                if (!ticker.includes(q) && !company.includes(q)) return false;
            }

            return true;
        });
    }, [trades, filter, searchQuery]);

    // Calculate summary stats for filtered view
    const summaryStats = useMemo(() => {
        const sellTrades = filteredTrades.filter(t => t.type === 'SELL' && t.pnl !== undefined);
        const totalPnL = sellTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const winners = sellTrades.filter(t => (t.pnl || 0) > 0).length;
        const losers = sellTrades.filter(t => (t.pnl || 0) < 0).length;
        return { totalPnL, winners, losers, totalSells: sellTrades.length };
    }, [filteredTrades]);

    const formatDate = (timestamp: number): string => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const renderTrade = ({ item }: { item: Trade }) => {
        const isBuy = item.type === 'BUY';
        const hasPnL = item.type === 'SELL' && item.pnl !== undefined;
        const isPnLPositive = hasPnL && (item.pnl || 0) >= 0;

        return (
            <View style={styles.tradeCard}>
                <View style={styles.tradeHeader}>
                    <View style={styles.tradeLeft}>
                        <View style={[styles.typeBadge, isBuy ? styles.buyBadge : styles.sellBadge]}>
                            <Text style={[styles.typeText, isBuy ? styles.buyText : styles.sellText]}>
                                {item.type}
                            </Text>
                        </View>
                        <View>
                            <Text style={styles.ticker}>{item.ticker.replace('.NS', '')}</Text>
                            <Text style={styles.date}>{formatDate(item.timestamp)}</Text>
                        </View>
                    </View>
                    <View style={styles.tradeRight}>
                        <Text style={styles.tradeValue}>{formatCurrency(item.totalValue)}</Text>
                        <Text style={styles.tradeDetails}>
                            {item.quantity} × ₹{item.price.toFixed(1)}
                        </Text>
                    </View>
                </View>

                {/* P&L Row for SELL trades */}
                {hasPnL && (
                    <View style={styles.pnlRow}>
                        <View style={styles.pnlDetail}>
                            <Text style={styles.pnlLabel}>Entry</Text>
                            <Text style={styles.pnlValue}>₹{item.entryPrice?.toFixed(1)}</Text>
                        </View>
                        <View style={styles.pnlDetail}>
                            <Text style={styles.pnlLabel}>Exit</Text>
                            <Text style={styles.pnlValue}>₹{item.price.toFixed(1)}</Text>
                        </View>
                        <View style={[styles.pnlBadge, isPnLPositive ? styles.profitBadge : styles.lossBadge]}>
                            <Text style={[styles.pnlBadgeText, isPnLPositive ? styles.profitText : styles.lossText]}>
                                {isPnLPositive ? '+' : ''}{formatCurrency(item.pnl || 0)} ({isPnLPositive ? '+' : ''}{item.pnlPercent?.toFixed(1)}%)
                            </Text>
                        </View>
                    </View>
                )}

                {item.notes ? (
                    <Text style={styles.notes}>{item.notes}</Text>
                ) : null}
            </View>
        );
    };

    if (trades.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>No trades yet</Text>
                <Text style={styles.emptySubtext}>Your transaction history will appear here</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search by stock name or symbol..."
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                />
            </View>

            {/* Filter Chips */}
            <View style={styles.filterRow}>
                <TouchableOpacity
                    style={[styles.filterChip, filter === 'all' && styles.activeFilter]}
                    onPress={() => setFilter('all')}
                >
                    <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
                        All ({trades.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterChip, filter === 'BUY' && styles.activeFilterBuy]}
                    onPress={() => setFilter('BUY')}
                >
                    <Text style={[styles.filterText, filter === 'BUY' && styles.buyFilterText]}>
                        Buys
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterChip, filter === 'SELL' && styles.activeFilterSell]}
                    onPress={() => setFilter('SELL')}
                >
                    <Text style={[styles.filterText, filter === 'SELL' && styles.sellFilterText]}>
                        Sells
                    </Text>
                </TouchableOpacity>
            </View>

            {/* P&L Summary (only shown when there are sell trades with P&L data) */}
            {summaryStats.totalSells > 0 && (
                <View style={styles.summaryRow}>
                    <View style={[styles.summaryPill, summaryStats.totalPnL >= 0 ? styles.profitBg : styles.lossBg]}>
                        <Text style={styles.summaryLabel}>Net P&L</Text>
                        <Text style={[styles.summaryValue, summaryStats.totalPnL >= 0 ? styles.profitText : styles.lossText]}>
                            {summaryStats.totalPnL >= 0 ? '+' : ''}{formatCurrency(summaryStats.totalPnL)}
                        </Text>
                    </View>
                    <View style={styles.summaryPillSmall}>
                        <Text style={styles.summaryLabel}>W</Text>
                        <Text style={[styles.summaryValue, styles.profitText]}>{summaryStats.winners}</Text>
                    </View>
                    <View style={styles.summaryPillSmall}>
                        <Text style={styles.summaryLabel}>L</Text>
                        <Text style={[styles.summaryValue, styles.lossText]}>{summaryStats.losers}</Text>
                    </View>
                </View>
            )}

            {/* Trade List */}
            <FlatList
                data={filteredTrades}
                keyExtractor={(item) => item.id}
                renderItem={renderTrade}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.noResults}>
                        <Text style={styles.noResultsText}>No matching trades found</Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchContainer: {
        marginHorizontal: 16,
        marginBottom: 8,
    },
    searchInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 13,
        color: '#FFFFFF',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    filterRow: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 8,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    activeFilter: {
        backgroundColor: 'rgba(0, 229, 255, 0.15)',
    },
    activeFilterBuy: {
        backgroundColor: 'rgba(0, 230, 118, 0.15)',
    },
    activeFilterSell: {
        backgroundColor: 'rgba(255, 82, 82, 0.15)',
    },
    filterText: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.5)',
    },
    activeFilterText: {
        color: '#00E5FF',
    },
    buyFilterText: {
        color: '#00E676',
    },
    sellFilterText: {
        color: '#FF5252',
    },
    summaryRow: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 10,
        gap: 8,
    },
    summaryPill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
        borderRadius: 10,
    },
    summaryPillSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    profitBg: {
        backgroundColor: 'rgba(0, 230, 118, 0.1)',
    },
    lossBg: {
        backgroundColor: 'rgba(255, 82, 82, 0.1)',
    },
    summaryLabel: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.5)',
        fontWeight: '600',
    },
    summaryValue: {
        fontSize: 13,
        fontWeight: '700',
    },
    list: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    tradeCard: {
        backgroundColor: 'rgba(30, 25, 45, 0.6)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    tradeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tradeLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    buyBadge: {
        backgroundColor: 'rgba(0, 230, 118, 0.15)',
    },
    sellBadge: {
        backgroundColor: 'rgba(255, 82, 82, 0.15)',
    },
    typeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    buyText: {
        color: '#00E676',
    },
    sellText: {
        color: '#FF5252',
    },
    ticker: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    date: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.4)',
    },
    tradeRight: {
        alignItems: 'flex-end',
    },
    tradeValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    tradeDetails: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.4)',
    },
    // P&L Row
    pnlRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.06)',
        gap: 8,
    },
    pnlDetail: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    pnlLabel: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.4)',
    },
    pnlValue: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.7)',
        fontWeight: '600',
    },
    pnlBadge: {
        marginLeft: 'auto',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    profitBadge: {
        backgroundColor: 'rgba(0, 230, 118, 0.15)',
    },
    lossBadge: {
        backgroundColor: 'rgba(255, 82, 82, 0.15)',
    },
    pnlBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    profitText: {
        color: '#00E676',
    },
    lossText: {
        color: '#FF5252',
    },
    notes: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.5)',
        marginTop: 8,
        fontStyle: 'italic',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    emptySubtext: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.5)',
    },
    noResults: {
        alignItems: 'center',
        padding: 30,
    },
    noResultsText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.4)',
    },
});
