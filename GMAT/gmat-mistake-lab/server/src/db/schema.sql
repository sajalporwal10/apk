-- GMAT Mistake Lab Database Schema
-- SQLite database for storing questions, practice sessions, and gamification data

-- Core Questions Table
CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    option_e TEXT,
    correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D', 'E')),
    my_wrong_answer CHAR(1) NOT NULL CHECK (my_wrong_answer IN ('A', 'B', 'C', 'D', 'E')),
    
    -- Classification
    section TEXT NOT NULL CHECK (section IN ('Quant', 'Verbal', 'DataInsights')),
    topic TEXT NOT NULL,
    subtopic TEXT,
    error_type TEXT CHECK (error_type IN ('Careless', 'Conceptual', 'TimePressure', 'TrapAnswer', 'Misread')),
    difficulty TEXT DEFAULT 'Medium' CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    
    -- Metadata
    source TEXT CHECK (source IN ('GMATClub', 'OfficialGuide', 'Mock', 'TargetTestPrep', 'Manhattan', 'Other')),
    source_id TEXT,
    gmat_club_link TEXT,
    personal_note TEXT,
    image_path TEXT,
    
    -- Spaced Repetition (SM-2 algorithm)
    next_review_date DATE,
    interval_days INTEGER DEFAULT 1,
    ease_factor REAL DEFAULT 2.5,
    repetition_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Practice Sessions Table
CREATE TABLE IF NOT EXISTS practice_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mode TEXT NOT NULL CHECK (mode IN ('10q_25m', '20q_45m', '20q_mixed')),
    section_filter TEXT CHECK (section_filter IN ('Quant', 'Verbal', 'DataInsights')),
    topic_filter TEXT,
    total_questions INTEGER NOT NULL,
    correct_count INTEGER DEFAULT 0,
    time_limit_seconds INTEGER NOT NULL,
    time_spent_seconds INTEGER,
    completed BOOLEAN DEFAULT FALSE,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- Question Attempts (answers within a practice session)
CREATE TABLE IF NOT EXISTS attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    selected_answer CHAR(1) CHECK (selected_answer IN ('A', 'B', 'C', 'D', 'E')),
    is_correct BOOLEAN,
    confidence INTEGER CHECK (confidence IN (1, 2, 3)),
    time_spent_seconds INTEGER,
    attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES practice_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- User Statistics (single user, so id is always 1)
CREATE TABLE IF NOT EXISTS user_stats (
    id INTEGER PRIMARY KEY DEFAULT 1,
    total_xp INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_practice_date DATE,
    level INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Achievements Table
CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    xp_reward INTEGER DEFAULT 0,
    unlocked_at DATETIME
);

-- Topic Mastery Tracking
CREATE TABLE IF NOT EXISTS topic_mastery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section TEXT NOT NULL CHECK (section IN ('Quant', 'Verbal', 'DataInsights')),
    topic TEXT NOT NULL,
    questions_seen INTEGER DEFAULT 0,
    questions_correct INTEGER DEFAULT 0,
    mastery_level TEXT DEFAULT 'Novice' CHECK (mastery_level IN ('Novice', 'Apprentice', 'Competent', 'Proficient', 'Expert', 'Master')),
    last_practiced DATE,
    UNIQUE(section, topic)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_questions_section ON questions(section);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(section, topic);
CREATE INDEX IF NOT EXISTS idx_questions_review ON questions(next_review_date);
CREATE INDEX IF NOT EXISTS idx_questions_created ON questions(created_at);
CREATE INDEX IF NOT EXISTS idx_attempts_session ON attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_attempts_question ON attempts(question_id);
CREATE INDEX IF NOT EXISTS idx_sessions_completed ON practice_sessions(completed);

-- Insert default user stats if not exists
INSERT OR IGNORE INTO user_stats (id, total_xp, current_streak, longest_streak, level) 
VALUES (1, 0, 0, 0, 1);

-- Insert default achievements
INSERT OR IGNORE INTO achievements (code, name, description, icon, xp_reward) VALUES
('first_question', 'First Step', 'Added your first wrong question', '📝', 10),
('first_blood', 'First Blood', 'Got a previously wrong question right', '🎯', 25),
('streak_7', 'Week Warrior', '7-day practice streak', '🔥', 100),
('streak_30', 'Monthly Master', '30-day practice streak', '💎', 500),
('perfectionist', 'Perfectionist', '10 correct answers in a row', '⭐', 150),
('topic_slayer', 'Topic Slayer', 'Reached Proficient in any topic', '🗡️', 200),
('century', 'Century Club', 'Added 100 questions', '💯', 300),
('speed_demon', 'Speed Demon', 'Completed a session 20% faster than time limit', '⚡', 75),
('night_owl', 'Night Owl', 'Practiced after midnight', '🦉', 50),
('early_bird', 'Early Bird', 'Practiced before 6 AM', '🐦', 50);

-- Insert default topic mastery for all topics
INSERT OR IGNORE INTO topic_mastery (section, topic) VALUES
-- Quant
('Quant', 'Arithmetic'),
('Quant', 'Algebra'),
('Quant', 'Word Problems'),
('Quant', 'Geometry'),
('Quant', 'Statistics'),
-- Verbal
('Verbal', 'Reading Comprehension'),
('Verbal', 'Critical Reasoning'),
-- Data Insights
('DataInsights', 'Data Sufficiency'),
('DataInsights', 'Multi-Source Reasoning'),
('DataInsights', 'Graphics Interpretation'),
('DataInsights', 'Two-Part Analysis'),
('DataInsights', 'Table Analysis');
