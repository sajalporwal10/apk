// Position Card Component - Displays individual position with P&L

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Position } from '../types/trading';
import {
    calculatePositionPnL,
    calculateDistanceToTarget,
    calculateDistanceToStopLoss,
    calculateDaysHeld,
    formatCurrency,
    formatPercent
} from '../services/trading';

interface PositionCardProps {
    position: Position;
    onSellPress: (position: Position) => void;
    isLoading?: boolean;
}

export const PositionCard: React.FC<PositionCardProps> = ({ position, onSellPress, isLoading = false }) => {
    const { pnl, pnlPercent } = calculatePositionPnL(position);
    const distanceToTarget = calculateDistanceToTarget(position);
    const distanceToStopLoss = calculateDistanceToStopLoss(position);
    const daysHeld = calculateDaysHeld(position.entryDate);
    const isProfitable = pnl >= 0;

    const investedValue = position.quantity * position.entryPrice;
    const currentValue = position.quantity * position.currentPrice;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.ticker}>{position.ticker.replace('.NS', '')}</Text>
                    <Text style={styles.companyName} numberOfLines={1}>
                        {position.companyName}
                    </Text>
                </View>
                <View style={[styles.pnlBadge, isProfitable ? styles.profitBadge : styles.lossBadge]}>
                    <Text style={[styles.pnlText, isProfitable ? styles.profitText : styles.lossText]}>
                        {formatPercent(pnlPercent)}
                    </Text>
                </View>
            </View>

            {/* Values Grid */}
            <View style={styles.valuesGrid}>
                <View style={styles.valueItem}>
                    <Text style={styles.valueLabel}>Qty</Text>
                    <Text style={styles.valueText}>{position.quantity}</Text>
                </View>
                <View style={styles.valueItem}>
                    <Text style={styles.valueLabel}>Avg</Text>
                    <Text style={styles.valueText}>₹{position.entryPrice.toFixed(1)}</Text>
                </View>
                <View style={styles.valueItem}>
                    <Text style={styles.valueLabel}>LTP</Text>
                    <Text style={styles.valueText}>₹{position.currentPrice.toFixed(1)}</Text>
                </View>
                <View style={styles.valueItem}>
                    <Text style={styles.valueLabel}>P&L</Text>
                    <Text style={[styles.valueText, isProfitable ? styles.profitText : styles.lossText]}>
                        {formatCurrency(pnl)}
                    </Text>
                </View>
            </View>

            {/* Targets Row */}
            <View style={styles.targetsRow}>
                {position.r3Target && (
                    <View style={styles.targetItem}>
                        <Text style={styles.targetLabel}>🎯 R3</Text>
                        <Text style={styles.targetValue}>
                            ₹{position.r3Target.toFixed(0)} ({distanceToTarget?.toFixed(1)}% away)
                        </Text>
                    </View>
                )}
                {position.s3StopLoss && (
                    <View style={styles.targetItem}>
                        <Text style={styles.targetLabel}>🛑 S3</Text>
                        <Text style={styles.targetValue}>
                            ₹{position.s3StopLoss.toFixed(0)} ({distanceToStopLoss?.toFixed(1)}% buffer)
                        </Text>
                    </View>
                )}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.daysHeld}>{daysHeld}d held • {formatCurrency(currentValue)}</Text>
                <TouchableOpacity
                    style={[styles.sellButton, isLoading && styles.sellButtonLoading]}
                    onPress={() => onSellPress(position)}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color="#FF5252" />
                    ) : (
                        <Text style={styles.sellButtonText}>Sell</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(30, 25, 45, 0.8)',
        borderRadius: 14,
        padding: 14,
        marginHorizontal: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    ticker: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    companyName: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.4)',
        maxWidth: 180,
    },
    pnlBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    profitBadge: {
        backgroundColor: 'rgba(0, 230, 118, 0.15)',
    },
    lossBadge: {
        backgroundColor: 'rgba(255, 82, 82, 0.15)',
    },
    pnlText: {
        fontSize: 14,
        fontWeight: '700',
    },
    profitText: {
        color: '#00E676',
    },
    lossText: {
        color: '#FF5252',
    },
    valuesGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    valueItem: {
        alignItems: 'center',
    },
    valueLabel: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.4)',
        marginBottom: 2,
    },
    valueText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    targetsRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 10,
    },
    targetItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    targetLabel: {
        fontSize: 11,
    },
    targetValue: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.5)',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    daysHeld: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.4)',
    },
    sellButton: {
        backgroundColor: 'rgba(255, 82, 82, 0.2)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 82, 82, 0.4)',
    },
    sellButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FF5252',
    },
    sellButtonLoading: {
        opacity: 0.6,
        minWidth: 50,
    },
});
