// Import Page - Screenshot OCR and CSV Bulk Import
import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Upload,
    FileText,
    Image,
    Download,
    AlertCircle,
    CheckCircle,
    Loader2,
    X,
    Edit2,
    Save
} from 'lucide-react';
import { extractTextFromImage, parseQuestionFromText, validateParsedQuestion } from '../services/ocr';
import { parseCSV, downloadCSVTemplate, type CSVQuestion } from '../services/csvImport';
import { questionsApi } from '../services/api';
import {
    SECTIONS,
    SECTION_LABELS,
    SECTION_TOPICS,
    TOPIC_SUBTOPICS,
    ERROR_TYPES,
    type Section
} from '../utils/taxonomy';

type ImportMode = 'screenshot' | 'csv';

export default function Import() {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const csvInputRef = useRef<HTMLInputElement>(null);

    const [mode, setMode] = useState<ImportMode>('screenshot');

    // Screenshot OCR state
    const [_imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [ocrProgress, setOcrProgress] = useState(0);
    const [extractedText, setExtractedText] = useState('');
    const [parsedQuestion, setParsedQuestion] = useState<ReturnType<typeof parseQuestionFromText> | null>(null);
    const [ocrWarnings, setOcrWarnings] = useState<string[]>([]);

    // Editable form after OCR
    const [ocrForm, setOcrForm] = useState({
        questionText: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        optionE: '',
        correctAnswer: '',
        myWrongAnswer: '',
        section: '',
        topic: '',
        subtopic: '',
        errorType: '',
    });

    // CSV import state
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvResult, setCsvResult] = useState<{
        questions: CSVQuestion[];
        errors: { row: number; message: string }[];
        warnings: { row: number; message: string }[];
    } | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);

    // Handle image upload
    const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        setExtractedText('');
        setParsedQuestion(null);
        setOcrWarnings([]);

        // Start OCR processing
        setIsProcessing(true);
        setOcrProgress(0);

        try {
            const result = await extractTextFromImage(file, setOcrProgress);

            if (result.error) {
                alert(`OCR Error: ${result.error}`);
                setIsProcessing(false);
                return;
            }

            setExtractedText(result.text);

            // Parse the extracted text
            const parsed = parseQuestionFromText(result.text);
            setParsedQuestion(parsed);

            // Validate and get warnings
            const validation = validateParsedQuestion(parsed);
            setOcrWarnings(validation.warnings);

            // Pre-fill form
            setOcrForm({
                questionText: parsed.questionText,
                optionA: parsed.options.A || '',
                optionB: parsed.options.B || '',
                optionC: parsed.options.C || '',
                optionD: parsed.options.D || '',
                optionE: parsed.options.E || '',
                correctAnswer: '',
                myWrongAnswer: '',
                section: '',
                topic: '',
                subtopic: '',
                errorType: '',
            });
        } catch (error: any) {
            alert(`Failed to process image: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    }, []);

    // Handle CSV upload
    const handleCSVSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setCsvFile(file);
        setImportResult(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            const result = parseCSV(content);
            setCsvResult(result);
        };
        reader.readAsText(file);
    }, []);

    // Save OCR question
    const handleSaveOcrQuestion = async () => {
        // Validate
        if (!ocrForm.questionText || !ocrForm.optionA || !ocrForm.optionB || !ocrForm.optionC || !ocrForm.optionD) {
            alert('Please fill in question and options A-D');
            return;
        }
        if (!ocrForm.correctAnswer || !ocrForm.myWrongAnswer) {
            alert('Please select correct answer and your wrong answer');
            return;
        }
        if (!ocrForm.section || !ocrForm.topic) {
            alert('Please select section and topic');
            return;
        }

        setIsImporting(true);
        try {
            await questionsApi.create({
                questionText: ocrForm.questionText,
                optionA: ocrForm.optionA,
                optionB: ocrForm.optionB,
                optionC: ocrForm.optionC,
                optionD: ocrForm.optionD,
                optionE: ocrForm.optionE || undefined,
                correctAnswer: ocrForm.correctAnswer,
                myWrongAnswer: ocrForm.myWrongAnswer,
                section: ocrForm.section,
                topic: ocrForm.topic,
                subtopic: ocrForm.subtopic || undefined,
                errorType: ocrForm.errorType || undefined,
                difficulty: 'Medium',
            });

            alert('Question saved successfully! +10 XP');
            navigate('/questions');
        } catch (error: any) {
            alert(`Failed to save: ${error.message}`);
        } finally {
            setIsImporting(false);
        }
    };

    // Import CSV questions
    const handleImportCSV = async () => {
        if (!csvResult || csvResult.questions.length === 0) {
            alert('No valid questions to import');
            return;
        }

        setIsImporting(true);
        try {
            const result = await questionsApi.import(csvResult.questions) as { imported: number; errors: string[] };
            setImportResult(result);
        } catch (error: any) {
            alert(`Import failed: ${error.message}`);
        } finally {
            setIsImporting(false);
        }
    };

    // Reset
    const handleReset = () => {
        setImageFile(null);
        setImagePreview(null);
        setExtractedText('');
        setParsedQuestion(null);
        setOcrWarnings([]);
        setCsvFile(null);
        setCsvResult(null);
        setImportResult(null);
        setOcrForm({
            questionText: '',
            optionA: '',
            optionB: '',
            optionC: '',
            optionD: '',
            optionE: '',
            correctAnswer: '',
            myWrongAnswer: '',
            section: '',
            topic: '',
            subtopic: '',
            errorType: '',
        });
    };

    const topics = ocrForm.section ? SECTION_TOPICS[ocrForm.section as Section] : [];
    const _subtopics = ocrForm.topic ? TOPIC_SUBTOPICS[ocrForm.topic] || [] : [];

    return (
        <div className="max-w-4xl mx-auto animate-fadeIn">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Import Questions</h1>
                <p className="text-gray-400">Upload screenshots or import from CSV</p>
            </div>

            {/* Mode Selector */}
            <div className="flex gap-4 mb-8">
                <button
                    onClick={() => { setMode('screenshot'); handleReset(); }}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all ${mode === 'screenshot'
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-purple-500/20 hover:border-purple-500/40'
                        }`}
                >
                    <div className="flex items-center justify-center gap-3">
                        <Image className="w-6 h-6 text-purple-400" />
                        <span className="font-semibold text-white">Screenshot OCR</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-2">
                        Upload an image and extract question text automatically
                    </p>
                </button>

                <button
                    onClick={() => { setMode('csv'); handleReset(); }}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all ${mode === 'csv'
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-purple-500/20 hover:border-purple-500/40'
                        }`}
                >
                    <div className="flex items-center justify-center gap-3">
                        <FileText className="w-6 h-6 text-cyan-400" />
                        <span className="font-semibold text-white">CSV Bulk Import</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-2">
                        Import multiple questions from a spreadsheet
                    </p>
                </button>
            </div>

            {/* Screenshot OCR Mode */}
            {mode === 'screenshot' && (
                <div className="space-y-6">
                    {/* Upload Area */}
                    {!imagePreview && (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="card p-12 text-center cursor-pointer hover:border-purple-500/50 transition-colors"
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageSelect}
                                className="hidden"
                            />
                            <Upload className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                            <p className="text-lg font-semibold text-white mb-2">
                                Drop an image or click to upload
                            </p>
                            <p className="text-sm text-gray-400">
                                Supports PNG, JPG, JPEG screenshots
                            </p>
                        </div>
                    )}

                    {/* Image Preview + Processing */}
                    {imagePreview && (
                        <div className="card p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-lg font-semibold text-white">Screenshot</h3>
                                <button onClick={handleReset} className="btn btn-ghost text-sm py-1">
                                    <X className="w-4 h-4" />
                                    Clear
                                </button>
                            </div>

                            <img
                                src={imagePreview}
                                alt="Uploaded screenshot"
                                className="max-h-64 rounded-lg mx-auto mb-4"
                            />

                            {isProcessing && (
                                <div className="text-center">
                                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-2" />
                                    <p className="text-sm text-gray-400">Processing image... {ocrProgress}%</p>
                                    <div className="progress-bar mt-2 max-w-xs mx-auto">
                                        <div className="progress-fill" style={{ width: `${ocrProgress}%` }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* OCR Warnings */}
                    {ocrWarnings.length > 0 && (
                        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium text-amber-400">OCR Warnings</p>
                                    <ul className="text-sm text-amber-200 mt-1 list-disc list-inside">
                                        {ocrWarnings.map((warn, i) => (
                                            <li key={i}>{warn}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Extracted Text (Collapsible) */}
                    {extractedText && (
                        <details className="card p-4">
                            <summary className="cursor-pointer font-medium text-white flex items-center gap-2">
                                <FileText className="w-4 h-4 text-gray-400" />
                                Raw Extracted Text
                            </summary>
                            <pre className="mt-4 p-4 rounded-lg bg-bg text-sm text-gray-300 whitespace-pre-wrap overflow-x-auto">
                                {extractedText}
                            </pre>
                        </details>
                    )}

                    {/* Editable Form After OCR */}
                    {parsedQuestion && !isProcessing && (
                        <div className="space-y-6">
                            <div className="card p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Edit2 className="w-5 h-5 text-purple-400" />
                                    <h3 className="text-lg font-semibold text-white">Review & Edit</h3>
                                </div>

                                {/* Question Text */}
                                <div className="mb-4">
                                    <label className="block text-sm text-gray-400 mb-2">Question Text *</label>
                                    <textarea
                                        className="textarea"
                                        value={ocrForm.questionText}
                                        onChange={(e) => setOcrForm((f) => ({ ...f, questionText: e.target.value }))}
                                        rows={4}
                                    />
                                </div>

                                {/* Options Grid */}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    {['A', 'B', 'C', 'D', 'E'].map((letter) => (
                                        <div key={letter} className="flex items-center gap-2">
                                            <span className="answer-letter">{letter}</span>
                                            <input
                                                type="text"
                                                className="input"
                                                placeholder={`Option ${letter}`}
                                                value={ocrForm[`option${letter}` as keyof typeof ocrForm]}
                                                onChange={(e) =>
                                                    setOcrForm((f) => ({ ...f, [`option${letter}`]: e.target.value }))
                                                }
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Answers */}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">Correct Answer *</label>
                                        <select
                                            className="select"
                                            value={ocrForm.correctAnswer}
                                            onChange={(e) => setOcrForm((f) => ({ ...f, correctAnswer: e.target.value }))}
                                        >
                                            <option value="">Select</option>
                                            {['A', 'B', 'C', 'D', 'E'].map((l) => (
                                                <option key={l} value={l}>{l}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">Your Wrong Answer *</label>
                                        <select
                                            className="select"
                                            value={ocrForm.myWrongAnswer}
                                            onChange={(e) => setOcrForm((f) => ({ ...f, myWrongAnswer: e.target.value }))}
                                        >
                                            <option value="">Select</option>
                                            {['A', 'B', 'C', 'D', 'E'].map((l) => (
                                                <option key={l} value={l}>{l}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Classification */}
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">Section *</label>
                                        <select
                                            className="select"
                                            value={ocrForm.section}
                                            onChange={(e) =>
                                                setOcrForm((f) => ({ ...f, section: e.target.value, topic: '', subtopic: '' }))
                                            }
                                        >
                                            <option value="">Select</option>
                                            {SECTIONS.map((s) => (
                                                <option key={s} value={s}>{SECTION_LABELS[s]}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">Topic *</label>
                                        <select
                                            className="select"
                                            value={ocrForm.topic}
                                            onChange={(e) =>
                                                setOcrForm((f) => ({ ...f, topic: e.target.value, subtopic: '' }))
                                            }
                                            disabled={!ocrForm.section}
                                        >
                                            <option value="">Select</option>
                                            {topics.map((t) => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">Error Type</label>
                                        <select
                                            className="select"
                                            value={ocrForm.errorType}
                                            onChange={(e) => setOcrForm((f) => ({ ...f, errorType: e.target.value }))}
                                        >
                                            <option value="">Select</option>
                                            {ERROR_TYPES.map((e) => (
                                                <option key={e.value} value={e.value}>
                                                    {e.emoji} {e.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSaveOcrQuestion}
                                    disabled={isImporting}
                                    className="btn btn-primary w-full"
                                >
                                    {isImporting ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Save className="w-5 h-5" />
                                    )}
                                    Save Question
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* CSV Import Mode */}
            {mode === 'csv' && (
                <div className="space-y-6">
                    {/* Download Template */}
                    <div className="card p-4 flex items-center justify-between">
                        <div>
                            <p className="font-medium text-white">Need a template?</p>
                            <p className="text-sm text-gray-400">Download our CSV template with sample data</p>
                        </div>
                        <button onClick={downloadCSVTemplate} className="btn btn-secondary">
                            <Download className="w-4 h-4" />
                            Download Template
                        </button>
                    </div>

                    {/* Upload Area */}
                    {!csvFile && (
                        <div
                            onClick={() => csvInputRef.current?.click()}
                            className="card p-12 text-center cursor-pointer hover:border-purple-500/50 transition-colors"
                        >
                            <input
                                ref={csvInputRef}
                                type="file"
                                accept=".csv"
                                onChange={handleCSVSelect}
                                className="hidden"
                            />
                            <FileText className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
                            <p className="text-lg font-semibold text-white mb-2">
                                Drop a CSV file or click to upload
                            </p>
                            <p className="text-sm text-gray-400">
                                Use the template above for best results
                            </p>
                        </div>
                    )}

                    {/* CSV Parse Results */}
                    {csvResult && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-white">
                                    Parsed: {csvFile?.name}
                                </h3>
                                <button onClick={handleReset} className="btn btn-ghost text-sm py-1">
                                    <X className="w-4 h-4" />
                                    Clear
                                </button>
                            </div>

                            {/* Summary */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="card p-4 text-center">
                                    <p className="text-2xl font-bold text-green-400">{csvResult.questions.length}</p>
                                    <p className="text-sm text-gray-400">Valid Questions</p>
                                </div>
                                <div className="card p-4 text-center">
                                    <p className="text-2xl font-bold text-red-400">{csvResult.errors.length}</p>
                                    <p className="text-sm text-gray-400">Errors</p>
                                </div>
                                <div className="card p-4 text-center">
                                    <p className="text-2xl font-bold text-amber-400">{csvResult.warnings.length}</p>
                                    <p className="text-sm text-gray-400">Warnings</p>
                                </div>
                            </div>

                            {/* Errors */}
                            {csvResult.errors.length > 0 && (
                                <div className="card p-4 border-red-500/30">
                                    <p className="font-medium text-red-400 mb-2 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        Errors (will be skipped)
                                    </p>
                                    <ul className="text-sm text-red-300 space-y-1 max-h-40 overflow-y-auto">
                                        {csvResult.errors.map((err, i) => (
                                            <li key={i}>Row {err.row}: {err.message}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Warnings */}
                            {csvResult.warnings.length > 0 && (
                                <div className="card p-4 border-amber-500/30">
                                    <p className="font-medium text-amber-400 mb-2 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        Warnings (will still import)
                                    </p>
                                    <ul className="text-sm text-amber-300 space-y-1 max-h-40 overflow-y-auto">
                                        {csvResult.warnings.slice(0, 10).map((warn, i) => (
                                            <li key={i}>Row {warn.row}: {warn.message}</li>
                                        ))}
                                        {csvResult.warnings.length > 10 && (
                                            <li className="text-gray-400">...and {csvResult.warnings.length - 10} more</li>
                                        )}
                                    </ul>
                                </div>
                            )}

                            {/* Preview */}
                            {csvResult.questions.length > 0 && (
                                <div className="card p-4">
                                    <p className="font-medium text-white mb-2">Preview (first 3 questions)</p>
                                    <div className="space-y-2">
                                        {csvResult.questions.slice(0, 3).map((q, i) => (
                                            <div key={i} className="p-3 rounded-lg bg-surface-light">
                                                <p className="text-sm text-white line-clamp-2">{q.questionText}</p>
                                                <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                                                    <span className="badge badge-primary py-0">{q.section}</span>
                                                    <span>{q.topic}</span>
                                                    <span>•</span>
                                                    <span>Correct: {q.correctAnswer}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Import Button */}
                            <button
                                onClick={handleImportCSV}
                                disabled={isImporting || csvResult.questions.length === 0}
                                className="btn btn-success w-full py-4"
                            >
                                {isImporting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-5 h-5" />
                                        Import {csvResult.questions.length} Questions
                                    </>
                                )}
                            </button>

                            {/* Import Result */}
                            {importResult && (
                                <div className={`p-4 rounded-lg ${importResult.errors.length > 0
                                    ? 'bg-amber-500/10 border border-amber-500/30'
                                    : 'bg-green-500/10 border border-green-500/30'
                                    }`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle className="w-5 h-5 text-green-400" />
                                        <span className="font-medium text-green-400">
                                            Successfully imported {importResult.imported} questions!
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-300">
                                        +{importResult.imported * 10} XP earned
                                    </p>
                                    {importResult.errors.length > 0 && (
                                        <div className="mt-2 text-sm text-amber-300">
                                            {importResult.errors.length} errors during import
                                        </div>
                                    )}
                                    <button
                                        onClick={() => navigate('/questions')}
                                        className="btn btn-primary mt-4"
                                    >
                                        View Questions
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
