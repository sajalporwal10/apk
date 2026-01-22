// Analytics Routes - API endpoints for statistics and insights
import { Router, Request, Response } from 'express';
import {
    getOverviewStats,
    getTopicStats,
    getWeakestTopics,
    getWeeklyTrends,
    getUserStats,
    getAchievements,
    getTopicMastery,
    getRepeatMistakes,
} from '../services/analyticsService.js';

const router = Router();

// GET /api/analytics/overview - Get dashboard overview stats
router.get('/overview', (req: Request, res: Response) => {
    try {
        const stats = getOverviewStats();
        res.json({ success: true, data: stats });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/analytics/topics - Get topic-wise statistics
router.get('/topics', (req: Request, res: Response) => {
    try {
        const stats = getTopicStats();
        res.json({ success: true, data: stats });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/analytics/weakest - Get weakest topics
router.get('/weakest', (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 5;
        const topics = getWeakestTopics(limit);
        res.json({ success: true, data: topics });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/analytics/trends - Get weekly trends
router.get('/trends', (req: Request, res: Response) => {
    try {
        const weeks = parseInt(req.query.weeks as string) || 8;
        const trends = getWeeklyTrends(weeks);
        res.json({ success: true, data: trends });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/analytics/mastery - Get topic mastery levels
router.get('/mastery', (req: Request, res: Response) => {
    try {
        const mastery = getTopicMastery();
        res.json({ success: true, data: mastery });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/analytics/repeat-mistakes - Get questions answered wrong multiple times
router.get('/repeat-mistakes', (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;
        const mistakes = getRepeatMistakes(limit);
        res.json({ success: true, data: mistakes });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/gamification/stats - Get user XP, streak, level
router.get('/gamification', (req: Request, res: Response) => {
    try {
        const stats = getUserStats();
        res.json({ success: true, data: stats });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/analytics/achievements - Get all achievements
router.get('/achievements', (req: Request, res: Response) => {
    try {
        const achievements = getAchievements();
        res.json({ success: true, data: achievements });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
