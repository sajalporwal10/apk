// Screener - Main Application (Cyberpunk Theme)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { StockData } from './src/types';
import { StockListItem, StockDetailsModal, ScanProgress } from './src/components';
import { scanAllStocks } from './src/services/api';
import { saveScanResults, loadCachedResults, getCacheTimestamp } from './src/services/storage';
import { exportToCSV } from './src/services/export';
import { getLastCompletedMonth } from './src/utils/calculations';

export default function App() {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0, ticker: '' });
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [lastScanDate, setLastScanDate] = useState<Date | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const cancelRef = useRef(false);

  // Load cached results on app start
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const cached = await loadCachedResults();
      const timestamp = await getCacheTimestamp();

      if (cached && cached.length > 0) {
        setStocks(cached);
        setLastScanDate(timestamp);
      }
    } catch (error) {
      console.error('Error loading cached data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartScan = useCallback(async () => {
    if (isScanning) {
      // Cancel the scan
      cancelRef.current = true;
      return;
    }

    setIsScanning(true);
    cancelRef.current = false;
    setScanProgress({ current: 0, total: 0, ticker: '' });

    try {
      const results = await scanAllStocks(
        (current, total, ticker) => {
          setScanProgress({ current, total, ticker });
        },
        () => cancelRef.current
      );

      if (!cancelRef.current) {
        setStocks(results);
        await saveScanResults(results);
        setLastScanDate(new Date());

        Alert.alert(
          'Scan Complete',
          `Found ${results.length} stocks with narrow range (< 6.5%)`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Scan error:', error);
      Alert.alert(
        'Scan Failed',
        'Could not fetch stock data. Please check your internet connection.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsScanning(false);
      cancelRef.current = false;
    }
  }, [isScanning]);

  const handleExport = async () => {
    if (stocks.length === 0) {
      Alert.alert('No Data', 'Run a scan first to get results to export.');
      return;
    }

    setIsExporting(true);
    try {
      await exportToCSV(stocks);
    } catch (error) {
      Alert.alert('Export Failed', 'Could not export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleStockPress = (stock: StockData) => {
    setSelectedStock(stock);
    setModalVisible(true);
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'Never';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const { label: refMonth } = getLastCompletedMonth();

  return (
    <LinearGradient
      colors={['#1a0a2e', '#12142a', '#0d1b2a']}
      style={styles.gradientContainer}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a0a2e" />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Screener</Text>
            <Text style={styles.subtitle}>NIFTY 500 • {refMonth}</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={[styles.exportButton, isExporting && styles.buttonDisabled]}
              onPress={handleExport}
              disabled={isExporting || stocks.length === 0}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="#1a0a2e" />
              ) : (
                <Text style={styles.exportButtonText}>📤</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stocks.length}</Text>
            <Text style={styles.statLabel}>Stocks</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>&lt; 6.5%</Text>
            <Text style={styles.statLabel}>Range Filter</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatDate(lastScanDate).split(',')[0]}</Text>
            <Text style={styles.statLabel}>Last Scan</Text>
          </View>
        </View>

        {/* Scan Button */}
        <TouchableOpacity
          style={styles.scanButtonContainer}
          onPress={handleStartScan}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={isScanning ? ['#FF0055', '#FF00FF'] : ['#00FFFF', '#FF00FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.scanButton}
          >
            <Text style={styles.scanButtonText}>
              {isScanning ? '⏹ Stop Scan' : '🔍 Start Scan'}
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

        {/* Loading State */}
        {isLoading && !isScanning && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00FFFF" />
            <Text style={styles.loadingText}>Loading cached results...</Text>
          </View>
        )}

        {/* Empty State */}
        {!isLoading && !isScanning && stocks.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>No Results Yet</Text>
            <Text style={styles.emptyText}>
              Tap "Start Scan" to fetch NIFTY 500 stocks and calculate Camarilla levels
            </Text>
          </View>
        )}

        {/* Stock List */}
        {!isLoading && !isScanning && stocks.length > 0 && (
          <FlatList
            data={stocks}
            keyExtractor={(item) => item.ticker}
            renderItem={({ item }) => (
              <StockListItem stock={item} onPress={handleStockPress} />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={false}
                onRefresh={handleStartScan}
                tintColor="#00FFFF"
              />
            }
          />
        )}

        {/* Stock Details Modal */}
        <StockDetailsModal
          stock={selectedStock}
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setSelectedStock(null);
          }}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
    textShadowColor: '#00FFFF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#FF00FF',
    marginTop: 4,
    letterSpacing: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  exportButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00FFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FF00FF',
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 10,
  },
  exportButtonText: {
    fontSize: 22,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
    backdropFilter: 'blur(10px)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#00FFFF',
    textShadowColor: '#00FFFF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#FF00FF',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 0, 255, 0.4)',
    marginVertical: 4,
  },
  scanButtonContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#FF00FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  scanButton: {
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  scanButtonText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#00FFFF',
    fontSize: 16,
    marginTop: 16,
    letterSpacing: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    textShadowColor: '#FF00FF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  emptyText: {
    fontSize: 15,
    color: '#00FFFF',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 24,
  },
});
