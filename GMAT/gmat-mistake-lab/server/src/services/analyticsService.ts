// Analytics Service - Business logic for statistics and insights
import { getDatabase } from '../db/database.js';
import type { OverviewStats, TopicStats, WeeklyTrend, TopicMastery, UserStats, Achievement } from '../../../shared/types.js';

// Get overall statistics
export function getOverviewStats(): OverviewStats {
    const db = getDatabase();

    // Total questions
    const totalQuestions = (db.prepare('SELECT COUNT(*) as count FROM questions').get() as any).count;

    // Total practice sessions
    const totalPracticeSessions = (db.prepare('SELECT COUNT(*) as count FROM practice_sessions WHERE completed = 1').get() as any).count;

    // Total attempts
    const totalAttempts = (db.prepare('SELECT COUNT(*) as count FROM attempts').get() as any).count;

    // Overall accuracy
    const accuracyData = db.prepare('SELECT SUM(is_correct) as correct, COUNT(*) as total FROM attempts').get() as any;
    const overallAccuracy = accuracyData.total > 0 ? (accuracyData.correct / accuracyData.total) * 100 : 0;

    // Average time per question
    const avgTimeData = db.prepare('SELECT AVG(time_spent_seconds) as avg FROM attempts WHERE time_spent_seconds > 0').get() as any;
    const averageTimePerQuestion = avgTimeData.avg || 0;

    // User stats
    const userStats = db.prepare('SELECT * FROM user_stats WHERE id = 1').get() as any;

    return {
        totalQuestions,
        totalPracticeSessions,
        totalAttempts,
        overallAccuracy: Math.round(overallAccuracy * 10) / 10,
        averageTimePerQuestion: Math.round(averageTimePerQuestion),
        currentStreak: userStats?.current_streak || 0,
        totalXp: userStats?.total_xp || 0,
        level: userStats?.level || 1,
    };
}

// Get topic-wise statistics
export function getTopicStats(): TopicStats[] {
    const db = getDatabase();

    const rows = db.prepare(`
    SELECT 
      tm.section,
      tm.topic,
      tm.questions_seen as practiced,
      tm.questions_correct as correct,
      tm.mastery_level,
      (SELECT COUNT(*) FROM questions q WHERE q.section = tm.section AND q.topic = tm.topic) as total_questions
    FROM topic_mastery tm
    ORDER BY tm.section, tm.topic
  `).all() as any[];

    return rows.map(row => ({
        section: row.section,
        topic: row.topic,
        totalQuestions: row.total_questions,
        practiced: row.practiced,
        correct: row.correct,
        accuracy: row.practiced > 0 ? Math.round((row.correct / row.practiced) * 100) : 0,
        masteryLevel: row.mastery_level,
    }));
}

// Get weakest topics (lowest accuracy with at least some practice)
export function getWeakestTopics(limit = 5): TopicStats[] {
    const allStats = getTopicStats();

    return allStats
        .filter(t => t.practiced >= 3) // At least 3 attempts
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, limit);
}

// Get weekly trends
export function getWeeklyTrends(weeks = 8): WeeklyTrend[] {
    const db = getDatabase();

    const trends: WeeklyTrend[] = [];

    for (let i = 0; i < weeks; i++) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() - i * 7);

        const weekLabel = weekStart.toISOString().split('T')[0];
        const weekStartStr = weekStart.toISOString().split('T')[0];
        const weekEndStr = weekEnd.toISOString().split('T')[0];

        // Questions added this week
        const added = db.prepare(`
      SELECT COUNT(*) as count FROM questions 
      WHERE date(created_at) >= ? AND date(created_at) < ?
    `).get(weekStartStr, weekEndStr) as any;

        // Questions practiced this week
        const practiced = db.prepare(`
      SELECT COUNT(*) as count FROM attempts 
      WHERE date(attempted_at) >= ? AND date(attempted_at) < ?
    `).get(weekStartStr, weekEndStr) as any;

        // Accuracy this week
        const accuracy = db.prepare(`
      SELECT SUM(is_correct) as correct, COUNT(*) as total FROM attempts 
      WHERE date(attempted_at) >= ? AND date(attempted_at) < ?
    `).get(weekStartStr, weekEndStr) as any;

        trends.push({
            week: weekLabel,
            questionsAdded: added.count,
            questionsPracticed: practiced.count,
            accuracy: accuracy.total > 0 ? Math.round((accuracy.correct / accuracy.total) * 100) : 0,
        });
    }

    return trends.reverse();
}

// Get user stats
export function getUserStats(): UserStats {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM user_stats WHERE id = 1').get() as any;

    return {
        totalXp: row?.total_xp || 0,
        currentStreak: row?.current_streak || 0,
        longestStreak: row?.longest_streak || 0,
        lastPracticeDate: row?.last_practice_date,
        level: row?.level || 1,
    };
}

// Get all achievements
export function getAchievements(): Achievement[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM achievements ORDER BY id').all() as any[];

    return rows.map(row => ({
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        icon: row.icon,
        xpReward: row.xp_reward,
        unlockedAt: row.unlocked_at,
    }));
}

// Get topic mastery
export function getTopicMastery(): TopicMastery[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM topic_mastery ORDER BY section, topic').all() as any[];

    return rows.map(row => ({
        id: row.id,
        section: row.section,
        topic: row.topic,
        questionsSeen: row.questions_seen,
        questionsCorrect: row.questions_correct,
        masteryLevel: row.mastery_level,
        lastPracticed: row.last_practiced,
    }));
}

// Get repeat mistakes (questions answered wrong multiple times)
export function getRepeatMistakes(limit = 10): { questionId: number; wrongCount: number; question: string }[] {
    const db = getDatabase();

    const rows = db.prepare(`
    SELECT 
      a.question_id,
      COUNT(*) as wrong_count,
      q.question_text as question
    FROM attempts a
    JOIN questions q ON a.question_id = q.id
    WHERE a.is_correct = 0
    GROUP BY a.question_id
    HAVING COUNT(*) >= 2
    ORDER BY wrong_count DESC
    LIMIT ?
  `).all(limit) as any[];

    return rows.map(row => ({
        questionId: row.question_id,
        wrongCount: row.wrong_count,
        question: row.question.substring(0, 100) + (row.question.length > 100 ? '...' : ''),
    }));
}
