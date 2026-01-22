// Shared TypeScript types for GMAT Mistake Lab

// GMAT Focus Edition Sections
export type Section = 'Quant' | 'Verbal' | 'DataInsights';

// Topics by Section
export type QuantTopic = 'Arithmetic' | 'Algebra' | 'Word Problems' | 'Geometry' | 'Statistics';
export type VerbalTopic = 'Reading Comprehension' | 'Critical Reasoning';
export type DataInsightsTopic = 'Data Sufficiency' | 'Multi-Source Reasoning' | 'Graphics Interpretation' | 'Two-Part Analysis' | 'Table Analysis';
export type Topic = QuantTopic | VerbalTopic | DataInsightsTopic;

// Subtopics
export const TOPIC_SUBTOPICS: Record<Topic, string[]> = {
    // Quant
    'Arithmetic': ['Number Properties', 'Fractions/Decimals', 'Percentages', 'Ratios', 'Exponents/Roots'],
    'Algebra': ['Linear Equations', 'Quadratic Equations', 'Inequalities', 'Functions', 'Sequences'],
    'Word Problems': ['Rate/Work', 'Mixtures', 'Profit/Loss', 'Age Problems', 'Distance/Speed'],
    'Geometry': ['Lines/Angles', 'Triangles', 'Circles', 'Quadrilaterals', 'Coordinate Geometry', '3D Shapes'],
    'Statistics': ['Mean/Median/Mode', 'Standard Deviation', 'Probability', 'Combinatorics'],
    // Verbal
    'Reading Comprehension': ['Main Idea', 'Inference', 'Detail', 'Structure', 'Tone/Attitude', 'Strengthen/Weaken'],
    'Critical Reasoning': ['Strengthen', 'Weaken', 'Assumption', 'Evaluate', 'Inference', 'Boldface', 'Paradox'],
    // Data Insights
    'Data Sufficiency': ['Value Questions', 'Yes/No Questions', 'Geometry DS', 'Word Problem DS'],
    'Multi-Source Reasoning': ['Email/Memo Analysis', 'Report Analysis', 'Mixed Sources'],
    'Graphics Interpretation': ['Bar Charts', 'Line Graphs', 'Scatter Plots', 'Pie Charts', 'Tables'],
    'Two-Part Analysis': ['Algebraic', 'Verbal', 'Combined'],
    'Table Analysis': ['Sorting', 'True/False Statements', 'Multi-step Analysis'],
};

// Section to Topics mapping
export const SECTION_TOPICS: Record<Section, Topic[]> = {
    'Quant': ['Arithmetic', 'Algebra', 'Word Problems', 'Geometry', 'Statistics'],
    'Verbal': ['Reading Comprehension', 'Critical Reasoning'],
    'DataInsights': ['Data Sufficiency', 'Multi-Source Reasoning', 'Graphics Interpretation', 'Two-Part Analysis', 'Table Analysis'],
};

// Error types
export type ErrorType = 'Careless' | 'Conceptual' | 'TimePressure' | 'TrapAnswer' | 'Misread';
export const ERROR_TYPES: ErrorType[] = ['Careless', 'Conceptual', 'TimePressure', 'TrapAnswer', 'Misread'];

// Difficulty levels
export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];

// Answer options
export type AnswerOption = 'A' | 'B' | 'C' | 'D' | 'E';

// Question source
export type Source = 'GMATClub' | 'OfficialGuide' | 'Mock' | 'TargetTestPrep' | 'Manhattan' | 'Other';
export const SOURCES: Source[] = ['GMATClub', 'OfficialGuide', 'Mock', 'TargetTestPrep', 'Manhattan', 'Other'];

// Confidence levels
export type Confidence = 1 | 2 | 3; // 1=Guess, 2=Unsure, 3=Confident

// Mastery levels
export type MasteryLevel = 'Novice' | 'Apprentice' | 'Competent' | 'Proficient' | 'Expert' | 'Master';
export const MASTERY_LEVELS: MasteryLevel[] = ['Novice', 'Apprentice', 'Competent', 'Proficient', 'Expert', 'Master'];

// Practice modes
export type PracticeMode = '10q_25m' | '20q_45m' | '20q_mixed';
export const PRACTICE_MODES = {
    '10q_25m': { questions: 10, timeMinutes: 25, label: '10 Questions / 25 min' },
    '20q_45m': { questions: 20, timeMinutes: 45, label: '20 Questions / 45 min' },
    '20q_mixed': { questions: 20, timeMinutes: 45, label: '20 Mixed / 45 min' },
};

// Core entities
export interface Question {
    id: number;
    questionText: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    optionE?: string;
    correctAnswer: AnswerOption;
    myWrongAnswer: AnswerOption;
    section: Section;
    topic: Topic;
    subtopic?: string;
    errorType?: ErrorType;
    difficulty: Difficulty;
    source?: Source;
    sourceId?: string;
    gmatClubLink?: string;
    personalNote?: string;
    imagePath?: string;
    nextReviewDate?: string;
    intervalDays: number;
    easeFactor: number;
    repetitionCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface QuestionCreate {
    questionText: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    optionE?: string;
    correctAnswer: AnswerOption;
    myWrongAnswer: AnswerOption;
    section: Section;
    topic: Topic;
    subtopic?: string;
    errorType?: ErrorType;
    difficulty?: Difficulty;
    source?: Source;
    sourceId?: string;
    gmatClubLink?: string;
    personalNote?: string;
    imagePath?: string;
}

export interface PracticeSession {
    id: number;
    mode: PracticeMode;
    sectionFilter?: Section;
    topicFilter?: Topic;
    totalQuestions: number;
    correctCount: number;
    timeLimitSeconds: number;
    timeSpentSeconds?: number;
    completed: boolean;
    startedAt: string;
    completedAt?: string;
}

export interface Attempt {
    id: number;
    sessionId: number;
    questionId: number;
    selectedAnswer?: AnswerOption;
    isCorrect: boolean;
    confidence?: Confidence;
    timeSpentSeconds?: number;
    attemptedAt: string;
}

export interface UserStats {
    totalXp: number;
    currentStreak: number;
    longestStreak: number;
    lastPracticeDate?: string;
    level: number;
}

export interface Achievement {
    id: number;
    code: string;
    name: string;
    description?: string;
    icon?: string;
    xpReward: number;
    unlockedAt?: string;
}

export interface TopicMastery {
    id: number;
    section: Section;
    topic: Topic;
    questionsSeen: number;
    questionsCorrect: number;
    masteryLevel: MasteryLevel;
    lastPracticed?: string;
}

// API Response types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

// Analytics types
export interface OverviewStats {
    totalQuestions: number;
    totalPracticeSessions: number;
    totalAttempts: number;
    overallAccuracy: number;
    averageTimePerQuestion: number;
    currentStreak: number;
    totalXp: number;
    level: number;
}

export interface TopicStats {
    section: Section;
    topic: Topic;
    totalQuestions: number;
    practiced: number;
    correct: number;
    accuracy: number;
    masteryLevel: MasteryLevel;
}

export interface WeeklyTrend {
    week: string;
    questionsAdded: number;
    questionsPracticed: number;
    accuracy: number;
}
