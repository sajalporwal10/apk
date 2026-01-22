// Question Routes - API endpoints for managing questions
import { Router, Request, Response } from 'express';
import {
    getAllQuestions,
    getQuestionById,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    bulkImportQuestions,
    getQuestionStats
} from '../services/questionService.js';
import type { QuestionCreate } from '../../../shared/types.js';

const router = Router();

// GET /api/questions - List all questions with optional filters
router.get('/', (req: Request, res: Response) => {
    try {
        const { section, topic, errorType, search } = req.query;

        const questions = getAllQuestions({
            section: section as string,
            topic: topic as string,
            errorType: errorType as string,
            search: search as string,
        });

        res.json({ success: true, data: questions });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/questions/stats - Get question statistics
router.get('/stats', (req: Request, res: Response) => {
    try {
        const stats = getQuestionStats();
        res.json({ success: true, data: stats });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/questions/:id - Get single question
router.get('/:id', (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const question = getQuestionById(id);

        if (!question) {
            return res.status(404).json({ success: false, error: 'Question not found' });
        }

        res.json({ success: true, data: question });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/questions - Create new question
router.post('/', (req: Request, res: Response) => {
    try {
        const data: QuestionCreate = req.body;

        // Validate required fields
        if (!data.questionText || !data.optionA || !data.optionB || !data.optionC || !data.optionD) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        if (!data.correctAnswer || !data.myWrongAnswer) {
            return res.status(400).json({ success: false, error: 'Correct answer and your wrong answer are required' });
        }

        if (!data.section || !data.topic) {
            return res.status(400).json({ success: false, error: 'Section and topic are required' });
        }

        const question = createQuestion(data);
        res.status(201).json({ success: true, data: question });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/questions/:id - Update question
router.put('/:id', (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const data: Partial<QuestionCreate> = req.body;

        const question = updateQuestion(id, data);

        if (!question) {
            return res.status(404).json({ success: false, error: 'Question not found' });
        }

        res.json({ success: true, data: question });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/questions/:id - Delete question
router.delete('/:id', (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const deleted = deleteQuestion(id);

        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Question not found' });
        }

        res.json({ success: true, data: { deleted: true } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/questions/import - Bulk import questions from CSV data
router.post('/import', (req: Request, res: Response) => {
    try {
        const { questions } = req.body as { questions: QuestionCreate[] };

        if (!Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ success: false, error: 'Questions array is required' });
        }

        const result = bulkImportQuestions(questions);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
