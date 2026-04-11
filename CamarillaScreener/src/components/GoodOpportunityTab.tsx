// GoodOpportunityTab - Main tab component for volume surge tracking
// Scans Nifty 500 for volume surges, tracks stocks, and alerts buy zones
// Supports paper trading with quantity tracking and live sell price from API

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { OpportunityStock, OpportunityHistoryStats } from '../types/opportunity';
import { scanGoodOpportunities, refreshTrackedPrices } from '../services/opportunityApi';
import { fetchCurrentPrice } from '../services/api';
import {
  loadOpportunities,
  saveOpportunities,
  saveOpportunityScanTimestamp,
  getOpportunityScanTimestamp,
  mergeNewOpportunities,
  markAsBought,
  closeTrade,
  extendTracking,
  archiveOpportunity,
  computeHistoryStats,
} from '../services/opportunityStorage';
import { OpportunityItem } from './OpportunityItem';
import { ScanProgress } from './ScanProgress';

export const GoodOpportunityTab: React.FC = () => {
  const [stocks, setStocks] = useState<OpportunityStock[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingCache, setIsLoadingCache] = useState(true);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0, ticker: '' });
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showStats, setShowStats] = useState(true);

  // Paper trading modal state
  const [buyModalVisible, setBuyModalVisible] = useState(false);
  const [buyModalStock, setBuyModalStock] = useState<OpportunityStock | null>(null);
  const [buyQuantity, setBuyQuantity] = useState('');
  const [isFetchingSellPrice, setIsFetchingSellPrice] = useState(false);

  const cancelRef = useRef(false);

  // ─── Derived data ──────────────────────────────────────────────

  const alertStocks = useMemo(
    () => stocks.filter(s => s.status === 'alert_active'),
    [stocks]
  );

  const trackingStocks = useMemo(
    () => stocks.filter(s => s.status === 'tracking'),
    [stocks]
  );

  const boughtStocks = useMemo(
    () => stocks.filter(s => s.status === 'bought' && !s.isClosed),
    [stocks]
  );

  const expiredStocks = useMemo(
    () => stocks.filter(s => s.status === 'expired'),
    [stocks]
  );

  const archivedStocks = useMemo(
    () => stocks.filter(s => s.status === 'archived' || (s.isClosed)),
    [stocks]
  );

  const stats: OpportunityHistoryStats = useMemo(
    () => computeHistoryStats(stocks),
    [stocks]
  );

  // ─── Load cached data on mount ─────────────────────────────────

  useEffect(() => {
    loadCachedData();
  }, []);

  const loadCachedData = async () => {
    setIsLoadingCache(true);
    try {
      const cached = await loadOpportunities();
      const timestamp = await getOpportunityScanTimestamp();

      if (cached.length > 0) {
        setStocks(cached);
      }
      setLastScanTime(timestamp);
    } catch (error) {
      console.error('Error loading cached opportunities:', error);
    } finally {
      setIsLoadingCache(false);
    }
  };

  // ─── Scan for new opportunities ────────────────────────────────

  const handleStartScan = useCallback(async () => {
    if (isScanning) {
      cancelRef.current = true;
      return;
    }

    setIsScanning(true);
    cancelRef.current = false;
    setScanProgress({ current: 0, total: 0, ticker: '' });

    try {
      const newOpportunities = await scanGoodOpportunities(
        (current, total, ticker) => {
          setScanProgress({ current, total, ticker });
        },
        () => cancelRef.current,
        stocks
      );

      if (!cancelRef.current) {
        // Merge new results with existing tracked stocks
        const merged = await mergeNewOpportunities(newOpportunities);
        setStocks(merged);
        setLastScanTime(new Date());
        await saveOpportunityScanTimestamp();

        Alert.alert(
          'Scan Complete 🎯',
          `Found ${newOpportunities.length} new volume surge stock${newOpportunities.length !== 1 ? 's' : ''}.\nTotal tracking: ${merged.filter(s => s.status === 'tracking' || s.status === 'alert_active').length} stocks.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Opportunity scan error:', error);
      Alert.alert(
        'Scan Failed',
        'Could not fetch stock data. Please check your internet connection.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsScanning(false);
      cancelRef.current = false;
    }
  }, [isScanning, stocks]);

  // ─── Refresh prices for tracked stocks ─────────────────────────

  const handleRefreshPrices = useCallback(async () => {
    const activeCount = stocks.filter(
      s => s.status === 'tracking' || s.status === 'alert_active' || (s.status === 'bought' && !s.isClosed)
    ).length;

    if (activeCount === 0) {
      Alert.alert('No Active Stocks', 'Scan first to find volume surge stocks.');
      return;
    }

    setIsRefreshing(true);
    setScanProgress({ current: 0, total: 0, ticker: '' });

    try {
      const updated = await refreshTrackedPrices(
        stocks,
        (current, total, ticker) => {
          setScanProgress({ current, total, ticker });
        }
      );

      setStocks(updated);
      await saveOpportunities(updated);

      const newAlerts = updated.filter(s => s.status === 'alert_active').length;
      if (newAlerts > 0) {
        Alert.alert(
          '🔔 Buy Zone Alert!',
          `${newAlerts} stock${newAlerts !== 1 ? 's are' : ' is'} in the buy zone!`,
          [{ text: 'View', style: 'default' }]
        );
      }
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [stocks]);

  // ─── Stock actions (paper trading) ─────────────────────────────

  // Open buy modal with quantity input
  const handleBuy = useCallback((stock: OpportunityStock) => {
    setBuyModalStock(stock);
    setBuyQuantity('');
    setBuyModalVisible(true);
  }, []);

  // Confirm buy with quantity
  const confirmBuy = useCallback(async () => {
    if (!buyModalStock) return;

    const qty = parseInt(buyQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid number of shares.');
      return;
    }

    const price = buyModalStock.currentPrice || buyModalStock.surgeClose;
    const updated = await markAsBought(buyModalStock.id, price, qty);
    setStocks(updated);
    setBuyModalVisible(false);
    setBuyModalStock(null);

    Alert.alert(
      'Paper Trade Placed! 🛒',
      `Bought ${qty} shares of ${buyModalStock.ticker.replace('.NS', '')} at ₹${price.toFixed(2)}\nTotal: ₹${(qty * price).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      [{ text: 'OK' }]
    );
  }, [buyModalStock, buyQuantity]);

  // Sell — fetch live price from API first, then confirm
  const handleCloseTrade = useCallback(async (stock: OpportunityStock) => {
    const ticker = stock.ticker.replace('.NS', '');

    Alert.alert(
      `Sell ${ticker}?`,
      'Fetching live market price...',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Fetch Price & Sell',
          onPress: async () => {
            setIsFetchingSellPrice(true);
            try {
              const livePrice = await fetchCurrentPrice(stock.ticker);
              setIsFetchingSellPrice(false);

              if (livePrice === null) {
                Alert.alert(
                  'Price Fetch Failed',
                  'Could not get live price. Use last known price?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: `Use ₹${(stock.currentPrice || stock.surgeClose).toFixed(2)}`,
                      onPress: async () => {
                        const sellPrice = stock.currentPrice || stock.surgeClose;
                        const pnl = stock.buyPrice
                          ? ((sellPrice - stock.buyPrice) / stock.buyPrice * 100).toFixed(2)
                          : '0';
                        const updated = await closeTrade(stock.id, sellPrice);
                        setStocks(updated);
                        Alert.alert(
                          'Trade Closed 💰',
                          `Sold ${ticker} at ₹${sellPrice.toFixed(2)}\nP&L: ${Number(pnl) >= 0 ? '+' : ''}${pnl}%`
                        );
                      },
                    },
                  ]
                );
                return;
              }

              // Got live price — show confirmation with P&L
              const entryPrice = stock.buyPrice || stock.surgeClose;
              const pnlAmount = (livePrice - entryPrice) * (stock.buyQuantity || 1);
              const pnlPct = ((livePrice - entryPrice) / entryPrice * 100).toFixed(2);
              const totalValue = livePrice * (stock.buyQuantity || 1);

              Alert.alert(
                `Sell ${ticker}?`,
                `📈 Live Price: ₹${livePrice.toFixed(2)}\n` +
                `📊 Entry: ₹${entryPrice.toFixed(2)}\n` +
                `📦 Qty: ${stock.buyQuantity || 1} shares\n` +
                `💰 Total: ₹${totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}\n` +
                `${Number(pnlPct) >= 0 ? '📈' : '📉'} P&L: ${Number(pnlPct) >= 0 ? '+' : ''}${pnlPct}% (₹${pnlAmount >= 0 ? '+' : ''}${pnlAmount.toFixed(0)})`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: '✅ Confirm Sell',
                    style: 'destructive',
                    onPress: async () => {
                      const updated = await closeTrade(stock.id, livePrice);
                      setStocks(updated);
                      Alert.alert(
                        'Trade Closed! 💰',
                        `Sold ${stock.buyQuantity || 1} shares of ${ticker} at ₹${livePrice.toFixed(2)}\nP&L: ${Number(pnlPct) >= 0 ? '+' : ''}${pnlPct}%`
                      );
                    },
                  },
                ]
              );
            } catch (error) {
              setIsFetchingSellPrice(false);
              Alert.alert('Error', 'Failed to fetch live price. Please try again.');
            }
          },
        },
      ]
    );
  }, []);

  const handleExtend = useCallback(async (stock: OpportunityStock, days: number) => {
    const updated = await extendTracking(stock.id, days);
    setStocks(updated);
  }, []);

  const handleArchive = useCallback(async (stock: OpportunityStock) => {
    Alert.alert(
      'Archive Stock?',
      `Remove ${stock.ticker.replace('.NS', '')} from active tracking?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            const updated = await archiveOpportunity(stock.id);
            setStocks(updated);
          },
        },
      ]
    );
  }, []);

  // ─── Helpers ───────────────────────────────────────────────────

  const formatScanTime = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ─── Render ────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={handleRefreshPrices}
            tintColor="#00E676"
          />
        }
      >
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryLeft}>
            <Text style={styles.summaryIcon}>🎯</Text>
            <View>
              <Text style={styles.summaryTitle}>Good Opportunity</Text>
              <Text style={styles.summarySubtitle}>
                {lastScanTime
                  ? `Last scan: ${formatScanTime(lastScanTime)}`
                  : 'Volume surge → Capitulation buy'}
              </Text>
            </View>
          </View>
          <View style={styles.summaryRight}>
            {alertStocks.length > 0 && (
              <View style={styles.alertBadge}>
                <Text style={styles.alertBadgeText}>{alertStocks.length} 🔔</Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Stats Row */}
        <View style={styles.quickStatsRow}>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>{trackingStocks.length + alertStocks.length}</Text>
            <Text style={styles.quickStatLabel}>Tracking</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStat}>
            <Text style={[styles.quickStatValue, { color: '#FF5252' }]}>{alertStocks.length}</Text>
            <Text style={styles.quickStatLabel}>Alerts</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStat}>
            <Text style={[styles.quickStatValue, { color: '#00E5FF' }]}>{boughtStocks.length}</Text>
            <Text style={styles.quickStatLabel}>Bought</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStat}>
            <Text style={[styles.quickStatValue, { color: '#FFD740' }]}>{expiredStocks.length}</Text>
            <Text style={styles.quickStatLabel}>Expired</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          {/* Scan Button */}
          <TouchableOpacity
            style={styles.scanButtonContainer}
            onPress={handleStartScan}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isScanning ? ['#FF6B6B', '#EE5A5A'] : ['#00E676', '#00C853']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionButton}
            >
              <Text style={styles.actionButtonText}>
                {isScanning ? '⏹ Stop Scan' : '⚡ Scan Volume Surges'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Refresh Button */}
          <TouchableOpacity
            style={styles.refreshButtonContainer}
            onPress={handleRefreshPrices}
            activeOpacity={0.8}
            disabled={isRefreshing || isScanning}
          >
            <View style={[
              styles.refreshButton,
              (isRefreshing || isScanning) && styles.buttonDisabled,
            ]}>
              {isRefreshing ? (
                <ActivityIndicator size="small" color="#00E5FF" />
              ) : (
                <Text style={styles.refreshButtonText}>🔄</Text>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Scan Progress */}
        {(isScanning || isRefreshing) && (
          <ScanProgress
            current={scanProgress.current}
            total={scanProgress.total}
            currentTicker={scanProgress.ticker}
          />
        )}

        {/* Loading cached data */}
        {isLoadingCache && !isScanning && (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color="#00E676" />
            <Text style={styles.loadingText}>Loading tracked stocks...</Text>
          </View>
        )}

        {/* Empty State */}
        {!isLoadingCache && !isScanning && stocks.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyTitle}>No Opportunities Yet</Text>
            <Text style={styles.emptyText}>
              Tap "Scan Volume Surges" to find{'\n'}
              Nifty 500 stocks whose daily volume{'\n'}
              exceeds last week's total volume.{'\n\n'}
              📊 Scan daily at 3:15 PM for best results.
            </Text>
          </View>
        )}

        {/* ─── ALERT SECTION ─── */}
        {alertStocks.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🔔 Buy Zone Alerts</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{alertStocks.length}</Text>
              </View>
            </View>
            {alertStocks.map(stock => (
              <OpportunityItem
                key={stock.id}
                stock={stock}
                onBuy={handleBuy}
                onCloseTrade={handleCloseTrade}
                onExtend={handleExtend}
                onArchive={handleArchive}
              />
            ))}
          </View>
        )}

        {/* ─── BOUGHT / IN-TRADE SECTION ─── */}
        {boughtStocks.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>💼 Active Trades</Text>
              <View style={[styles.sectionBadge, { backgroundColor: 'rgba(0, 229, 255, 0.15)' }]}>
                <Text style={[styles.sectionBadgeText, { color: '#00E5FF' }]}>{boughtStocks.length}</Text>
              </View>
            </View>
            {boughtStocks.map(stock => (
              <OpportunityItem
                key={stock.id}
                stock={stock}
                onBuy={handleBuy}
                onCloseTrade={handleCloseTrade}
                onExtend={handleExtend}
                onArchive={handleArchive}
              />
            ))}
          </View>
        )}

        {/* ─── TRACKING SECTION ─── */}
        {trackingStocks.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>👁 Tracking</Text>
              <View style={[styles.sectionBadge, { backgroundColor: 'rgba(0, 230, 118, 0.15)' }]}>
                <Text style={[styles.sectionBadgeText, { color: '#00E676' }]}>{trackingStocks.length}</Text>
              </View>
            </View>
            {trackingStocks.map(stock => (
              <OpportunityItem
                key={stock.id}
                stock={stock}
                onBuy={handleBuy}
                onCloseTrade={handleCloseTrade}
                onExtend={handleExtend}
                onArchive={handleArchive}
              />
            ))}
          </View>
        )}

        {/* ─── EXPIRED SECTION ─── */}
        {expiredStocks.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>⏰ Expired</Text>
              <View style={[styles.sectionBadge, { backgroundColor: 'rgba(255, 215, 64, 0.15)' }]}>
                <Text style={[styles.sectionBadgeText, { color: '#FFD740' }]}>{expiredStocks.length}</Text>
              </View>
            </View>
            {expiredStocks.map(stock => (
              <OpportunityItem
                key={stock.id}
                stock={stock}
                onBuy={handleBuy}
                onCloseTrade={handleCloseTrade}
                onExtend={handleExtend}
                onArchive={handleArchive}
              />
            ))}
          </View>
        )}

        {/* ─── HISTORICAL STATS ─── */}
        {stats.totalOpportunities > 0 && (
          <TouchableOpacity
            style={styles.statsCard}
            onPress={() => setShowStats(!showStats)}
            activeOpacity={0.8}
          >
            <View style={styles.statsHeader}>
              <Text style={styles.statsTitle}>📊 Historical Success Rate</Text>
              <Text style={styles.statsToggle}>{showStats ? '▲' : '▼'}</Text>
            </View>

            {showStats && (
              <View style={styles.statsContent}>
                {/* Main success rate */}
                <View style={styles.successRateRow}>
                  <Text style={styles.successRateLabel}>Win Rate</Text>
                  <Text style={[
                    styles.successRateValue,
                    { color: stats.successRate >= 50 ? '#00E676' : '#FF5252' }
                  ]}>
                    {stats.stocksBought > 0 ? `${stats.successRate.toFixed(1)}%` : '—'}
                  </Text>
                </View>

                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{stats.totalOpportunities}</Text>
                    <Text style={styles.statLabel}>Found</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{stats.alertsTriggered}</Text>
                    <Text style={styles.statLabel}>Alerts</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{stats.stocksBought}</Text>
                    <Text style={styles.statLabel}>Bought</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#00E676' }]}>{stats.profitableCount}</Text>
                    <Text style={styles.statLabel}>Wins</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#FF5252' }]}>{stats.lossCount}</Text>
                    <Text style={styles.statLabel}>Losses</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#FFD740' }]}>{stats.pendingCount}</Text>
                    <Text style={styles.statLabel}>Open</Text>
                  </View>
                </View>

                {/* Average return */}
                {stats.stocksBought > 0 && (
                  <View style={styles.avgReturnRow}>
                    <Text style={styles.avgReturnLabel}>Avg Return (closed trades)</Text>
                    <Text style={[
                      styles.avgReturnValue,
                      { color: stats.avgReturnPercent >= 0 ? '#00E676' : '#FF5252' }
                    ]}>
                      {stats.avgReturnPercent >= 0 ? '+' : ''}{stats.avgReturnPercent.toFixed(2)}%
                    </Text>
                  </View>
                )}

                {/* Best / Worst */}
                {stats.bestTrade && (
                  <View style={styles.tradeHighlight}>
                    <Text style={styles.tradeHighlightLabel}>🏆 Best Trade</Text>
                    <Text style={[styles.tradeHighlightValue, { color: '#00E676' }]}>
                      {stats.bestTrade.ticker} +{stats.bestTrade.returnPercent.toFixed(2)}%
                    </Text>
                  </View>
                )}
                {stats.worstTrade && (
                  <View style={styles.tradeHighlight}>
                    <Text style={styles.tradeHighlightLabel}>💀 Worst Trade</Text>
                    <Text style={[styles.tradeHighlightValue, { color: '#FF5252' }]}>
                      {stats.worstTrade.ticker} {stats.worstTrade.returnPercent.toFixed(2)}%
                    </Text>
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* ─── ARCHIVED SECTION (collapsible) ─── */}
        {archivedStocks.length > 0 && (
          <View style={styles.sectionContainer}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setShowArchived(!showArchived)}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>📦 Archived ({archivedStocks.length})</Text>
              <Text style={styles.sectionToggle}>{showArchived ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showArchived &&
              archivedStocks.map(stock => (
                <OpportunityItem
                  key={stock.id}
                  stock={stock}
                  onBuy={handleBuy}
                  onCloseTrade={handleCloseTrade}
                  onExtend={handleExtend}
                  onArchive={handleArchive}
                />
              ))}
          </View>
        )}

        {/* Bottom padding for bottom tab bar */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Fetching sell price overlay */}
      {isFetchingSellPrice && (
        <View style={styles.fetchOverlay}>
          <View style={styles.fetchCard}>
            <ActivityIndicator size="large" color="#00E5FF" />
            <Text style={styles.fetchText}>Fetching live price...</Text>
            <Text style={styles.fetchSubtext}>Calling Yahoo Finance API</Text>
          </View>
        </View>
      )}

      {/* Buy Quantity Modal */}
      <Modal
        visible={buyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBuyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.buyModalCard}>
            <Text style={styles.buyModalTitle}>🛒 Paper Trade</Text>
            <Text style={styles.buyModalTicker}>
              {buyModalStock?.ticker.replace('.NS', '')}
            </Text>
            <Text style={styles.buyModalPrice}>
              Price: ₹{(buyModalStock?.currentPrice || buyModalStock?.surgeClose || 0).toFixed(2)}
            </Text>

            {/* Quantity Input */}
            <View style={styles.quantityInputContainer}>
              <Text style={styles.quantityLabel}>Quantity</Text>
              <TextInput
                style={styles.quantityInput}
                value={buyQuantity}
                onChangeText={setBuyQuantity}
                keyboardType="numeric"
                placeholder="Enter number of shares"
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoFocus
              />
            </View>

            {/* Total cost preview */}
            {buyQuantity && parseInt(buyQuantity, 10) > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Investment</Text>
                <Text style={styles.totalValue}>
                  ₹{((parseInt(buyQuantity, 10) || 0) * (buyModalStock?.currentPrice || buyModalStock?.surgeClose || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buyModalActions}>
              <TouchableOpacity
                style={styles.buyModalCancel}
                onPress={() => setBuyModalVisible(false)}
              >
                <Text style={styles.buyModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.buyModalConfirm,
                  (!buyQuantity || parseInt(buyQuantity, 10) <= 0) && { opacity: 0.4 },
                ]}
                onPress={confirmBuy}
                disabled={!buyQuantity || parseInt(buyQuantity, 10) <= 0}
              >
                <LinearGradient
                  colors={['#00E676', '#00C853']}
                  style={styles.buyModalConfirmGradient}
                >
                  <Text style={styles.buyModalConfirmText}>Buy</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  // Summary Card
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.2)',
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
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
  summaryRight: {
    alignItems: 'flex-end',
  },
  alertBadge: {
    backgroundColor: 'rgba(255, 82, 82, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.4)',
  },
  alertBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF5252',
  },
  // Quick Stats
  quickStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 12,
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quickStatLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  // Action Buttons
  buttonRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 6,
    gap: 10,
  },
  scanButtonContainer: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  actionButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  refreshButtonContainer: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  refreshButton: {
    width: 52,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
  },
  refreshButtonText: {
    fontSize: 20,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  // Sections
  sectionContainer: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.3,
  },
  sectionBadge: {
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF5252',
  },
  sectionToggle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  // Stats Card
  statsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statsToggle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  statsContent: {
    marginTop: 14,
  },
  successRateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  successRateLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
  },
  successRateValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
  },
  statItem: {
    width: '33.33%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  avgReturnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  avgReturnLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  avgReturnValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  tradeHighlight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  tradeHighlightLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  tradeHighlightValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  // Empty / Loading
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 20,
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
  // Fetch overlay
  fetchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  fetchCard: {
    backgroundColor: 'rgba(30, 25, 45, 0.98)',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  fetchText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
  },
  fetchSubtext: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    marginTop: 4,
  },
  // Buy Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  buyModalCard: {
    backgroundColor: '#1e1932',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.2)',
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  buyModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  buyModalTicker: {
    fontSize: 24,
    fontWeight: '800',
    color: '#00E676',
    textAlign: 'center',
    marginTop: 4,
  },
  buyModalPrice: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  quantityInputContainer: {
    marginBottom: 16,
  },
  quantityLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  quantityInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.2)',
    textAlign: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00E676',
  },
  buyModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  buyModalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  buyModalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  buyModalConfirm: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buyModalConfirmGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
  },
  buyModalConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
