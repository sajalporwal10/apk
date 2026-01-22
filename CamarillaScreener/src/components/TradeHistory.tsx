// Trade History Component - Shows all past transactions

import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Trade } from '../types/trading';
import { formatCurrency } from '../services/trading';

interface TradeHistoryProps {
    trades: Trade[];
}

export const TradeHistory: React.FC<TradeHistoryProps> = ({ trades }) => {
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
        <FlatList
            data={trades}
            keyExtractor={(item) => item.id}
            renderItem={renderTrade}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
        />
    );
};

const styles = StyleSheet.create({
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
});
