/**
 * Camarilla Screener - Web Application
 * NIFTY 500 Stock Screener using Monthly Camarilla Pivot Points
 */

// ===== Configuration =====
const CONFIG = {
    // Local API endpoints (when using server.js)
    LOCAL_NIFTY500_API: '/api/nifty500',
    LOCAL_YAHOO_API: '/api/yahoo',

    // Fallback external URLs
    NIFTY500_CSV_URL: 'https://www.niftyindices.com/IndexConstituent/ind_nifty500list.csv',
    YAHOO_CHART_BASE: 'https://query1.finance.yahoo.com/v8/finance/chart',

    REQUEST_DELAY: 2000,
    MAX_PCT_RANGE: 6.5,
    CAM_MULT: 1.1,

    // Use local proxy (set to true when running with server.js)
    useLocalProxy: true,

    // Fallback CORS proxies (for external hosting)
    CORS_PROXIES: [
        'https://corsproxy.io/?',
        'https://api.codetabs.com/v1/proxy?quest=',
        '/proxy?url=' // Local proxy endpoint
    ],
    currentProxyIndex: 0
};

// Get current CORS proxy with fallback
function getCorsProxy() {
    return CONFIG.CORS_PROXIES[CONFIG.currentProxyIndex % CONFIG.CORS_PROXIES.length];
}

// Try next CORS proxy
function tryNextProxy() {
    CONFIG.currentProxyIndex++;
    return CONFIG.currentProxyIndex < CONFIG.CORS_PROXIES.length * 2;
}

// ===== State =====
let state = {
    stocks: [],
    isScanning: false,
    shouldCancel: false,
    selectedStock: null
};

// ===== DOM Elements =====
const elements = {
    refMonth: document.getElementById('refMonth'),
    stockCount: document.getElementById('stockCount'),
    lastScan: document.getElementById('lastScan'),
    scanBtn: document.getElementById('scanBtn'),
    scanIcon: document.getElementById('scanIcon'),
    scanText: document.getElementById('scanText'),
    exportBtn: document.getElementById('exportBtn'),
    progressSection: document.getElementById('progressSection'),
    progressCounter: document.getElementById('progressCounter'),
    progressBar: document.getElementById('progressBar'),
    currentTicker: document.getElementById('currentTicker'),
    emptyState: document.getElementById('emptyState'),
    resultsSection: document.getElementById('resultsSection'),
    stockList: document.getElementById('stockList'),
    modal: document.getElementById('stockModal'),
    modalClose: document.getElementById('modalClose')
};

// ===== Utility Functions =====
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getLastCompletedMonth() {
    const now = new Date();
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const month = now.getMonth() === 0 ? 11 : now.getMonth() - 1;

    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const label = `${year}-${String(month + 1).padStart(2, '0')}`;

    return { start, end, label, year, month };
}

function formatCurrency(value) {
    if (value === null || value === undefined) return '-';
    return '₹' + value.toLocaleString('en-IN');
}

