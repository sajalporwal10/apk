// Stock List Item Component - Premium Elegant Theme

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StockData } from '../types';

interface StockListItemProps {
    stock: StockData;
    onPress: (stock: StockData) => void;
}

export const StockListItem: React.FC<StockListItemProps> = ({ stock, onPress }) => {
    // Calculate progress bar width (0-6.5% maps to 0-100%)
    const progressWidth = stock.pctRangeR3
        ? Math.min((stock.pctRangeR3 / 6.5) * 100, 100)
        : 0;

    const getProgressColors = (pct: number | null): [string, string] => {
        if (pct === null) return ['#444', '#333'];
        if (pct < 2) return ['#00FF87', '#00E5FF'];      // Green-Cyan - very tight
        if (pct < 3) return ['#00E5FF', '#00B8D4'];      // Cyan
        if (pct < 4) return ['#64FFDA', '#00BFA5'];      // Teal
        if (pct < 5) return ['#FFD740', '#FF9100'];      // Amber-Orange
        return ['#FF6D00', '#FF3D00'];                    // Orange-Red - wider range
    };

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={() => onPress(stock)}
            activeOpacity={0.7}
        >
            {/* Top Row: Ticker and Range */}
            <View style={styles.topRow}>
                <View style={styles.tickerSection}>
                    <Text style={styles.ticker}>{stock.ticker.replace('.NS', '')}</Text>
                    <Text style={styles.companyName} numberOfLines={1}>
                        {stock.companyName || stock.ticker.replace('.NS', '')}
                    </Text>
                </View>
                <View style={styles.rangeSection}>
                    <Text style={styles.rangeValue}>{stock.pctRangeR3?.toFixed(2)}%</Text>
                    <Text style={styles.rangeLabel}>Range</Text>
                </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
                <View style={styles.progressBackground}>
                    <LinearGradient
                        colors={getProgressColors(stock.pctRangeR3)}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.progressBar, { width: `${progressWidth}%` }]}
                    />
                </View>
            </View>

            {/* Bottom Row: Stats Pills */}
            <View style={styles.statsRow}>
                <View style={styles.statPill}>
                    <Text style={styles.statLabel}>R3</Text>
                    <Text style={styles.statValue}>₹{stock.r3?.toLocaleString()}</Text>
                </View>
                <View style={styles.statPill}>
                    <Text style={styles.statLabel}>S3</Text>
                    <Text style={styles.statValue}>₹{stock.s3?.toLocaleString()}</Text>
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
        // Neumorphic shadow
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
    rangeSection: {
        alignItems: 'flex-end',
    },
    rangeValue: {
        fontSize: 22,
        fontWeight: '800',
        color: '#00E5FF',
    },
    rangeLabel: {
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
    },
    statPill: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
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
