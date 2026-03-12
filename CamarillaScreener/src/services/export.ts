// Export service for generating and sharing CSV files

import { Paths, File } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { StockData } from '../types';
import { Trade } from '../types/trading';

/**
 * Generate CSV content from stock data
 */
function generateCSV(data: StockData[]): string {
    const headers = [
        'ticker',
        'year_month',
        'period_end',
        'open',
        'high',
        'low',
        'close',
        'r3',
        's3',
        'pct_range_r3'
    ];

    const rows = data.map(stock => [
        stock.ticker,
        stock.yearMonth || '',
        stock.periodEnd || '',
        stock.open?.toString() || '',
        stock.high?.toString() || '',
        stock.low?.toString() || '',
        stock.close?.toString() || '',
        stock.r3?.toString() || '',
        stock.s3?.toString() || '',
        stock.pctRangeR3?.toString() || ''
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
}

/**
 * Generate CSV content from trade history
 */
function generateTradeCSV(trades: Trade[]): string {
    const headers = [
        'date',
        'type',
        'ticker',
        'company_name',
        'quantity',
        'price',
        'total_value',
        'entry_price',
        'pnl',
        'pnl_percent',
        'notes'
    ];

    const rows = trades.map(trade => {
        const date = new Date(trade.timestamp).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
        return [
            `"${date}"`,
            trade.type,
            trade.ticker.replace('.NS', ''),
            `"${trade.companyName || ''}"`,
            trade.quantity.toString(),
            trade.price.toFixed(2),
            trade.totalValue.toFixed(2),
            trade.entryPrice?.toFixed(2) || '',
            trade.pnl?.toFixed(2) || '',
            trade.pnlPercent?.toFixed(2) || '',
            `"${(trade.notes || '').replace(/"/g, '""')}"`
        ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
}

/**
 * Export stock data as CSV and share
 */
export async function exportToCSV(data: StockData[]): Promise<void> {
    try {
        const csvContent = generateCSV(data);
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const fileName = `camarilla_screener_${dateStr}.csv`;

        // Create file in document directory using new API
        const file = new File(Paths.document, fileName);

        // Write content to file
        await file.write(csvContent);

        const canShare = await isAvailableAsync();
        if (canShare) {
            await shareAsync(file.uri, {
                mimeType: 'text/csv',
                dialogTitle: 'Export Camarilla Screener Results'
            });
        } else {
            throw new Error('Sharing is not available on this device');
        }
    } catch (error) {
        console.error('Error exporting CSV:', error);
        throw error;
    }
}

/**
 * Export trade history as CSV and share
 */
export async function exportTradeHistoryToCSV(trades: Trade[]): Promise<void> {
    try {
        const csvContent = generateTradeCSV(trades);
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const fileName = `trade_history_${dateStr}.csv`;

        const file = new File(Paths.document, fileName);
        await file.write(csvContent);

        const canShare = await isAvailableAsync();
        if (canShare) {
            await shareAsync(file.uri, {
                mimeType: 'text/csv',
                dialogTitle: 'Export Trade History'
            });
        } else {
            throw new Error('Sharing is not available on this device');
        }
    } catch (error) {
        console.error('Error exporting trade history:', error);
        throw error;
    }
}

