// Question Service - Business logic for managing questions
import { getDatabase } from '../db/database.js';
import type { Question, QuestionCreate } from '../../../shared/types.js';

// Convert database row to Question object
function rowToQuestion(row: any): Question {
    return {
        id: row.id,
        questionText: row.question_text,
        optionA: row.option_a,
        optionB: row.option_b,
        optionC: row.option_c,
        optionD: row.option_d,
        optionE: row.option_e,
        correctAnswer: row.correct_answer,
        myWrongAnswer: row.my_wrong_answer,
        section: row.section,
        topic: row.topic,
        subtopic: row.subtopic,
        errorType: row.error_type,
        difficulty: row.difficulty,
        source: row.source,
        sourceId: row.source_id,
        gmatClubLink: row.gmat_club_link,
        personalNote: row.personal_note,
        imagePath: row.image_path,
        nextReviewDate: row.next_review_date,
        intervalDays: row.interval_days,
        easeFactor: row.ease_factor,
        repetitionCount: row.repetition_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// Get all questions with optional filters
export function getAllQuestions(filters?: {
    section?: string;
    topic?: string;
    errorType?: string;
    search?: string;
}): Question[] {
    const db = getDatabase();

    let query = 'SELECT * FROM questions WHERE 1=1';
    const params: any[] = [];

    if (filters?.section) {
        query += ' AND section = ?';
        params.push(filters.section);
    }

    if (filters?.topic) {
        query += ' AND topic = ?';
        params.push(filters.topic);
    }

    if (filters?.errorType) {
        query += ' AND error_type = ?';
        params.push(filters.errorType);
    }

    if (filters?.search) {
        query += ' AND question_text LIKE ?';
        params.push(`%${filters.search}%`);
    }

    query += ' ORDER BY created_at DESC';

    const rows = db.prepare(query).all(...params);
    return rows.map(rowToQuestion);
}

// Get single question by ID
export function getQuestionById(id: number): Question | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
    return row ? rowToQuestion(row) : null;
}

// Create a new question
export function createQuestion(data: QuestionCreate): Question {
    const db = getDatabase();

    const stmt = db.prepare(`
    INSERT INTO questions (
      question_text, option_a, option_b, option_c, option_d, option_e,
      correct_answer, my_wrong_answer, section, topic, subtopic,
      error_type, difficulty, source, source_id, gmat_club_link, personal_note, image_path
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    const result = stmt.run(
        data.questionText,
        data.optionA,
        data.optionB,
        data.optionC,
        data.optionD,
        data.optionE || null,
        data.correctAnswer,
        data.myWrongAnswer,
        data.section,
        data.topic,
        data.subtopic || null,
        data.errorType || null,
        data.difficulty || 'Medium',
        data.source || null,
        data.sourceId || null,
        data.gmatClubLink || null,
        data.personalNote || null,
        data.imagePath || null
    );

    // Update user XP for adding a question
    db.prepare('UPDATE user_stats SET total_xp = total_xp + 10 WHERE id = 1').run();

    // Check for first question achievement
    const questionCount = db.prepare('SELECT COUNT(*) as count FROM questions').get() as any;
    if (questionCount.count === 1) {
        db.prepare("UPDATE achievements SET unlocked_at = datetime('now') WHERE code = 'first_question' AND unlocked_at IS NULL").run();
    }

    // Check for century achievement
    if (questionCount.count === 100) {
        db.prepare("UPDATE achievements SET unlocked_at = datetime('now') WHERE code = 'century' AND unlocked_at IS NULL").run();
        db.prepare('UPDATE user_stats SET total_xp = total_xp + 300 WHERE id = 1').run();
    }

    return getQuestionById(result.lastInsertRowid as number)!;
}

// Update a question
export function updateQuestion(id: number, data: Partial<QuestionCreate>): Question | null {
    const db = getDatabase();

    const fields: string[] = [];
    const params: any[] = [];

    if (data.questionText !== undefined) { fields.push('question_text = ?'); params.push(data.questionText); }
    if (data.optionA !== undefined) { fields.push('option_a = ?'); params.push(data.optionA); }
    if (data.optionB !== undefined) { fields.push('option_b = ?'); params.push(data.optionB); }
    if (data.optionC !== undefined) { fields.push('option_c = ?'); params.push(data.optionC); }
    if (data.optionD !== undefined) { fields.push('option_d = ?'); params.push(data.optionD); }
    if (data.optionE !== undefined) { fields.push('option_e = ?'); params.push(data.optionE); }
    if (data.correctAnswer !== undefined) { fields.push('correct_answer = ?'); params.push(data.correctAnswer); }
    if (data.myWrongAnswer !== undefined) { fields.push('my_wrong_answer = ?'); params.push(data.myWrongAnswer); }
    if (data.section !== undefined) { fields.push('section = ?'); params.push(data.section); }
    if (data.topic !== undefined) { fields.push('topic = ?'); params.push(data.topic); }
    if (data.subtopic !== undefined) { fields.push('subtopic = ?'); params.push(data.subtopic); }
    if (data.errorType !== undefined) { fields.push('error_type = ?'); params.push(data.errorType); }
    if (data.difficulty !== undefined) { fields.push('difficulty = ?'); params.push(data.difficulty); }
    if (data.source !== undefined) { fields.push('source = ?'); params.push(data.source); }
    if (data.sourceId !== undefined) { fields.push('source_id = ?'); params.push(data.sourceId); }
    if (data.gmatClubLink !== undefined) { fields.push('gmat_club_link = ?'); params.push(data.gmatClubLink); }
    if (data.personalNote !== undefined) { fields.push('personal_note = ?'); params.push(data.personalNote); }
    if (data.imagePath !== undefined) { fields.push('image_path = ?'); params.push(data.imagePath); }

    if (fields.length === 0) return getQuestionById(id);

    fields.push("updated_at = datetime('now')");
    params.push(id);

    db.prepare(`UPDATE questions SET ${fields.join(', ')} WHERE id = ?`).run(...params);

    return getQuestionById(id);
}

// Delete a question
export function deleteQuestion(id: number): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM questions WHERE id = ?').run(id);
    return result.changes > 0;
}

// Get questions for practice session
export function getQuestionsForPractice(
    count: number,
    sectionFilter?: string,
    topicFilter?: string
): Question[] {
    const db = getDatabase();

    let query = 'SELECT * FROM questions WHERE 1=1';
    const params: any[] = [];

    if (sectionFilter) {
        query += ' AND section = ?';
        params.push(sectionFilter);
    }

    if (topicFilter) {
        query += ' AND topic = ?';
        params.push(topicFilter);
    }

    // Prioritize questions due for review, then random
    query += ' ORDER BY CASE WHEN next_review_date <= date("now") THEN 0 ELSE 1 END, RANDOM() LIMIT ?';
    params.push(count);

    const rows = db.prepare(query).all(...params);
    return rows.map(rowToQuestion);
}

// Bulk import questions from CSV data
export function bulkImportQuestions(questions: QuestionCreate[]): { imported: number; errors: string[] } {
    const db = getDatabase();
    const errors: string[] = [];
    let imported = 0;

    const stmt = db.prepare(`
    INSERT INTO questions (
      question_text, option_a, option_b, option_c, option_d, option_e,
      correct_answer, my_wrong_answer, section, topic, subtopic,
      error_type, difficulty, source, source_id, gmat_club_link, personal_note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    const transaction = db.transaction((data: QuestionCreate[]) => {
        for (let i = 0; i < data.length; i++) {
            const q = data[i];
            try {
                stmt.run(
                    q.questionText,
                    q.optionA,
                    q.optionB,
                    q.optionC,
                    q.optionD,
                    q.optionE || null,
                    q.correctAnswer,
                    q.myWrongAnswer,
                    q.section,
                    q.topic,
                    q.subtopic || null,
                    q.errorType || null,
                    q.difficulty || 'Medium',
                    q.source || null,
                    q.sourceId || null,
                    q.gmatClubLink || null,
                    q.personalNote || null
                );
                imported++;
            } catch (err: any) {
                errors.push(`Row ${i + 1}: ${err.message}`);
            }
        }
    });

    transaction(questions);

    // Update XP for bulk import
    if (imported > 0) {
        db.prepare('UPDATE user_stats SET total_xp = total_xp + ? WHERE id = 1').run(imported * 10);
    }

    return { imported, errors };
}

// Get question statistics
export function getQuestionStats(): {
    total: number;
    bySection: Record<string, number>;
    byTopic: Record<string, number>;
    byErrorType: Record<string, number>;
} {
    const db = getDatabase();

    const total = (db.prepare('SELECT COUNT(*) as count FROM questions').get() as any).count;

    const sectionRows = db.prepare('SELECT section, COUNT(*) as count FROM questions GROUP BY section').all() as any[];
    const bySection: Record<string, number> = {};
    sectionRows.forEach(row => { bySection[row.section] = row.count; });

    const topicRows = db.prepare('SELECT topic, COUNT(*) as count FROM questions GROUP BY topic').all() as any[];
    const byTopic: Record<string, number> = {};
    topicRows.forEach(row => { byTopic[row.topic] = row.count; });

    const errorRows = db.prepare('SELECT error_type, COUNT(*) as count FROM questions WHERE error_type IS NOT NULL GROUP BY error_type').all() as any[];
    const byErrorType: Record<string, number> = {};
    errorRows.forEach(row => { byErrorType[row.error_type] = row.count; });

    return { total, bySection, byTopic, byErrorType };
}