function formatDate(date) {
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getRangeColor(pct) {
    if (pct === null) return 'amber';
    if (pct < 2) return 'green';
    if (pct < 3) return 'light-green';
    if (pct < 4) return 'amber';
    if (pct < 5) return 'orange';
    return 'red';
}

function getRangeDescription(pct) {
    if (pct < 2.5) return '🔥 Very tight consolidation - High breakout potential';
    if (pct < 4) return '📊 Moderate consolidation - Watch for breakout';
    return '📉 Wider range - Less predictable';
}

// ===== Camarilla Calculations =====
function computeR3S3(high, low, close) {
    const diff = high - low;
    const r3 = Math.round(close + (diff * CONFIG.CAM_MULT) / 4.0);
    const s3 = Math.round(close - (diff * CONFIG.CAM_MULT) / 4.0);
    return { r3, s3 };
}

function computePctRange(r3, s3) {
    if (s3 === 0) return null;
    return Math.round(((r3 - s3) / s3) * 100 * 100) / 100;
}

// ===== API Functions =====
async function fetchWithProxy(targetUrl, retries = 3) {
    let lastError;

    for (let i = 0; i < retries; i++) {
        try {
            const proxy = getCorsProxy();
            const url = proxy + encodeURIComponent(targetUrl);
            console.log(`Trying proxy ${CONFIG.currentProxyIndex + 1}: ${proxy}`);

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return response;
        } catch (error) {
            console.warn(`Proxy ${CONFIG.currentProxyIndex + 1} failed:`, error.message);
            lastError = error;
            tryNextProxy();
        }
    }

    throw lastError || new Error('All proxies failed');
}

async function fetchNifty500Symbols() {
    try {
        // Try local API first
        let response;
        try {
            console.log('Fetching NIFTY 500 list via local proxy...');
            response = await fetch(CONFIG.LOCAL_NIFTY500_API);
            if (!response.ok) throw new Error('Local API failed');
        } catch (e) {
            console.log('Local API failed, trying external proxies...');
            response = await fetchWithProxy(CONFIG.NIFTY500_CSV_URL);
        }

        const csvText = await response.text();
        const lines = csvText.split('\n');

        if (lines.length < 2) {
            throw new Error('Invalid CSV format');
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        let symbolIndex = headers.findIndex(h =>
            h.includes('symbol') || h.includes('ticker') || h.includes('code')
        );

        if (symbolIndex === -1) symbolIndex = 0;

        const symbols = [];
        const seen = new Set();

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',');
            if (cols.length > symbolIndex) {
                let symbol = cols[symbolIndex].trim().toUpperCase().replace(/"/g, '');
                if (!symbol || symbol === 'NAN' || symbol === '') continue;

                if (!symbol.endsWith('.NS') && !symbol.endsWith('.BO')) {
                    symbol = symbol + '.NS';
                }

                if (!seen.has(symbol)) {
                    seen.add(symbol);
                    symbols.push(symbol);
                }
            }
        }

        console.log(`Found ${symbols.length} symbols`);
        return symbols;
    } catch (error) {
        console.error('Error fetching NIFTY 500 symbols:', error);
        throw error;
    }
}

async function fetchMonthlyOHLC(ticker) {
    try {
        const { start, end, month, year } = getLastCompletedMonth();

        const period1 = Math.floor(start.getTime() / 1000) - 86400;
        const period2 = Math.floor(end.getTime() / 1000) + 86400;

        // Try local API first
        let response;
        try {
            const localUrl = `${CONFIG.LOCAL_YAHOO_API}/${ticker}?period1=${period1}&period2=${period2}`;
            response = await fetch(localUrl);
            if (!response.ok) throw new Error('Local API failed');
        } catch {
            // Fallback to proxy
            const yahooUrl = `${CONFIG.YAHOO_CHART_BASE}/${ticker}?interval=1mo&period1=${period1}&period2=${period2}`;
            try {
                response = await fetchWithProxy(yahooUrl, 1);
            } catch {
                return null;
            }
        }

        const data = await response.json();

        if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
            return null;
        }

        const result = data.chart.result[0];
        const quote = result.indicators.quote[0];

        if (!quote || !quote.open || quote.open.length === 0) {
            return null;
        }

        // Find the entry matching our target month
        for (let i = 0; i < result.timestamp.length; i++) {
            const date = new Date(result.timestamp[i] * 1000);
            if (date.getMonth() === month && date.getFullYear() === year) {
                if (quote.open[i] !== null && quote.high[i] !== null &&
                    quote.low[i] !== null && quote.close[i] !== null) {
                    return {
                        open: Math.round(quote.open[i]),
                        high: Math.round(quote.high[i]),
                        low: Math.round(quote.low[i]),
                        close: Math.round(quote.close[i]),
                        timestamp: result.timestamp[i]
                    };
                }
            }
        }

        // Fallback: use first available data
        if (quote.open[0] !== null) {
            return {
                open: Math.round(quote.open[0]),
                high: Math.round(quote.high[0]),
                low: Math.round(quote.low[0]),
                close: Math.round(quote.close[0]),
                timestamp: result.timestamp[0]
            };
        }

        return null;
    } catch (error) {
        console.error(`Error fetching data for ${ticker}:`, error);
        return null;
    }
}

