// Portfolio Summary Component - Shows overall portfolio stats

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PortfolioSummary as PortfolioSummaryType } from '../types/trading';
import { formatCurrency, formatPercent } from '../services/trading';

interface PortfolioSummaryProps {
    summary: PortfolioSummaryType;
}

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ summary }) => {
    const isProfitable = summary.totalPnL >= 0;

    return (
        <View style={styles.container}>
            {/* Main Value Card */}
            <LinearGradient
                colors={['#1a1625', '#13111a']}
                style={styles.mainCard}
            >
                <Text style={styles.label}>Portfolio Value</Text>
                <Text style={styles.totalValue}>{formatCurrency(summary.totalValue)}</Text>
                <View style={styles.pnlRow}>
                    <Text style={[styles.pnlText, isProfitable ? styles.profit : styles.loss]}>
                        {formatCurrency(summary.totalPnL)} ({formatPercent(summary.totalPnLPercent)})
                    </Text>
                </View>
            </LinearGradient>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>💰 Cash</Text>
                    <Text style={styles.statValue}>{formatCurrency(summary.totalCash)}</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>📊 Invested</Text>
                    <Text style={styles.statValue}>{formatCurrency(summary.totalInvested)}</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>📈 Positions</Text>
                    <Text style={styles.statValue}>{summary.positionCount}</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>
                        {isProfitable ? '🏆 Best' : '📉 Worst'}
                    </Text>
                    <Text style={[styles.statValue, styles.smallText]}>
                        {summary.bestPerformer?.ticker.replace('.NS', '') || '-'}
                    </Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginBottom: 12,
    },
    mainCard: {
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(0, 229, 255, 0.2)',
    },
    label: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.5)',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    totalValue: {
        fontSize: 36,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    pnlRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pnlText: {
        fontSize: 16,
        fontWeight: '600',
    },
    profit: {
        color: '#00E676',
    },
    loss: {
        color: '#FF5252',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    statCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: 'rgba(30, 25, 45, 0.8)',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.5)',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#00E5FF',
    },
    smallText: {
        fontSize: 14,
    },
});
