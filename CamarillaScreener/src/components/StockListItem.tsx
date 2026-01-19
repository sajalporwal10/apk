// Stock List Item Component - Cyberpunk Theme

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StockData } from '../types';

interface StockListItemProps {
    stock: StockData;
    onPress: (stock: StockData) => void;
}

export const StockListItem: React.FC<StockListItemProps> = ({ stock, onPress }) => {
    const getRangeColor = (pct: number | null): [string, string] => {
        if (pct === null) return ['#444', '#333'];
        if (pct < 2) return ['#00FF87', '#00FFFF'];      // Cyan-green - very tight
        if (pct < 3) return ['#00FFFF', '#00CCFF'];      // Cyan
        if (pct < 4) return ['#FFD740', '#FF9100'];      // Amber-orange
        if (pct < 5) return ['#FF9100', '#FF5252'];      // Orange-red
        return ['#FF5252', '#FF0055'];                    // Red-magenta - wider range
    };

    const getBorderColor = (pct: number | null): string => {
        if (pct === null) return 'rgba(255, 255, 255, 0.1)';
        if (pct < 3) return 'rgba(0, 255, 255, 0.5)';     // Cyan border for tight
        if (pct < 5) return 'rgba(255, 0, 255, 0.5)';     // Magenta border for medium
        return 'rgba(255, 0, 85, 0.5)';                    // Red border for wide
    };

    return (
        <TouchableOpacity
            style={[styles.container, { borderColor: getBorderColor(stock.pctRangeR3) }]}
            onPress={() => onPress(stock)}
            activeOpacity={0.7}
        >
            <View style={styles.leftSection}>
                <Text style={styles.ticker}>{stock.ticker.replace('.NS', '')}</Text>
                <Text style={styles.period}>{stock.yearMonth}</Text>
            </View>

            <View style={styles.middleSection}>
                <View style={styles.priceRow}>
                    <Text style={styles.labelR3}>R3</Text>
                    <Text style={styles.valueR3}>₹{stock.r3?.toLocaleString()}</Text>
                </View>
                <View style={styles.priceRow}>
                    <Text style={styles.labelS3}>S3</Text>
                    <Text style={styles.valueS3}>₹{stock.s3?.toLocaleString()}</Text>
                </View>
            </View>

            <View style={styles.rightSection}>
                <LinearGradient
                    colors={getRangeColor(stock.pctRangeR3)}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.rangeBadge}
                >
                    <Text style={styles.rangeText}>{stock.pctRangeR3?.toFixed(2)}%</Text>
                </LinearGradient>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(26, 10, 46, 0.8)',
        marginHorizontal: 16,
        marginVertical: 6,
        padding: 18,
        borderRadius: 20,
        borderWidth: 1.5,
        shadowColor: '#FF00FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    leftSection: {
        flex: 1,
    },
    ticker: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 1,
        textShadowColor: '#00FFFF',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 6,
    },
    period: {
        fontSize: 12,
        color: '#FF00FF',
        marginTop: 4,
        letterSpacing: 0.5,
    },
    middleSection: {
        flex: 1.2,
        paddingHorizontal: 12,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 3,
    },
    labelR3: {
        fontSize: 12,
        color: '#00FF87',
        fontWeight: '700',
        letterSpacing: 1,
    },
    labelS3: {
        fontSize: 12,
        color: '#FF5252',
        fontWeight: '700',
        letterSpacing: 1,
    },
    valueR3: {
        fontSize: 14,
        color: '#00FFFF',
        fontWeight: '600',
    },
    valueS3: {
        fontSize: 14,
        color: '#FF00FF',
        fontWeight: '600',
    },
    rightSection: {
        alignItems: 'flex-end',
    },
    rangeBadge: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
        minWidth: 80,
        alignItems: 'center',
        shadowColor: '#00FFFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
        elevation: 6,
    },
    rangeText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#000',
        letterSpacing: 0.5,
    },
});