async function processStock(ticker) {
    const { label } = getLastCompletedMonth();

    const ohlc = await fetchMonthlyOHLC(ticker);

    if (!ohlc) {
        return null;
    }

    const { r3, s3 } = computeR3S3(ohlc.high, ohlc.low, ohlc.close);
    const pctRangeR3 = computePctRange(r3, s3);

    // Filter out stocks with range >= 6.5%
    if (pctRangeR3 === null || pctRangeR3 >= CONFIG.MAX_PCT_RANGE) {
        return null;
    }

    return {
        ticker,
        yearMonth: label,
        periodEnd: new Date(ohlc.timestamp * 1000).toISOString().split('T')[0],
        open: ohlc.open,
        high: ohlc.high,
        low: ohlc.low,
        close: ohlc.close,
        r3,
        s3,
        pctRangeR3
    };
}

// ===== Scan Function =====
async function runScan() {
    if (state.isScanning) {
        // Cancel scan
        state.shouldCancel = true;
        return;
    }

    state.isScanning = true;
    state.shouldCancel = false;
    state.stocks = [];

    updateScanButton(true);
    showProgress();
    hideResults();

    try {
        updateProgress(0, 0, 'Fetching NIFTY 500 list...');

        const symbols = await fetchNifty500Symbols();
        const total = symbols.length;

        for (let i = 0; i < symbols.length; i++) {
            if (state.shouldCancel) {
                break;
            }

            const ticker = symbols[i];
            updateProgress(i + 1, total, ticker);

            const stockData = await processStock(ticker);

            if (stockData) {
                state.stocks.push(stockData);
            }

            await sleep(CONFIG.REQUEST_DELAY);
        }

        // Sort by pctRangeR3 ascending
        state.stocks.sort((a, b) => a.pctRangeR3 - b.pctRangeR3);

        // Update UI
        hideProgress();

        if (state.stocks.length > 0) {
            showResults();
            renderStockList();
            elements.exportBtn.disabled = false;
        } else {
            showEmptyState();
        }

        elements.stockCount.textContent = state.stocks.length;
        elements.lastScan.textContent = formatDate(new Date()).split(',')[0];

        // Save to localStorage
        localStorage.setItem('camarillaStocks', JSON.stringify(state.stocks));
        localStorage.setItem('camarillaLastScan', new Date().toISOString());

        if (!state.shouldCancel) {
            alert(`Scan complete! Found ${state.stocks.length} stocks with narrow range (< 6.5%)`);
        }

    } catch (error) {
        console.error('Scan error:', error);
        alert('Scan failed. Please check your internet connection and try again.');
        hideProgress();
        showEmptyState();
    } finally {
        state.isScanning = false;
        state.shouldCancel = false;
        updateScanButton(false);
    }
}

// ===== UI Update Functions =====
function updateScanButton(scanning) {
    if (scanning) {
        elements.scanBtn.classList.add('scanning');
        elements.scanIcon.textContent = '⏹';
        elements.scanText.textContent = 'Stop Scan';
    } else {
        elements.scanBtn.classList.remove('scanning');
        elements.scanIcon.textContent = '🔍';
        elements.scanText.textContent = 'Start Scan';
    }
}

function updateProgress(current, total, ticker) {
    elements.progressCounter.textContent = `${current} / ${total}`;
    elements.progressBar.style.width = total > 0 ? `${(current / total) * 100}%` : '0%';
    elements.currentTicker.textContent = ticker.replace('.NS', '');
}

function showProgress() {
    elements.progressSection.classList.remove('hidden');
    elements.emptyState.classList.add('hidden');
}

function hideProgress() {
    elements.progressSection.classList.add('hidden');
}

function showEmptyState() {
    elements.emptyState.classList.remove('hidden');
    elements.resultsSection.classList.add('hidden');
}

function showResults() {
    elements.resultsSection.classList.remove('hidden');
    elements.emptyState.classList.add('hidden');
}

function hideResults() {
    elements.resultsSection.classList.add('hidden');
}

