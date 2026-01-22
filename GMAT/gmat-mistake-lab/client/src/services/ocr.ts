// OCR Service - Extract text from images using Tesseract.js
import Tesseract from 'tesseract.js';

export interface OCRResult {
    text: string;
    confidence: number;
    isProcessing: boolean;
    error?: string;
}

// Process an image file and extract text
export async function extractTextFromImage(
    imageFile: File,
    onProgress?: (progress: number) => void
): Promise<OCRResult> {
    try {
        const result = await Tesseract.recognize(imageFile, 'eng', {
            logger: (info) => {
                if (info.status === 'recognizing text' && onProgress) {
                    onProgress(Math.round(info.progress * 100));
                }
            },
        });

        return {
            text: result.data.text.trim(),
            confidence: result.data.confidence,
            isProcessing: false,
        };
    } catch (error: any) {
        return {
            text: '',
            confidence: 0,
            isProcessing: false,
            error: error.message || 'Failed to process image',
        };
    }
}

// Parse extracted text to identify question structure
export function parseQuestionFromText(rawText: string): {
    questionText: string;
    options: { A?: string; B?: string; C?: string; D?: string; E?: string };
} {
    const lines = rawText.split('\n').filter((line) => line.trim());
    let questionText = '';
    const options: { A?: string; B?: string; C?: string; D?: string; E?: string } = {};

    // Patterns to match options
    const optionPatterns = [
        /^\s*\(?([A-E])\)?[\.\:\)]\s*(.+)$/i,  // (A) text, A. text, A: text, A) text
        /^\s*([A-E])\s+(.+)$/i,                 // A text
    ];

    let currentOption: string | null = null;
    let optionContent = '';

    for (const line of lines) {
        let matched = false;

        for (const pattern of optionPatterns) {
            const match = line.match(pattern);
            if (match) {
                // Save previous option if exists
                if (currentOption && optionContent) {
                    options[currentOption as keyof typeof options] = optionContent.trim();
                }

                currentOption = match[1].toUpperCase();
                optionContent = match[2];
                matched = true;
                break;
            }
        }

        if (!matched) {
            if (currentOption) {
                // Continue previous option
                optionContent += ' ' + line.trim();
            } else {
                // Part of question text
                questionText += (questionText ? ' ' : '') + line.trim();
            }
        }
    }

    // Save last option
    if (currentOption && optionContent) {
        options[currentOption as keyof typeof options] = optionContent.trim();
    }

    return { questionText, options };
}

// Validate if we have enough content
export function validateParsedQuestion(parsed: ReturnType<typeof parseQuestionFromText>): {
    isValid: boolean;
    warnings: string[];
} {
    const warnings: string[] = [];

    if (!parsed.questionText || parsed.questionText.length < 10) {
        warnings.push('Question text seems too short or missing');
    }

    const optionCount = Object.values(parsed.options).filter(Boolean).length;
    if (optionCount < 4) {
        warnings.push(`Only ${optionCount} options detected. GMAT questions typically have 4-5 options.`);
    }

    return {
        isValid: Boolean(parsed.questionText) && optionCount >= 2,
        warnings,
    };
}
