// Progress indicator component for scanning - Premium Elegant Theme

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ScanProgressProps {
    current: number;
    total: number;
    currentTicker: string;
}

export const ScanProgress: React.FC<ScanProgressProps> = ({
    current,
    total,
    currentTicker
}) => {
    const progress = total > 0 ? (current / total) * 100 : 0;
    const estimatedTimeLeft = total > 0
        ? Math.ceil(((total - current) / 8) * 0.8 / 60) // 8 stocks per batch, ~0.8s per batch
        : 0;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Scanning Stocks</Text>
                    <Text style={styles.subtitle}>Processing in parallel batches</Text>
                </View>
                <View style={styles.counterBadge}>
                    <Text style={styles.counter}>{current}/{total}</Text>
                </View>
            </View>

            <View style={styles.progressBarContainer}>
                <LinearGradient
                    colors={['#00E5FF', '#B388FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressBar, { width: `${progress}%` }]}
                />
            </View>

            <View style={styles.infoRow}>
                <View style={styles.infoPill}>
                    <Text style={styles.infoLabel}>Current Batch</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>{currentTicker}</Text>
                </View>
                <View style={styles.infoPill}>
                    <Text style={styles.infoLabel}>Est. Time</Text>
                    <Text style={styles.infoValue}>~{estimatedTimeLeft} min</Text>
                </View>
            </View>

            <Text style={styles.hint}>
                ⚡ Processing 8 stocks simultaneously for faster scanning
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(30, 25, 45, 0.95)',
        margin: 16,
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(100, 80, 150, 0.3)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    subtitle: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.5)',
        marginTop: 2,
    },
    counterBadge: {
        backgroundColor: 'rgba(0, 229, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    counter: {
        fontSize: 16,
        fontWeight: '700',
        color: '#00E5FF',
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 16,
    },
    progressBar: {
        height: '100%',
        borderRadius: 4,
    },
    infoRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12,
    },
    infoPill: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
    },
    infoLabel: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.5)',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 13,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    hint: {
        fontSize: 12,
        color: '#B388FF',
        textAlign: 'center',
    },
});
