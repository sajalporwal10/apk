// OpportunityItem - Individual stock card for the Good Opportunity tab
// Shows surge data, buy zone proximity, tracking status, and actions

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { OpportunityStock, EXTEND_OPTIONS_DAYS, NEAR_OPEN_THRESHOLD } from '../types/opportunity';

interface OpportunityItemProps {
  stock: OpportunityStock;
  onBuy: (stock: OpportunityStock) => void;
  onCloseTrade: (stock: OpportunityStock) => void;
  onExtend: (stock: OpportunityStock, days: number) => void;
  onArchive: (stock: OpportunityStock) => void;
}

export const OpportunityItem: React.FC<OpportunityItemProps> = ({
  stock,
  onBuy,
  onCloseTrade,
  onExtend,
  onArchive,
}) => {
  const ticker = stock.ticker.replace('.NS', '');
  const isAlert = stock.status === 'alert_active';
  const isBought = stock.status === 'bought';
  const isExpired = stock.status === 'expired';
  const isArchived = stock.status === 'archived';

  // Days remaining
  const now = Date.now();
  const daysRemaining = Math.max(
    0,
    Math.ceil((stock.trackingEndDate - now) / (24 * 60 * 60 * 1000))
  );
  const totalDays = Math.ceil(
    (stock.trackingEndDate - stock.trackingStartDate) / (24 * 60 * 60 * 1000)
  );

  // Buy zone proximity
  const currentPrice = stock.currentPrice || stock.surgeClose;
  const distFromLow = ((currentPrice - stock.surgeLow) / stock.surgeLow) * 100;
  const distFromOpen = ((currentPrice - stock.surgeOpen) / stock.surgeOpen) * 100;

  // Format volume
  const formatVolume = (vol: number): string => {
    if (vol >= 10000000) return `${(vol / 10000000).toFixed(1)}Cr`;
    if (vol >= 100000) return `${(vol / 100000).toFixed(1)}L`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`;
    return vol.toString();
  };

  // Format date
  const formatDate = (ts: number): string => {
    return new Date(ts).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
  };

  // Handle extend press
  const handleExtend = () => {
    Alert.alert(
      'Extend Tracking',
      `Currently tracking until ${formatDate(stock.trackingEndDate)}.\nMax: 4 months from surge date.`,
      [
        { text: 'Cancel', style: 'cancel' },
        ...EXTEND_OPTIONS_DAYS.map(d => ({
          text: `+${d} days`,
          onPress: () => onExtend(stock, d),
        })),
      ]
    );
  };

  // Handle buy press
  const handleBuy = () => {
    const price = stock.currentPrice || stock.surgeClose;
    Alert.alert(
      `Buy ${ticker}?`,
      `Mark as bought at ₹${price.toFixed(2)}?\nThis will track your entry for success rate.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm Buy', onPress: () => onBuy(stock) },
      ]
    );
  };

  // Handle close trade - delegates to parent which handles API price fetch
  const handleClose = () => {
    onCloseTrade(stock);
  };

  // Alert type label
  const getAlertLabel = (): string => {
    if (stock.alertType === 'below_low') return '📉 Below Surge Low';
    if (stock.alertType === 'near_open') return '🎯 Near Surge Open';
    return '';
  };

  // Status badge
  const getStatusBadge = () => {
    if (isAlert) return { label: '🔔 BUY ZONE', color: '#FF5252', bgColor: 'rgba(255, 82, 82, 0.15)' };
    if (isBought) {
      const isProfitable = (stock.outcomePercent || 0) >= 0;
      return {
        label: isProfitable ? '📈 In Profit' : '📉 In Loss',
        color: isProfitable ? '#00E676' : '#FF5252',
        bgColor: isProfitable ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 82, 82, 0.15)',
      };
    }
    if (isExpired) return { label: '⏰ Expired', color: '#FFD740', bgColor: 'rgba(255, 215, 64, 0.15)' };
    if (isArchived) return { label: '📦 Archived', color: '#90A4AE', bgColor: 'rgba(144, 164, 174, 0.15)' };
    return { label: '👁 Tracking', color: '#00E676', bgColor: 'rgba(0, 230, 118, 0.15)' };
  };

  const badge = getStatusBadge();

  return (
    <View style={[
      styles.container,
      isAlert && styles.alertContainer,
      isArchived && styles.archivedContainer,
    ]}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.tickerSection}>
          <Text style={styles.ticker}>{ticker}</Text>
          <View style={[styles.badge, { backgroundColor: badge.bgColor }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>
        <View style={styles.priceSection}>
          <Text style={styles.currentPrice}>₹{currentPrice.toFixed(2)}</Text>
          <Text style={[
            styles.priceChange,
            { color: (stock.priceChangeFromSurge || 0) >= 0 ? '#00E676' : '#FF5252' }
          ]}>
            {(stock.priceChangeFromSurge || 0) >= 0 ? '+' : ''}
            {(stock.priceChangeFromSurge || 0).toFixed(2)}%
          </Text>
        </View>
      </View>

      {/* Company Name */}
      <Text style={styles.companyName} numberOfLines={1}>
        {stock.companyName} • {stock.sector}
      </Text>

      {/* Alert Banner */}
      {isAlert && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>{getAlertLabel()}</Text>
          <Text style={styles.alertSubtext}>
            {stock.alertType === 'below_low'
              ? `Price ₹${currentPrice.toFixed(2)} < Low ₹${stock.surgeLow.toFixed(2)}`
              : `Price within ${NEAR_OPEN_THRESHOLD * 100}% of Open ₹${stock.surgeOpen.toFixed(2)}`}
          </Text>
        </View>
      )}

      {/* Surge Info Row */}
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Surge Date</Text>
          <Text style={styles.infoValue}>{formatDate(stock.surgeDate)}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Volume</Text>
          <Text style={[styles.infoValue, styles.volumeHighlight]}>
            {(stock.volumeMultiple / 100).toFixed(1)}× weekly
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Vol Today</Text>
          <Text style={styles.infoValue}>{formatVolume(stock.surgeDayVolume)}</Text>
        </View>
      </View>

      {/* Price Levels Row */}
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Surge Open</Text>
          <Text style={styles.infoValue}>₹{stock.surgeOpen.toFixed(0)}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Surge Low</Text>
          <Text style={styles.infoValue}>₹{stock.surgeLow.toFixed(0)}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Dist. from Low</Text>
          <Text style={[
            styles.infoValue,
            { color: distFromLow <= 2 ? '#FFD740' : '#B0BEC5' }
          ]}>
            {distFromLow >= 0 ? '+' : ''}{distFromLow.toFixed(1)}%
          </Text>
        </View>
      </View>

      {/* Bought info */}
      {isBought && stock.buyPrice && (
        <View style={styles.boughtInfoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Entry Price</Text>
            <Text style={styles.infoValue}>₹{stock.buyPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Qty</Text>
            <Text style={[styles.infoValue, { color: '#00E5FF' }]}>{stock.buyQuantity || 1} shares</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>P&L</Text>
            <Text style={[
              styles.infoValue,
              { color: (stock.outcomePercent || 0) >= 0 ? '#00E676' : '#FF5252', fontWeight: '700' }
            ]}>
              {(stock.outcomePercent || 0) >= 0 ? '+' : ''}{(stock.outcomePercent || 0).toFixed(2)}%
            </Text>
          </View>
        </View>
      )}

      {/* Total value for bought trades */}
      {isBought && stock.buyPrice && stock.buyQuantity && stock.buyQuantity > 1 && (
        <View style={styles.investmentRow}>
          <View style={styles.investmentItem}>
            <Text style={styles.infoLabel}>Invested</Text>
            <Text style={styles.infoValue}>
              ₹{(stock.buyPrice * stock.buyQuantity).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>
          <View style={styles.investmentItem}>
            <Text style={styles.infoLabel}>Current Value</Text>
            <Text style={[styles.infoValue, { color: (stock.outcomePercent || 0) >= 0 ? '#00E676' : '#FF5252' }]}>
              ₹{(currentPrice * stock.buyQuantity).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>
          <View style={styles.investmentItem}>
            <Text style={styles.infoLabel}>P&L (₹)</Text>
            <Text style={[styles.infoValue, { color: (stock.outcomePercent || 0) >= 0 ? '#00E676' : '#FF5252', fontWeight: '700' }]}>
              {((currentPrice - stock.buyPrice) * stock.buyQuantity) >= 0 ? '+' : ''}
              ₹{((currentPrice - stock.buyPrice) * stock.buyQuantity).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>
        </View>
      )}

      {/* Tracking progress bar */}
      {(stock.status === 'tracking' || stock.status === 'alert_active') && (
        <View style={styles.trackingRow}>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.max(0, Math.min(100, ((totalDays - daysRemaining) / totalDays) * 100))}%` }
              ]}
            />
          </View>
          <Text style={styles.daysText}>
            {daysRemaining}d left {stock.isExtended ? '(extended)' : ''}
          </Text>
        </View>
      )}

      {/* Closed trade info */}
      {stock.isClosed && stock.sellPrice && (() => {
        const closedQty = stock.buyQuantity || 1;
        const closedPnlPct = (stock.outcomePercent || 0);
        const closedPnlAbs = (stock.buyPrice && stock.buyQuantity)
          ? (stock.sellPrice - stock.buyPrice) * stock.buyQuantity
          : null;
        return (
          <View style={styles.closedTradeRow}>
            <Text style={styles.closedTradeText}>
              Closed {closedQty} share{closedQty > 1 ? 's' : ''} at ₹{stock.sellPrice.toFixed(2)} on {formatDate(stock.sellDate!)}
            </Text>
            <Text style={[
              styles.closedPnl,
              { color: closedPnlPct >= 0 ? '#00E676' : '#FF5252' }
            ]}>
              {closedPnlPct >= 0 ? '+' : ''}{closedPnlPct.toFixed(2)}% return
              {closedPnlAbs !== null ? ` (₹${closedPnlAbs >= 0 ? '+' : ''}${closedPnlAbs.toFixed(0)})` : ''}
            </Text>
          </View>
        );
      })()}

      {/* Action Buttons */}
      {!isArchived && (
        <View style={styles.actionsRow}>
          {isAlert && (
            <TouchableOpacity style={styles.buyButton} onPress={handleBuy}>
              <Text style={styles.buyButtonText}>🛒 Buy</Text>
            </TouchableOpacity>
          )}
          {isBought && !stock.isClosed && (
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeButtonText}>💰 Sell (Live)</Text>
            </TouchableOpacity>
          )}
          {(stock.status === 'tracking' || stock.status === 'alert_active' || isExpired) && (
            <TouchableOpacity style={styles.extendButton} onPress={handleExtend}>
              <Text style={styles.extendButtonText}>⏳ Extend</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.archiveButton}
            onPress={() => onArchive(stock)}
          >
            <Text style={styles.archiveButtonText}>📦</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  alertContainer: {
    borderColor: 'rgba(255, 82, 82, 0.4)',
    backgroundColor: 'rgba(255, 82, 82, 0.06)',
  },
  archivedContainer: {
    opacity: 0.6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tickerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ticker: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  priceSection: {
    alignItems: 'flex-end',
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  priceChange: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  companyName: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 4,
    marginBottom: 10,
  },
  alertBanner: {
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FF5252',
  },
  alertText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF5252',
  },
  alertSubtext: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.35)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B0BEC5',
    marginTop: 2,
  },
  volumeHighlight: {
    color: '#FFD740',
  },
  boughtInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    backgroundColor: 'rgba(0, 230, 118, 0.06)',
    padding: 8,
    borderRadius: 8,
  },
  investmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    backgroundColor: 'rgba(0, 229, 255, 0.06)',
    padding: 8,
    borderRadius: 8,
  },
  investmentItem: {
    flex: 1,
  },
  trackingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00E676',
    borderRadius: 2,
  },
  daysText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  closedTradeRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  closedTradeText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  closedPnl: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  buyButton: {
    flex: 1,
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  buyButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00E676',
  },
  closeButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 215, 64, 0.15)',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 64, 0.3)',
  },
  closeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFD740',
  },
  extendButton: {
    flex: 1,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
  },
  extendButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00E5FF',
  },
  archiveButton: {
    width: 36,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  archiveButtonText: {
    fontSize: 14,
  },
});
