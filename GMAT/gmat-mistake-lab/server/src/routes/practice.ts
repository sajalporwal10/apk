// Practice Routes - API endpoints for practice sessions
import { Router, Request, Response } from 'express';
import {
    startPracticeSession,
    getSessionById,
    getSessionWithAttempts,
    submitAttempt,
    completeSession,
    getAllSessions,
} from '../services/practiceService.js';
import type { PracticeMode, Confidence } from '../../../shared/types.js';

const router = Router();

// POST /api/practice/start - Start a new practice session
router.post('/start', (req: Request, res: Response) => {
    try {
        const { mode, sectionFilter, topicFilter } = req.body as {
            mode: PracticeMode;
            sectionFilter?: string;
            topicFilter?: string;
        };

        if (!mode || !['10q_25m', '20q_45m', '20q_mixed'].includes(mode)) {
            return res.status(400).json({ success: false, error: 'Invalid practice mode' });
        }

        const result = startPracticeSession(mode, sectionFilter, topicFilter);
        res.status(201).json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/practice/history - Get practice session history
router.get('/history', (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 20;
        const sessions = getAllSessions(limit);
        res.json({ success: true, data: sessions });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/practice/:sessionId - Get session details with attempts
router.get('/:sessionId', (req: Request, res: Response) => {
    try {
        const sessionId = parseInt(req.params.sessionId);
        const result = getSessionWithAttempts(sessionId);

        if (!result) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }

        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/practice/:sessionId/attempt - Submit an answer attempt
router.post('/:sessionId/attempt', (req: Request, res: Response) => {
    try {
        const sessionId = parseInt(req.params.sessionId);
        const { questionId, selectedAnswer, confidence, timeSpentSeconds } = req.body as {
            questionId: number;
            selectedAnswer: string;
            confidence: Confidence;
            timeSpentSeconds: number;
        };

        if (!questionId || !selectedAnswer) {
            return res.status(400).json({ success: false, error: 'Question ID and selected answer are required' });
        }

        const result = submitAttempt(sessionId, questionId, selectedAnswer, confidence || 2, timeSpentSeconds || 0);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/practice/:sessionId/complete - Complete a practice session
router.post('/:sessionId/complete', (req: Request, res: Response) => {
    try {
        const sessionId = parseInt(req.params.sessionId);
        const { timeSpentSeconds } = req.body as { timeSpentSeconds: number };

        const session = completeSession(sessionId, timeSpentSeconds || 0);
        res.json({ success: true, data: session });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
