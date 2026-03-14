// Volume Shockers Tab - Dedicated tab for volume anomaly detection
// Only scans when the user explicitly presses the scan button
// Results are cached in AsyncStorage for persistence

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VolumeShockerData } from '../types';
import { scanVolumeShockers } from '../services/api';
import { saveVolumeShockers, loadCachedVolumeShockers, getVolumeCacheTimestamp } from '../services/storage';
import { VolumeShockerItem } from './VolumeShockerItem';
import { ScanProgress } from './ScanProgress';

interface VolumeShockersTabProps { }

export const VolumeShockersTab: React.FC<VolumeShockersTabProps> = () => {
    const [shockers, setShockers] = useState<VolumeShockerData[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [isLoadingCache, setIsLoadingCache] = useState(true);
    const [scanProgress, setScanProgress] = useState({ current: 0, total: 0, ticker: '' });
    const [hasScanned, setHasScanned] = useState(false);
    const [lastScanTime, setLastScanTime] = useState<Date | null>(null);

    // Compute min/max R3-S3 range from results
    const rangeStats = React.useMemo(() => {
        if (shockers.length === 0) return null;
        const ranges = shockers
            .filter(s => s.pctRangeR3 !== null && s.pctRangeR3 !== undefined)
            .map(s => s.pctRangeR3 as number);
        if (ranges.length === 0) return null;
        return {
            min: Math.min(...ranges),
            max: Math.max(...ranges),
        };
    }, [shockers]);

    const cancelRef = useRef(false);

    // Load cached results on mount
    useEffect(() => {
        loadCachedData();
    }, []);

    const loadCachedData = async () => {
        setIsLoadingCache(true);
        try {
            const cached = await loadCachedVolumeShockers();
            const timestamp = await getVolumeCacheTimestamp();

            if (cached && cached.length > 0) {
                setShockers(cached);
                setHasScanned(true);
                setLastScanTime(timestamp);
            }
        } catch (error) {
            console.error('Error loading cached volume shockers:', error);
        } finally {
            setIsLoadingCache(false);
        }
    };

    const handleStartScan = useCallback(async () => {
        if (isScanning) {
            cancelRef.current = true;
            return;
        }

        setIsScanning(true);
        cancelRef.current = false;
        setScanProgress({ current: 0, total: 0, ticker: '' });

        try {
            const results = await scanVolumeShockers(
                (current, total, ticker) => {
                    setScanProgress({ current, total, ticker });
                },
                () => cancelRef.current
            );

            if (!cancelRef.current) {
                setShockers(results);
                setHasScanned(true);
                setLastScanTime(new Date());

                // Save to cache
                await saveVolumeShockers(results);

                Alert.alert(
                    'Scan Complete 🔥',
                    `Found ${results.length} volume shockers from screener-qualified stocks (R3-S3 < 6.5%)`,
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            console.error('Volume scan error:', error);
            Alert.alert(
                'Scan Failed',
                'Could not fetch volume data. Please check your internet connection.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsScanning(false);
            cancelRef.current = false;
        }
    }, [isScanning]);

    const formatScanTime = (date: Date | null): string => {
        if (!date) return '';
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <View style={styles.container}>
            {/* Summary Header */}
            <View style={styles.summaryCard}>
                <View style={styles.summaryLeft}>
                    <Text style={styles.summaryIcon}>🔥</Text>
                    <View>
                        <Text style={styles.summaryTitle}>
                            {hasScanned
                                ? `${shockers.length} Volume Shocker${shockers.length !== 1 ? 's' : ''} Found`
                                : 'Volume Shockers'}
                        </Text>
                        <Text style={styles.summarySubtitle}>
                            {hasScanned
                                ? `Last scan: ${formatScanTime(lastScanTime)}`
                                : "Today's vol > Last week's combined"}
                        </Text>
                        {hasScanned && rangeStats && (
                            <Text style={styles.rangeInfo}>
                                📏 R3-S3 Range: {rangeStats.min.toFixed(1)}% - {rangeStats.max.toFixed(1)}%
                            </Text>
                        )}
                    </View>
                </View>
            </View>

            {/* Scan Button */}
            <TouchableOpacity
                style={styles.scanButtonContainer}
                onPress={handleStartScan}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={isScanning ? ['#FF6B6B', '#EE5A5A'] : ['#FF9100', '#FF6D00']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.scanButton}
                >
                    <Text style={styles.scanButtonText}>
                        {isScanning ? '⏹ Stop Scan' : '🔥 Scan Volume Shockers'}
                    </Text>
                </LinearGradient>
            </TouchableOpacity>

            {/* Scan Progress */}
            {isScanning && (
                <ScanProgress
                    current={scanProgress.current}
                    total={scanProgress.total}
                    currentTicker={scanProgress.ticker}
                />
            )}

            {/* Loading cached data */}
            {isLoadingCache && !isScanning && (
                <View style={styles.emptyContainer}>
                    <ActivityIndicator size="large" color="#FF9100" />
                    <Text style={styles.loadingText}>Loading cached results...</Text>
                </View>
            )}

            {/* Results List */}
            {!isScanning && !isLoadingCache && hasScanned && shockers.length > 0 && (
                <FlatList
                    data={shockers}
                    keyExtractor={(item) => item.ticker}
                    renderItem={({ item }) => (
                        <VolumeShockerItem stock={item} />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Empty State - Before First Scan */}
            {!isScanning && !isLoadingCache && !hasScanned && (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>📊</Text>
                    <Text style={styles.emptyTitle}>No Data Yet</Text>
                    <Text style={styles.emptyText}>
                        Tap "Scan Volume Shockers" to find stocks{'\n'}
                        whose today's volume exceeds the{'\n'}
                        entire last week's combined volume
                    </Text>
                </View>
            )}

            {/* Empty State - No Shockers Found */}
            {!isScanning && !isLoadingCache && hasScanned && shockers.length === 0 && (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>😴</Text>
                    <Text style={styles.emptyTitle}>No Shockers Today</Text>
                    <Text style={styles.emptyText}>
                        No stocks found with today's volume{'\n'}
                        exceeding last week's combined volume.{'\n'}
                        Try scanning again later.
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    summaryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 145, 0, 0.08)',
        marginHorizontal: 16,
        marginBottom: 10,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 145, 0, 0.2)',
    },
    summaryLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    summaryIcon: {
        fontSize: 28,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    summarySubtitle: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.5)',
        marginTop: 2,
    },
    rangeInfo: {
        fontSize: 11,
        color: '#00E5FF',
        marginTop: 3,
        fontWeight: '600',
    },
    scanButtonContainer: {
        marginHorizontal: 16,
        marginVertical: 6,
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#FF6D00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    scanButton: {
        paddingVertical: 14,
        alignItems: 'center',
    },
    scanButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    listContent: {
        paddingVertical: 4,
        paddingBottom: 20,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    loadingText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 15,
        marginTop: 16,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 10,
    },
    emptyText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.5)',
        textAlign: 'center',
        lineHeight: 22,
    },
});
