// Screener - Main Application (Premium Elegant Theme with Sector Grouping)

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  SectionList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { StockData, RangeFilter, TabType, StockComment, GroupBy } from './src/types';
import { StockListItem, StockDetailsModal, ScanProgress, CommentsList, SectorHeader } from './src/components';
import { scanAllStocks, groupStocksBySector } from './src/services/api';
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

  // Tabs, filters, and grouping
  const [activeTab, setActiveTab] = useState<TabType>('screener');
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('under5');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [expandedSectors, setExpandedSectors] = useState<Set<string>>(new Set());

  const cancelRef = useRef(false);

  // Load cached results on app start
  useEffect(() => {
    loadInitialData();
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
          'Scan Complete ✨',
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

  const toggleSector = (sector: string) => {
    setExpandedSectors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sector)) {
        newSet.delete(sector);
      } else {
        newSet.add(sector);
      }
      return newSet;
    });
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'Never';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter stocks based on range filter
  const filteredStocks = useMemo(() => {
    if (rangeFilter === 'under5') {
      return stocks.filter(s => s.pctRangeR3 !== null && s.pctRangeR3 < 5);
    } else {
      return stocks.filter(s => s.pctRangeR3 !== null && s.pctRangeR3 >= 5 && s.pctRangeR3 <= 6.5);
    }
  }, [stocks, rangeFilter]);

  // Group stocks by sector for section list
  const sectionData = useMemo(() => {
    if (groupBy === 'none') return [];

    const groups = groupStocksBySector(filteredStocks);
    return Object.keys(groups)
      .sort()
      .map(sector => ({
        title: sector,
        data: groups[sector],
        count: groups[sector].length,
        isExpanded: expandedSectors.has(sector)
      }));
  }, [filteredStocks, groupBy, expandedSectors]);

  const { label: refMonth } = getLastCompletedMonth();
  const under5Count = stocks.filter(s => s.pctRangeR3 !== null && s.pctRangeR3 < 5).length;
  const between5and6Count = stocks.filter(s => s.pctRangeR3 !== null && s.pctRangeR3 >= 5 && s.pctRangeR3 <= 6.5).length;

  return (
    <LinearGradient
      colors={['#1a1625', '#13111a', '#0d0b12']}
      style={styles.gradientContainer}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1625" />

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
                <ActivityIndicator size="small" color="#1a1625" />
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
            {/* Range Filter Chips */}
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[styles.filterChip, rangeFilter === 'under5' && styles.activeFilterChip]}
                onPress={() => setRangeFilter('under5')}
              >
                <Text style={[styles.filterChipText, rangeFilter === 'under5' && styles.activeFilterChipText]}>
                  🔥 Under 5% ({under5Count})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, rangeFilter === 'between5and6.5' && styles.activeFilterChip]}
                onPress={() => setRangeFilter('between5and6.5')}
              >
                <Text style={[styles.filterChipText, rangeFilter === 'between5and6.5' && styles.activeFilterChipText]}>
                  📊 5-6.5% ({between5and6Count})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Group By Toggle */}
            <View style={styles.groupToggleRow}>
              <Text style={styles.groupLabel}>Group by:</Text>
              <TouchableOpacity
                style={[styles.groupChip, groupBy === 'none' && styles.activeGroupChip]}
                onPress={() => setGroupBy('none')}
              >
                <Text style={[styles.groupChipText, groupBy === 'none' && styles.activeGroupChipText]}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.groupChip, groupBy === 'sector' && styles.activeGroupChip]}
                onPress={() => {
                  setGroupBy('sector');
                  // Expand all sectors by default
                  const allSectors = Object.keys(groupStocksBySector(filteredStocks));
                  setExpandedSectors(new Set(allSectors));
                }}
              >
                <Text style={[styles.groupChipText, groupBy === 'sector' && styles.activeGroupChipText]}>Sector</Text>
              </TouchableOpacity>
            </View>

            {/* Scan Button */}
            <TouchableOpacity
              style={styles.scanButtonContainer}
              onPress={handleStartScan}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isScanning ? ['#FF6B6B', '#EE5A5A'] : ['#00E5FF', '#B388FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.scanButton}
              >
                <Text style={styles.scanButtonText}>
                  {isScanning ? '⏹ Stop Scan' : '⚡ Start Fast Scan'}
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
                <ActivityIndicator size="large" color="#00E5FF" />
                <Text style={styles.loadingText}>Loading cached results...</Text>
              </View>
            )}

            {/* Empty State */}
            {!isLoading && !isScanning && stocks.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📊</Text>
                <Text style={styles.emptyTitle}>No Results Yet</Text>
                <Text style={styles.emptyText}>
                  Tap "Start Fast Scan" to fetch NIFTY 500 stocks{'\n'}with parallel processing
                </Text>
              </View>
            )}

            {/* Stock List - Flat or Sectioned */}
            {!isLoading && !isScanning && filteredStocks.length > 0 && groupBy === 'none' && (
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
                    tintColor="#00E5FF"
                  />
                }
              />
            )}

            {/* Stock List - Grouped by Sector */}
            {!isLoading && !isScanning && filteredStocks.length > 0 && groupBy === 'sector' && (
              <SectionList
                sections={sectionData}
                keyExtractor={(item) => item.ticker}
                renderSectionHeader={({ section }) => (
                  <SectorHeader
                    sector={section.title}
                    count={section.count}
                    isExpanded={expandedSectors.has(section.title)}
                    onToggle={() => toggleSector(section.title)}
                  />
                )}
                renderItem={({ item, section }) =>
                  expandedSectors.has(section.title) ? (
                    <StockListItem stock={item} onPress={handleStockPress} />
                  ) : null
                }
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                stickySectionHeadersEnabled={false}
                refreshControl={
                  <RefreshControl
                    refreshing={false}
                    onRefresh={handleStartScan}
                    tintColor="#00E5FF"
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
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  exportButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00E5FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  exportButtonText: {
    fontSize: 18,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  // Main Tabs
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  activeTabText: {
    color: '#00E5FF',
  },
  // Filter Chips
  filterRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 10,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeFilterChip: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderColor: 'rgba(0, 229, 255, 0.4)',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  activeFilterChipText: {
    color: '#00E5FF',
  },
  // Group Toggle
  groupToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 8,
  },
  groupLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginRight: 4,
  },
  groupChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  activeGroupChip: {
    backgroundColor: 'rgba(179, 136, 255, 0.2)',
  },
  groupChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  activeGroupChipText: {
    color: '#B388FF',
  },
  // Scan Button
  scanButtonContainer: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#00E5FF',
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
  loadingContainer: {
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
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
  listContent: {
    paddingVertical: 4,
    paddingBottom: 20,
  },
});
