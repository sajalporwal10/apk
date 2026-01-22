// Practice Service - Business logic for practice sessions
import { getDatabase } from '../db/database.js';
import { getQuestionsForPractice } from './questionService.js';
import type { PracticeSession, Attempt, Question, PracticeMode, Confidence } from '../../../shared/types.js';

const PRACTICE_MODES = {
    '10q_25m': { questions: 10, timeMinutes: 25 },
    '20q_45m': { questions: 20, timeMinutes: 45 },
    '20q_mixed': { questions: 20, timeMinutes: 45 },
};

// Convert database row to PracticeSession
function rowToSession(row: any): PracticeSession {
    return {
        id: row.id,
        mode: row.mode,
        sectionFilter: row.section_filter,
        topicFilter: row.topic_filter,
        totalQuestions: row.total_questions,
        correctCount: row.correct_count,
        timeLimitSeconds: row.time_limit_seconds,
        timeSpentSeconds: row.time_spent_seconds,
        completed: Boolean(row.completed),
        startedAt: row.started_at,
        completedAt: row.completed_at,
    };
}

// Convert database row to Attempt
function rowToAttempt(row: any): Attempt {
    return {
        id: row.id,
        sessionId: row.session_id,
        questionId: row.question_id,
        selectedAnswer: row.selected_answer,
        isCorrect: Boolean(row.is_correct),
        confidence: row.confidence,
        timeSpentSeconds: row.time_spent_seconds,
        attemptedAt: row.attempted_at,
    };
}

// Start a new practice session
export function startPracticeSession(
    mode: PracticeMode,
    sectionFilter?: string,
    topicFilter?: string
): { session: PracticeSession; questions: Question[] } {
    const db = getDatabase();

    const modeConfig = PRACTICE_MODES[mode];
    const timeLimitSeconds = modeConfig.timeMinutes * 60;

    // For mixed mode, don't filter by section
    const effectiveSectionFilter = mode === '20q_mixed' ? undefined : sectionFilter;

    // Get questions for this session
    const questions = getQuestionsForPractice(modeConfig.questions, effectiveSectionFilter, topicFilter);

    if (questions.length === 0) {
        throw new Error('No questions available for this filter combination');
    }

    // Create session
    const stmt = db.prepare(`
    INSERT INTO practice_sessions (mode, section_filter, topic_filter, total_questions, time_limit_seconds)
    VALUES (?, ?, ?, ?, ?)
  `);

    const result = stmt.run(mode, effectiveSectionFilter || null, topicFilter || null, questions.length, timeLimitSeconds);

    const session = getSessionById(result.lastInsertRowid as number)!;

    // Update streak
    updateStreak();

    return { session, questions };
}

// Get session by ID
export function getSessionById(id: number): PracticeSession | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM practice_sessions WHERE id = ?').get(id);
    return row ? rowToSession(row) : null;
}

// Get session with attempts
export function getSessionWithAttempts(id: number): { session: PracticeSession; attempts: Attempt[] } | null {
    const session = getSessionById(id);
    if (!session) return null;

    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM attempts WHERE session_id = ? ORDER BY attempted_at').all(id);
    const attempts = rows.map(rowToAttempt);

    return { session, attempts };
}

