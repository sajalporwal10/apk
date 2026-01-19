// Screener - Main Application (Cyberpunk Theme with Tabs)

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
  AppState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { StockData, RangeFilter, TabType, StockComment } from './src/types';
import { StockListItem, StockDetailsModal, ScanProgress, CommentsList } from './src/components';
import { scanAllStocks } from './src/services/api';
import { saveScanResults, loadCachedResults, getCacheTimestamp, getStocksWithComments } from './src/services/storage';
import { exportToCSV } from './src/services/export';
import { getLastCompletedMonth } from './src/utils/calculations';

export default function App() {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [stocksWithComments, setStocksWithComments] = useState<(StockData & { comment: StockComment })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0, ticker: '' });
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [lastScanDate, setLastScanDate] = useState<Date | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // New state for tabs and filters
  const [activeTab, setActiveTab] = useState<TabType>('screener');
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('under5');

  const cancelRef = useRef(false);
  const appState = useRef(AppState.currentState);

  // Load cached results on app start
  useEffect(() => {
    loadInitialData();

    // Listen for app state changes for background scanning
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to foreground - refresh comments
        refreshComments();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Refresh comments when stocks change
  useEffect(() => {
    if (stocks.length > 0) {
      refreshComments();
    }
  }, [stocks]);

  const refreshComments = async () => {
    const withComments = await getStocksWithComments(stocks);
    setStocksWithComments(withComments);
  };

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

  const handleCommentSaved = () => {
    refreshComments();
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

  // Filter stocks based on range filter
  const getFilteredStocks = (): StockData[] => {
    if (rangeFilter === 'under5') {
      return stocks.filter(s => s.pctRangeR3 !== null && s.pctRangeR3 < 5);
    } else {
      return stocks.filter(s => s.pctRangeR3 !== null && s.pctRangeR3 >= 5 && s.pctRangeR3 <= 6.5);
    }
  };

  const filteredStocks = getFilteredStocks();
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

        {/* Main Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'screener' && styles.activeTab]}
            onPress={() => setActiveTab('screener')}
          >
            <Text style={[styles.tabText, activeTab === 'screener' && styles.activeTabText]}>
              📊 Screener
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'comments' && styles.activeTab]}
            onPress={() => setActiveTab('comments')}
          >
            <Text style={[styles.tabText, activeTab === 'comments' && styles.activeTabText]}>
              💬 Notes ({stocksWithComments.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Screener Tab Content */}
        {activeTab === 'screener' && (
          <>
            {/* Range Filter Tabs */}
            <View style={styles.filterContainer}>
              <TouchableOpacity
                style={[styles.filterTab, rangeFilter === 'under5' && styles.activeFilterTab]}
                onPress={() => setRangeFilter('under5')}
              >
                <LinearGradient
                  colors={rangeFilter === 'under5' ? ['#00FFFF', '#00CCFF'] : ['transparent', 'transparent']}
                  style={styles.filterGradient}
                >
                  <Text style={[styles.filterText, rangeFilter === 'under5' && styles.activeFilterText]}>
                    🔥 Under 5%
                  </Text>
                  <Text style={[styles.filterCount, rangeFilter === 'under5' && styles.activeFilterCount]}>
                    {stocks.filter(s => s.pctRangeR3 !== null && s.pctRangeR3 < 5).length}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterTab, rangeFilter === 'between5and6.5' && styles.activeFilterTab]}
                onPress={() => setRangeFilter('between5and6.5')}
              >
                <LinearGradient
                  colors={rangeFilter === 'between5and6.5' ? ['#FF00FF', '#CC00FF'] : ['transparent', 'transparent']}
                  style={styles.filterGradient}
                >
                  <Text style={[styles.filterText, rangeFilter === 'between5and6.5' && styles.activeFilterText]}>
                    📊 5% - 6.5%
                  </Text>
                  <Text style={[styles.filterCount, rangeFilter === 'between5and6.5' && styles.activeFilterCount]}>
                    {stocks.filter(s => s.pctRangeR3 !== null && s.pctRangeR3 >= 5 && s.pctRangeR3 <= 6.5).length}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Stats Bar */}
            <View style={styles.statsBar}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{filteredStocks.length}</Text>
                <Text style={styles.statLabel}>Filtered</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stocks.length}</Text>
                <Text style={styles.statLabel}>Total</Text>
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
            {!isLoading && !isScanning && filteredStocks.length > 0 && (
              <FlatList
                data={filteredStocks}
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

            {/* No stocks in filter */}
            {!isLoading && !isScanning && stocks.length > 0 && filteredStocks.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyTitle}>No Stocks in Range</Text>
                <Text style={styles.emptyText}>
                  No stocks found with {rangeFilter === 'under5' ? 'range under 5%' : 'range between 5% and 6.5%'}
                </Text>
              </View>
            )}
          </>
        )}

        {/* Comments Tab Content */}
        {activeTab === 'comments' && (
          <CommentsList
            stocksWithComments={stocksWithComments}
            onStockPress={handleStockPress}
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
          onCommentSaved={handleCommentSaved}
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
    paddingTop: 12,
    paddingBottom: 8,
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
    fontSize: 13,
    color: '#FF00FF',
    marginTop: 2,
    letterSpacing: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  exportButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
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
    fontSize: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  // Main Tabs
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.5)',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  activeTabText: {
    color: '#00FFFF',
    fontWeight: '700',
  },
  // Filter Tabs
  filterContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  filterTab: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  activeFilterTab: {
    borderWidth: 0,
  },
  filterGradient: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  activeFilterText: {
    color: '#000',
    fontWeight: '700',
  },
  filterCount: {
    fontSize: 16,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  activeFilterCount: {
    color: '#000',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00FFFF',
    textShadowColor: '#00FFFF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  statLabel: {
    fontSize: 10,
    color: '#FF00FF',
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 0, 255, 0.3)',
    marginVertical: 2,
  },
  scanButtonContainer: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#FF00FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  scanButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  scanButtonText: {
    fontSize: 18,
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
    fontSize: 70,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
    textShadowColor: '#FF00FF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#00FFFF',
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.8,
  },
  listContent: {
    paddingVertical: 4,
    paddingBottom: 20,
  },
});
