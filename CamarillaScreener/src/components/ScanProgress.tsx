// Progress indicator component for scanning - Cyberpunk Theme

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

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Scanning NIFTY 500</Text>
                <Text style={styles.counter}>{current} / {total}</Text>
            </View>

            <View style={styles.progressBarContainer}>
                <LinearGradient
                    colors={['#00FFFF', '#FF00FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressBar, { width: `${progress}%` }]}
                />
            </View>

            <Text style={styles.currentTicker}>
                Analyzing: <Text style={styles.tickerName}>{currentTicker.replace('.NS', '')}</Text>
            </Text>

            <View style={styles.pulseContainer}>
                <View style={styles.pulse} />
                <Text style={styles.hint}>
                    ⏱ This may take 3-5 minutes for all 500 stocks
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(26, 10, 46, 0.9)',
        margin: 16,
        padding: 26,
        borderRadius: 24,
        borderWidth: 1.5,
        borderColor: 'rgba(0, 255, 255, 0.4)',
        shadowColor: '#FF00FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 18,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 1,
        textShadowColor: '#FF00FF',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
    },
    counter: {
        fontSize: 18,
        fontWeight: '700',
        color: '#00FFFF',
        letterSpacing: 1,
        textShadowColor: '#00FFFF',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
    },
    progressBarContainer: {
        height: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: 18,
        borderWidth: 1,
        borderColor: 'rgba(255, 0, 255, 0.3)',
    },
    progressBar: {
        height: '100%',
        borderRadius: 6,
    },
    currentTicker: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.6)',
        marginBottom: 14,
    },
    tickerName: {
        color: '#00FFFF',
        fontWeight: '700',
        letterSpacing: 1,
    },
    pulseContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    pulse: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FF00FF',
        marginRight: 10,
        shadowColor: '#FF00FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 6,
        elevation: 4,
    },
    hint: {
        fontSize: 12,
        color: 'rgba(255, 0, 255, 0.8)',
        letterSpacing: 0.5,
    },
});
