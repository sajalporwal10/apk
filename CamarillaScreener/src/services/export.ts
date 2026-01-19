// Export service for generating and sharing CSV files

import { Paths, File } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { StockData } from '../types';

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