// Submit an attempt
export function submitAttempt(
    sessionId: number,
    questionId: number,
    selectedAnswer: string,
    confidence: Confidence,
    timeSpentSeconds: number
): { attempt: Attempt; isCorrect: boolean } {
    const db = getDatabase();

    // Get the question to check if answer is correct
    const question = db.prepare('SELECT correct_answer FROM questions WHERE id = ?').get(questionId) as any;
    if (!question) {
        throw new Error('Question not found');
    }

    const isCorrect = selectedAnswer === question.correct_answer;

    // Insert attempt
    const stmt = db.prepare(`
    INSERT INTO attempts (session_id, question_id, selected_answer, is_correct, confidence, time_spent_seconds)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

    const result = stmt.run(sessionId, questionId, selectedAnswer, isCorrect ? 1 : 0, confidence, timeSpentSeconds);

    // Update session correct count
    if (isCorrect) {
        db.prepare('UPDATE practice_sessions SET correct_count = correct_count + 1 WHERE id = ?').run(sessionId);

        // Award XP for correct answer on retry
        db.prepare('UPDATE user_stats SET total_xp = total_xp + 25 WHERE id = 1').run();

        // Update spaced repetition - increase interval
        updateSpacedRepetition(questionId, true, confidence);

        // Check first blood achievement
        const firstBlood = db.prepare("SELECT unlocked_at FROM achievements WHERE code = 'first_blood'").get() as any;
        if (!firstBlood.unlocked_at) {
            db.prepare("UPDATE achievements SET unlocked_at = datetime('now') WHERE code = 'first_blood'").run();
        }
    } else {
        // Reset spaced repetition on wrong answer
        updateSpacedRepetition(questionId, false, confidence);
    }

    // Update topic mastery
    const questionData = db.prepare('SELECT section, topic FROM questions WHERE id = ?').get(questionId) as any;
    db.prepare(`
    UPDATE topic_mastery 
    SET questions_seen = questions_seen + 1,
        questions_correct = questions_correct + ?,
        last_practiced = date('now')
    WHERE section = ? AND topic = ?
  `).run(isCorrect ? 1 : 0, questionData.section, questionData.topic);

    // Recalculate mastery level
    updateMasteryLevel(questionData.section, questionData.topic);

    const attempt = rowToAttempt(db.prepare('SELECT * FROM attempts WHERE id = ?').get(result.lastInsertRowid) as any);

    return { attempt, isCorrect };
}

// Complete a practice session
export function completeSession(sessionId: number, timeSpentSeconds: number): PracticeSession {
    const db = getDatabase();

    db.prepare(`
    UPDATE practice_sessions 
    SET completed = 1, time_spent_seconds = ?, completed_at = datetime('now')
    WHERE id = ?
  `).run(timeSpentSeconds, sessionId);

    // Award completion XP
    db.prepare('UPDATE user_stats SET total_xp = total_xp + 50 WHERE id = 1').run();

    // Check speed demon achievement
    const session = getSessionById(sessionId)!;
    if (timeSpentSeconds < session.timeLimitSeconds * 0.8) {
        const speedDemon = db.prepare("SELECT unlocked_at FROM achievements WHERE code = 'speed_demon'").get() as any;
        if (!speedDemon.unlocked_at) {
            db.prepare("UPDATE achievements SET unlocked_at = datetime('now') WHERE code = 'speed_demon'").run();
            db.prepare('UPDATE user_stats SET total_xp = total_xp + 75 WHERE id = 1').run();
        }
    }

    // Check perfectionist achievement (10 correct in a row)
    const attempts = db.prepare('SELECT is_correct FROM attempts WHERE session_id = ? ORDER BY id').all(sessionId) as any[];
    let streak = 0;
    let maxStreak = 0;
    for (const a of attempts) {
        if (a.is_correct) {
            streak++;
            maxStreak = Math.max(maxStreak, streak);
        } else {
            streak = 0;
        }
    }
    if (maxStreak >= 10) {
        const perfectionist = db.prepare("SELECT unlocked_at FROM achievements WHERE code = 'perfectionist'").get() as any;
        if (!perfectionist.unlocked_at) {
            db.prepare("UPDATE achievements SET unlocked_at = datetime('now') WHERE code = 'perfectionist'").run();
            db.prepare('UPDATE user_stats SET total_xp = total_xp + 150 WHERE id = 1').run();
        }
    }

    return getSessionById(sessionId)!;
}

// Update spaced repetition based on SM-2 algorithm
function updateSpacedRepetition(questionId: number, correct: boolean, confidence: Confidence): void {
    const db = getDatabase();

    const question = db.prepare('SELECT interval_days, ease_factor, repetition_count FROM questions WHERE id = ?').get(questionId) as any;

    // Map confidence to quality (0-5 scale)
    const quality = correct ? (confidence === 3 ? 5 : confidence === 2 ? 4 : 3) : (confidence === 1 ? 0 : 1);

    let newInterval: number;
    let newEase: number;
    let newRepCount: number;

    if (quality < 3) {
        // Failed - reset
        newInterval = 1;
        newEase = Math.max(1.3, question.ease_factor - 0.2);
        newRepCount = 0;
    } else {
        newEase = question.ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        newEase = Math.max(1.3, newEase);

        if (question.repetition_count === 0) {
            newInterval = 1;
        } else if (question.repetition_count === 1) {
            newInterval = 6;
        } else {
            newInterval = Math.round(question.interval_days * newEase);
        }
        newRepCount = question.repetition_count + 1;
    }

    db.prepare(`
    UPDATE questions 
    SET interval_days = ?, ease_factor = ?, repetition_count = ?, next_review_date = date('now', '+' || ? || ' days')
    WHERE id = ?
  `).run(newInterval, newEase, newRepCount, newInterval, questionId);
}

// Update streak
function updateStreak(): void {
    const db = getDatabase();

    const stats = db.prepare('SELECT last_practice_date, current_streak, longest_streak FROM user_stats WHERE id = 1').get() as any;
    const today = new Date().toISOString().split('T')[0];

    if (stats.last_practice_date === today) {
        // Already practiced today
        return;
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    let newStreak: number;
    if (stats.last_practice_date === yesterday) {
        // Continuing streak
        newStreak = stats.current_streak + 1;
    } else {
        // Streak broken, start fresh
        newStreak = 1;
    }

    const newLongest = Math.max(stats.longest_streak, newStreak);

    db.prepare(`
    UPDATE user_stats 
    SET current_streak = ?, longest_streak = ?, last_practice_date = ?
    WHERE id = 1
  `).run(newStreak, newLongest, today);

    // Check streak achievements
    if (newStreak === 7) {
        db.prepare("UPDATE achievements SET unlocked_at = datetime('now') WHERE code = 'streak_7' AND unlocked_at IS NULL").run();
        db.prepare('UPDATE user_stats SET total_xp = total_xp + 100 WHERE id = 1').run();
    }
    if (newStreak === 30) {
        db.prepare("UPDATE achievements SET unlocked_at = datetime('now') WHERE code = 'streak_30' AND unlocked_at IS NULL").run();
        db.prepare('UPDATE user_stats SET total_xp = total_xp + 500 WHERE id = 1').run();
    }
}

// Update mastery level based on accuracy
function updateMasteryLevel(section: string, topic: string): void {
    const db = getDatabase();

    const mastery = db.prepare('SELECT questions_seen, questions_correct FROM topic_mastery WHERE section = ? AND topic = ?').get(section, topic) as any;

    if (!mastery || mastery.questions_seen === 0) return;

    const accuracy = mastery.questions_correct / mastery.questions_seen;
    const seen = mastery.questions_seen;

    let level: string;
    if (seen < 5) {
        level = 'Novice';
    } else if (accuracy < 0.4 || seen < 10) {
        level = 'Apprentice';
    } else if (accuracy < 0.6 || seen < 20) {
        level = 'Competent';
    } else if (accuracy < 0.75 || seen < 30) {
        level = 'Proficient';
    } else if (accuracy < 0.9 || seen < 50) {
        level = 'Expert';
    } else {
        level = 'Master';
    }

    db.prepare('UPDATE topic_mastery SET mastery_level = ? WHERE section = ? AND topic = ?').run(level, section, topic);

    // Check topic slayer achievement
    if (level === 'Proficient' || level === 'Expert' || level === 'Master') {
        db.prepare("UPDATE achievements SET unlocked_at = datetime('now') WHERE code = 'topic_slayer' AND unlocked_at IS NULL").run();
    }
}

// Get all sessions (for history)
export function getAllSessions(limit = 20): PracticeSession[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM practice_sessions ORDER BY started_at DESC LIMIT ?').all(limit);
    return rows.map(rowToSession);
}