function renderStockList() {
    elements.stockList.innerHTML = state.stocks.map(stock => `
        <div class="stock-card" data-ticker="${stock.ticker}">
            <div class="stock-left">
                <div class="stock-ticker">${stock.ticker.replace('.NS', '')}</div>
                <div class="stock-period">${stock.yearMonth}</div>
            </div>
            <div class="stock-middle">
                <div class="stock-price-row">
                    <span class="stock-price-label">R3</span>
                    <span class="stock-price-value">${formatCurrency(stock.r3)}</span>
                </div>
                <div class="stock-price-row">
                    <span class="stock-price-label">S3</span>
                    <span class="stock-price-value">${formatCurrency(stock.s3)}</span>
                </div>
            </div>
            <div class="stock-right">
                <span class="range-badge ${getRangeColor(stock.pctRangeR3)}">${stock.pctRangeR3.toFixed(2)}%</span>
            </div>
        </div>
    `).join('');

    // Add click handlers
    document.querySelectorAll('.stock-card').forEach(card => {
        card.addEventListener('click', () => {
            const ticker = card.dataset.ticker;
            const stock = state.stocks.find(s => s.ticker === ticker);
            if (stock) {
                openModal(stock);
            }
        });
    });
}

// ===== Modal Functions =====
function openModal(stock) {
    state.selectedStock = stock;

    document.getElementById('modalTicker').textContent = stock.ticker.replace('.NS', '');
    document.getElementById('modalSubtitle').textContent = `NSE • ${stock.yearMonth}`;
    document.getElementById('modalOpen').textContent = formatCurrency(stock.open);
    document.getElementById('modalHigh').textContent = formatCurrency(stock.high);
    document.getElementById('modalLow').textContent = formatCurrency(stock.low);
    document.getElementById('modalClose').textContent = formatCurrency(stock.close);
    document.getElementById('modalR3').textContent = formatCurrency(stock.r3);
    document.getElementById('modalS3').textContent = formatCurrency(stock.s3);
    document.getElementById('modalRange').textContent = stock.pctRangeR3.toFixed(2) + '%';
    document.getElementById('modalDescription').textContent = getRangeDescription(stock.pctRangeR3);

    elements.modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    elements.modal.classList.add('hidden');
    document.body.style.overflow = '';
    state.selectedStock = null;
}

// ===== Export Function =====
function exportToCSV() {
    if (state.stocks.length === 0) {
        alert('No data to export. Run a scan first.');
        return;
    }

    const headers = ['ticker', 'year_month', 'period_end', 'open', 'high', 'low', 'close', 'r3', 's3', 'pct_range_r3'];

    const rows = state.stocks.map(stock => [
        stock.ticker,
        stock.yearMonth,
        stock.periodEnd,
        stock.open,
        stock.high,
        stock.low,
        stock.close,
        stock.r3,
        stock.s3,
        stock.pctRangeR3
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `camarilla_screener_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ===== Load Cached Data =====
function loadCachedData() {
    try {
        const cachedStocks = localStorage.getItem('camarillaStocks');
        const cachedLastScan = localStorage.getItem('camarillaLastScan');

        if (cachedStocks) {
            state.stocks = JSON.parse(cachedStocks);
            elements.stockCount.textContent = state.stocks.length;

            if (state.stocks.length > 0) {
                showResults();
                renderStockList();
                elements.exportBtn.disabled = false;
            }
        }

        if (cachedLastScan) {
            const date = new Date(cachedLastScan);
            elements.lastScan.textContent = formatDate(date).split(',')[0];
        }
    } catch (error) {
        console.error('Error loading cached data:', error);
    }
}

// ===== Initialize =====
function init() {
    // Set reference month
    const { label } = getLastCompletedMonth();
    elements.refMonth.textContent = label;

    // Load cached data
    loadCachedData();

    // Event listeners
    elements.scanBtn.addEventListener('click', runScan);
    elements.exportBtn.addEventListener('click', exportToCSV);
    elements.modalClose.addEventListener('click', closeModal);

    // Close modal on backdrop click
    elements.modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !elements.modal.classList.contains('hidden')) {
            closeModal();
        }
    });
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
