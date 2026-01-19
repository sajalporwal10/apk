// Camarilla Pivot Point Calculations

const CAM_MULT = 1.1; // Standard expansion factor for Camarilla formulas

/**
 * Calculate Camarilla R3 and S3 levels
 * R3 = Close + (High - Low) * 1.1 / 4
 * S3 = Close - (High - Low) * 1.1 / 4
 */
export function computeR3S3(
    high: number,
    low: number,
    close: number
): { r3: number; s3: number } {
    const diff = high - low;
    const r3 = Math.round(close + (diff * CAM_MULT) / 4.0);
    const s3 = Math.round(close - (diff * CAM_MULT) / 4.0);
    return { r3, s3 };
}

/**
 * Calculate percentage range between R3 and S3
 */
export function computePctRange(r3: number, s3: number): number | null {
    if (s3 === 0) return null;
    return Math.round(((r3 - s3) / s3) * 100 * 100) / 100; // Round to 2 decimal places
}

/**
 * Get last completed month's start and end dates
 */
export function getLastCompletedMonth(): { start: Date; end: Date; label: string } {
    const now = new Date();
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const month = now.getMonth() === 0 ? 11 : now.getMonth() - 1;

    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0); // Last day of the month

    const label = `${year}-${String(month + 1).padStart(2, '0')}`;

    return { start, end, label };
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}
