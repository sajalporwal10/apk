// Search Routes - API endpoints for GMAT Club search
import { Router, Request, Response } from 'express';
import { searchGmatClub, buildGmatClubSearchUrl } from '../services/gmatClubService.js';

const router = Router();

// POST /api/search/gmatclub - Search GMAT Club for a question
router.post('/gmatclub', async (req: Request, res: Response) => {
    try {
        const { questionText } = req.body as { questionText: string };

        if (!questionText || questionText.length < 10) {
            return res.status(400).json({
                success: false,
                error: 'Question text must be at least 10 characters'
            });
        }

        const results = await searchGmatClub(questionText);
        const fallbackUrl = buildGmatClubSearchUrl(questionText);

        res.json({
            success: true,
            data: {
                results,
                fallbackUrl, // Direct GMAT Club search link if no results
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
