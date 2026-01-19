/**
 * Local Development Server with CORS Proxy
 * Serves the web app and proxies API requests to bypass CORS
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8080;
const STATIC_DIR = __dirname;

// MIME types
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon'
};

// Proxy request to external URL
function proxyRequest(targetUrl, res) {
    console.log(`[PROXY] Fetching: ${targetUrl}`);

    const protocol = targetUrl.startsWith('https') ? https : http;

    const options = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9'
        }
    };

    protocol.get(targetUrl, options, (proxyRes) => {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        // Forward content type
        if (proxyRes.headers['content-type']) {
            res.setHeader('Content-Type', proxyRes.headers['content-type']);
        }

        res.writeHead(proxyRes.statusCode);
        proxyRes.pipe(res);
    }).on('error', (err) => {
        console.error(`[PROXY ERROR] ${err.message}`);
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
    });
}

// Serve static files
function serveStatic(filePath, res) {
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('Not Found');
            } else {
                res.writeHead(500);
                res.end('Server Error');
            }
            return;
        }

        res.setHeader('Content-Type', contentType);
        res.writeHead(200);
        res.end(data);
    });
}

// Create server
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Handle OPTIONS for CORS preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.writeHead(200);
        res.end();
        return;
    }

    // Proxy endpoint
    if (pathname === '/proxy') {
        const targetUrl = parsedUrl.query.url;
        if (!targetUrl) {
            res.writeHead(400);
            res.end('Missing url parameter');
            return;
        }
        proxyRequest(targetUrl, res);
        return;
    }

    // API endpoint for fetching NIFTY 500 list
    if (pathname === '/api/nifty500') {
        const niftyUrl = 'https://www.niftyindices.com/IndexConstituent/ind_nifty500list.csv';
        proxyRequest(niftyUrl, res);
        return;
    }

    // API endpoint for Yahoo Finance
    if (pathname.startsWith('/api/yahoo/')) {
        const ticker = pathname.replace('/api/yahoo/', '');
        const period1 = parsedUrl.query.period1;
        const period2 = parsedUrl.query.period2;
        const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1mo&period1=${period1}&period2=${period2}`;
        proxyRequest(yahooUrl, res);
        return;
    }

    // Static files
    let filePath = path.join(STATIC_DIR, pathname === '/' ? 'index.html' : pathname);

    // Security: prevent directory traversal
    if (!filePath.startsWith(STATIC_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    serveStatic(filePath, res);
});

server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 Camarilla Screener - Development Server               ║
║                                                            ║
║   Local:    http://localhost:${PORT}                         ║
║   Network:  http://0.0.0.0:${PORT}                           ║
║                                                            ║
║   API Endpoints:                                           ║
║   • /api/nifty500     - Fetch NIFTY 500 symbols           ║
║   • /api/yahoo/:ticker - Fetch Yahoo Finance data         ║
║   • /proxy?url=       - Generic CORS proxy                 ║
║                                                            ║
║   Press Ctrl+C to stop                                     ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
});
