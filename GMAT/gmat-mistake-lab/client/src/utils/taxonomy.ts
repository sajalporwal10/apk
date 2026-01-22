// GMAT Taxonomy - Topics and subtopics for GMAT Focus Edition

export type Section = 'Quant' | 'Verbal' | 'DataInsights';

export const SECTIONS: Section[] = ['Quant', 'Verbal', 'DataInsights'];

export const SECTION_LABELS: Record<Section, string> = {
    Quant: 'Quantitative Reasoning',
    Verbal: 'Verbal Reasoning',
    DataInsights: 'Data Insights',
};

export const SECTION_TOPICS: Record<Section, string[]> = {
    Quant: ['Arithmetic', 'Algebra', 'Word Problems', 'Geometry', 'Statistics'],
    Verbal: ['Reading Comprehension', 'Critical Reasoning'],
    DataInsights: [
        'Data Sufficiency',
        'Multi-Source Reasoning',
        'Graphics Interpretation',
        'Two-Part Analysis',
        'Table Analysis',
    ],
};

export const TOPIC_SUBTOPICS: Record<string, string[]> = {
    // Quant
    Arithmetic: ['Number Properties', 'Fractions/Decimals', 'Percentages', 'Ratios', 'Exponents/Roots'],
    Algebra: ['Linear Equations', 'Quadratic Equations', 'Inequalities', 'Functions', 'Sequences'],
    'Word Problems': ['Rate/Work', 'Mixtures', 'Profit/Loss', 'Age Problems', 'Distance/Speed'],
    Geometry: ['Lines/Angles', 'Triangles', 'Circles', 'Quadrilaterals', 'Coordinate Geometry', '3D Shapes'],
    Statistics: ['Mean/Median/Mode', 'Standard Deviation', 'Probability', 'Combinatorics'],
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

export const ERROR_TYPES = [
    { value: 'Careless', label: 'Careless Mistake', emoji: '🤦' },
    { value: 'Conceptual', label: 'Conceptual Gap', emoji: '📚' },
    { value: 'TimePressure', label: 'Time Pressure', emoji: '⏱️' },
    { value: 'TrapAnswer', label: 'Trap Answer', emoji: '🪤' },
    { value: 'Misread', label: 'Misread Question', emoji: '👀' },
];

export const DIFFICULTIES = [
    { value: 'Easy', label: 'Easy', color: 'text-green-400' },
    { value: 'Medium', label: 'Medium', color: 'text-yellow-400' },
    { value: 'Hard', label: 'Hard', color: 'text-red-400' },
];

export const SOURCES = [
    { value: 'GMATClub', label: 'GMAT Club' },
    { value: 'OfficialGuide', label: 'Official Guide' },
    { value: 'Mock', label: 'Practice Mock' },
    { value: 'TargetTestPrep', label: 'Target Test Prep' },
    { value: 'Manhattan', label: 'Manhattan Prep' },
    { value: 'Other', label: 'Other' },
];

export const PRACTICE_MODES = [
    { value: '10q_25m', label: '10 Questions / 25 min', questions: 10, minutes: 25 },
    { value: '20q_45m', label: '20 Questions / 45 min', questions: 20, minutes: 45 },
    { value: '20q_mixed', label: '20 Mixed / 45 min', questions: 20, minutes: 45, mixed: true },
];

export const MASTERY_LEVELS = [
    { level: 'Novice', color: 'mastery-novice', min: 0 },
    { level: 'Apprentice', color: 'mastery-apprentice', min: 5 },
    { level: 'Competent', color: 'mastery-competent', min: 10 },
    { level: 'Proficient', color: 'mastery-proficient', min: 20 },
    { level: 'Expert', color: 'mastery-expert', min: 30 },
    { level: 'Master', color: 'mastery-master', min: 50 },
];

export function getTopicsForSection(section: Section): string[] {
    return SECTION_TOPICS[section] || [];
}

export function getSubtopicsForTopic(topic: string): string[] {
    return TOPIC_SUBTOPICS[topic] || [];
}

export function getSectionColor(section: Section): string {
    switch (section) {
        case 'Quant':
            return 'text-cyan-400';
        case 'Verbal':
            return 'text-purple-400';
        case 'DataInsights':
            return 'text-amber-400';
        default:
            return 'text-gray-400';
    }
}

export function getSectionBgColor(section: Section): string {
    switch (section) {
        case 'Quant':
            return 'bg-cyan-500/20';
        case 'Verbal':
            return 'bg-purple-500/20';
        case 'DataInsights':
            return 'bg-amber-500/20';
        default:
            return 'bg-gray-500/20';
    }
}

export function getMasteryColor(level: string): string {
    const mastery = MASTERY_LEVELS.find((m) => m.level === level);
    return mastery?.color || 'mastery-novice';
}
