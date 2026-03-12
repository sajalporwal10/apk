// Volume Shocker Item Component - Premium Elegant Theme

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VolumeShockerData } from '../types';

interface VolumeShockerItemProps {
    stock: VolumeShockerData;
    onPress?: (stock: VolumeShockerData) => void;
}

/**
 * Format volume numbers into readable format (Cr / L / K)
 */
function formatVolume(vol: number): string {
    if (vol >= 10000000) {
        return `${(vol / 10000000).toFixed(1)}Cr`;
    }
    if (vol >= 100000) {
        return `${(vol / 100000).toFixed(1)}L`;
    }
    if (vol >= 1000) {
        return `${(vol / 1000).toFixed(1)}K`;
    }
    return vol.toString();
}

export const VolumeShockerItem: React.FC<VolumeShockerItemProps> = ({ stock, onPress }) => {
    // Progress bar width: cap at 100%, scale 100-1000% to 0-100%
    const progressWidth = Math.min((stock.volumePct / 1000) * 100, 100);

    const getVolProgressColors = (pct: number): [string, string] => {
        if (pct >= 500) return ['#00FF87', '#00E5FF'];   // Neon green-cyan - extreme
        if (pct >= 300) return ['#00E5FF', '#00B8D4'];   // Cyan - very high
        if (pct >= 200) return ['#64FFDA', '#00BFA5'];   // Teal - high
        return ['#FFD740', '#FF9100'];                    // Amber - moderate
    };

    const priceChangeColor = stock.priceChange >= 0 ? '#00FF87' : '#FF6B6B';
    const priceChangeSign = stock.priceChange >= 0 ? '+' : '';

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={() => onPress?.(stock)}
            activeOpacity={0.7}
        >
            {/* Top Row: Ticker and Volume Percentage */}
            <View style={styles.topRow}>
                <View style={styles.tickerSection}>
                    <Text style={styles.ticker}>{stock.ticker.replace('.NS', '')}</Text>
                    <Text style={styles.companyName} numberOfLines={1}>
                        {stock.companyName || stock.ticker.replace('.NS', '')}
                    </Text>
                </View>
                <View style={styles.volumeSection}>
                    <Text style={styles.volumePct}>+{stock.volumePct}%</Text>
                    <Text style={styles.volumeLabel}>of weekly vol</Text>
                </View>
            </View>

            {/* Volume Progress Bar */}
            <View style={styles.progressContainer}>
                <View style={styles.progressBackground}>
                    <LinearGradient
                        colors={getVolProgressColors(stock.volumePct)}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.progressBar, { width: `${progressWidth}%` }]}
                    />
                </View>
            </View>

            {/* Bottom Row: Stats Pills */}
            <View style={styles.statsRow}>
                <View style={styles.statPill}>
                    <Text style={styles.statLabel}>Today</Text>
                    <Text style={styles.statValue}>{formatVolume(stock.todayVolume)}</Text>
                </View>
                <View style={styles.statPill}>
                    <Text style={styles.statLabel}>Wk Avg</Text>
                    <Text style={styles.statValue}>{formatVolume(stock.weekAvgVolume)}</Text>
                </View>
                <View style={styles.pricePill}>
                    <Text style={styles.statLabel}>₹{stock.close}</Text>
                    <Text style={[styles.priceChange, { color: priceChangeColor }]}>
                        {priceChangeSign}{stock.priceChange}%
                    </Text>
                </View>
                <View style={styles.sectorPill}>
                    <Text style={styles.sectorText} numberOfLines={1}>
                        {stock.sector || 'Other'}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(30, 25, 45, 0.95)',
        marginHorizontal: 16,
        marginVertical: 6,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(100, 80, 150, 0.3)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    tickerSection: {
        flex: 1,
    },
    ticker: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    companyName: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.5)',
        marginTop: 2,
        maxWidth: '80%',
    },
    volumeSection: {
        alignItems: 'flex-end',
    },
    volumePct: {
        fontSize: 22,
        fontWeight: '800',
        color: '#00FF87',
    },
    volumeLabel: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.4)',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 2,
    },
    progressContainer: {
        marginBottom: 12,
    },
    progressBackground: {
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 3,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    statPill: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    statLabel: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.5)',
        fontWeight: '600',
    },
    statValue: {
        fontSize: 13,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    pricePill: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    priceChange: {
        fontSize: 12,
        fontWeight: '700',
    },
    sectorPill: {
        backgroundColor: 'rgba(180, 100, 255, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        flex: 1,
        marginLeft: 'auto',
    },
    sectorText: {
        fontSize: 11,
        color: '#B388FF',
        fontWeight: '600',
        textAlign: 'center',
    },
});
