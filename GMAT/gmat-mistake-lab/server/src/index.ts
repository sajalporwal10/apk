// GMAT Mistake Lab - Express Server Entry Point
import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { initializeDatabase } from './db/database.js';
import questionsRouter from './routes/questions.js';
import practiceRouter from './routes/practice.js';
import analyticsRouter from './routes/analytics.js';
import searchRouter from './routes/search.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize database
initializeDatabase();

// API Routes
app.use('/api/questions', questionsRouter);
app.use('/api/practice', practiceRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/search', searchRouter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    const clientPath = join(__dirname, '../../client/dist');
    app.use(express.static(clientPath));

    app.get('*', (req, res) => {
        res.sendFile(join(clientPath, 'index.html'));
    });
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Server error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║       GMAT MISTAKE LAB - API Server        ║
╠════════════════════════════════════════════╣
║  🚀 Server running on port ${PORT}            ║
║  📊 API available at http://localhost:${PORT} ║
║  💾 Database initialized                   ║
╚════════════════════════════════════════════╝
  `);
});

export default app;
