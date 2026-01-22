// CSV Import Service - Parse and validate CSV data for bulk import
import { SECTIONS, SECTION_TOPICS, ERROR_TYPES, DIFFICULTIES, SOURCES } from '../utils/taxonomy';

export interface CSVQuestion {
    questionText: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    optionE?: string;
    correctAnswer: string;
    myWrongAnswer: string;
    section: string;
    topic: string;
    subtopic?: string;
    errorType?: string;
    difficulty?: string;
    source?: string;
    sourceId?: string;
    gmatClubLink?: string;
    personalNote?: string;
}

export interface CSVParseResult {
    questions: CSVQuestion[];
    errors: { row: number; message: string }[];
    warnings: { row: number; message: string }[];
}

// Expected CSV headers (case-insensitive matching)
const REQUIRED_HEADERS = ['questiontext', 'optiona', 'optionb', 'optionc', 'optiond', 'correctanswer', 'mywronganswer', 'section', 'topic'];
// Optional headers for reference: optione, subtopic, errortype, difficulty, source, sourceid, gmatclublink, personalnote

// Normalize header names
function normalizeHeader(header: string): string {
    return header.toLowerCase().replace(/[\s_-]/g, '');
}

// Parse CSV content
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}

// Validate a single question
function validateQuestion(
    question: Partial<CSVQuestion>,
    _rowNum: number
): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!question.questionText || question.questionText.length < 10) {
        errors.push('Question text is too short or missing');
    }

    if (!question.optionA) errors.push('Option A is required');
    if (!question.optionB) errors.push('Option B is required');
    if (!question.optionC) errors.push('Option C is required');
    if (!question.optionD) errors.push('Option D is required');

    if (!question.correctAnswer || !['A', 'B', 'C', 'D', 'E'].includes(question.correctAnswer.toUpperCase())) {
        errors.push('Valid correct answer (A-E) is required');
    }

    if (!question.myWrongAnswer || !['A', 'B', 'C', 'D', 'E'].includes(question.myWrongAnswer.toUpperCase())) {
        errors.push('Valid wrong answer (A-E) is required');
    }

    if (!question.section || !SECTIONS.includes(question.section as any)) {
        errors.push(`Invalid section. Must be one of: ${SECTIONS.join(', ')}`);
    }

    if (question.section && question.topic) {
        const validTopics = SECTION_TOPICS[question.section as keyof typeof SECTION_TOPICS] || [];
        if (!validTopics.includes(question.topic)) {
            warnings.push(`Topic "${question.topic}" may not match section "${question.section}"`);
        }
    } else if (!question.topic) {
        errors.push('Topic is required');
    }

    // Optional field validation
    if (question.errorType && !ERROR_TYPES.map((e) => e.value).includes(question.errorType)) {
        warnings.push(`Unknown error type: ${question.errorType}`);
    }

    if (question.difficulty && !DIFFICULTIES.map((d) => d.value).includes(question.difficulty)) {
        warnings.push(`Unknown difficulty: ${question.difficulty}`);
    }

    if (question.source && !SOURCES.map((s) => s.value).includes(question.source)) {
        warnings.push(`Unknown source: ${question.source}`);
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}

// Main parsing function
export function parseCSV(csvContent: string): CSVParseResult {
    const lines = csvContent.split(/\r?\n/).filter((line) => line.trim());

    if (lines.length < 2) {
        return {
            questions: [],
            errors: [{ row: 0, message: 'CSV file must have headers and at least one data row' }],
            warnings: [],
        };
    }

    // Parse headers
    const headers = parseCSVLine(lines[0]).map(normalizeHeader);

    // Validate required headers
    const missingHeaders = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
    if (missingHeaders.length > 0) {
        return {
            questions: [],
            errors: [{ row: 1, message: `Missing required columns: ${missingHeaders.join(', ')}` }],
            warnings: [],
        };
    }

    // Create header index map
    const headerIndex: Record<string, number> = {};
    headers.forEach((h, i) => {
        headerIndex[h] = i;
    });

    const questions: CSVQuestion[] = [];
    const errors: { row: number; message: string }[] = [];
    const warnings: { row: number; message: string }[] = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const rowNum = i + 1;

        // Skip empty rows
        if (values.every((v) => !v.trim())) continue;

        const question: Partial<CSVQuestion> = {
            questionText: values[headerIndex['questiontext']] || '',
            optionA: values[headerIndex['optiona']] || '',
            optionB: values[headerIndex['optionb']] || '',
            optionC: values[headerIndex['optionc']] || '',
            optionD: values[headerIndex['optiond']] || '',
            optionE: values[headerIndex['optione']] || undefined,
            correctAnswer: (values[headerIndex['correctanswer']] || '').toUpperCase(),
            myWrongAnswer: (values[headerIndex['mywronganswer']] || '').toUpperCase(),
            section: values[headerIndex['section']] || '',
            topic: values[headerIndex['topic']] || '',
            subtopic: values[headerIndex['subtopic']] || undefined,
            errorType: values[headerIndex['errortype']] || undefined,
            difficulty: values[headerIndex['difficulty']] || 'Medium',
            source: values[headerIndex['source']] || undefined,
            sourceId: values[headerIndex['sourceid']] || undefined,
            gmatClubLink: values[headerIndex['gmatclublink']] || undefined,
            personalNote: values[headerIndex['personalnote']] || undefined,
        };

        const validation = validateQuestion(question, rowNum);

        if (validation.isValid) {
            questions.push(question as CSVQuestion);
        } else {
            validation.errors.forEach((err) => {
                errors.push({ row: rowNum, message: err });
            });
        }

        validation.warnings.forEach((warn) => {
            warnings.push({ row: rowNum, message: warn });
        });
    }

    return { questions, errors, warnings };
}

// Generate sample CSV template
export function generateCSVTemplate(): string {
    const headers = [
        'questionText',
        'optionA',
        'optionB',
        'optionC',
        'optionD',
        'optionE',
        'correctAnswer',
        'myWrongAnswer',
        'section',
        'topic',
        'subtopic',
        'errorType',
        'difficulty',
        'source',
        'personalNote',
    ];

    const sampleRow = [
        'If x + y = 10 and x - y = 4, what is the value of x?',
        '3',
        '5',
        '7',
        '10',
        '',
        'C',
        'B',
        'Quant',
        'Algebra',
        'Linear Equations',
        'Careless',
        'Medium',
        'GMATClub',
        'Forgot to add the equations',
    ];

    return headers.join(',') + '\n' + sampleRow.map((v) => `"${v}"`).join(',');
}

// Download helper
export function downloadCSVTemplate(): void {
    const template = generateCSVTemplate();
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gmat_questions_template.csv';
    link.click();
    URL.revokeObjectURL(url);
}
