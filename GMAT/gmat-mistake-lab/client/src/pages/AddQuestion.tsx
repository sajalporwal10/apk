// Add Question Page - Form to add a new wrong question
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Search, ExternalLink, Upload, Loader2 } from 'lucide-react';
import { questionsApi, searchApi } from '../services/api';
import {
    SECTIONS,
    SECTION_LABELS,
    SECTION_TOPICS,
    TOPIC_SUBTOPICS,
    ERROR_TYPES,
    DIFFICULTIES,
    SOURCES,
    type Section
} from '../utils/taxonomy';

interface SearchResult {
    title: string;
    url: string;
    snippet: string;
}

export default function AddQuestion() {
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [fallbackUrl, setFallbackUrl] = useState('');

    // Form state
    const [form, setForm] = useState({
        questionText: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        optionE: '',
        correctAnswer: '',
        myWrongAnswer: '',
        section: '' as Section | '',
        topic: '',
        subtopic: '',
        errorType: '',
        difficulty: 'Medium',
        source: '',
        sourceId: '',
        gmatClubLink: '',
        personalNote: '',
    });

    const handleChange = (field: string, value: string) => {
        setForm((prev) => {
            const updated = { ...prev, [field]: value };

            // Reset topic when section changes
            if (field === 'section') {
                updated.topic = '';
                updated.subtopic = '';
            }

            // Reset subtopic when topic changes
            if (field === 'topic') {
                updated.subtopic = '';
            }

            return updated;
        });
    };

    const handleSearchGmatClub = async () => {
        if (form.questionText.length < 20) {
            alert('Please enter more question text for better search results');
            return;
        }

        setIsSearching(true);
        try {
            const result = await searchApi.searchGmatClub(form.questionText) as {
                results: SearchResult[];
                fallbackUrl: string
            };
            setSearchResults(result.results);
            setFallbackUrl(result.fallbackUrl);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectLink = (url: string) => {
        setForm((prev) => ({ ...prev, gmatClubLink: url }));
        setSearchResults([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!form.questionText || !form.optionA || !form.optionB || !form.optionC || !form.optionD) {
            alert('Please fill in the question and all options (A-D)');
            return;
        }

        if (!form.correctAnswer || !form.myWrongAnswer) {
            alert('Please select the correct answer and your wrong answer');
            return;
        }

        if (!form.section || !form.topic) {
            alert('Please select section and topic');
            return;
        }

        setIsSubmitting(true);
        try {
            await questionsApi.create({
                questionText: form.questionText,
                optionA: form.optionA,
                optionB: form.optionB,
                optionC: form.optionC,
                optionD: form.optionD,
                optionE: form.optionE || undefined,
                correctAnswer: form.correctAnswer,
                myWrongAnswer: form.myWrongAnswer,
                section: form.section,
                topic: form.topic,
                subtopic: form.subtopic || undefined,
                errorType: form.errorType || undefined,
                difficulty: form.difficulty,
                source: form.source || undefined,
                sourceId: form.sourceId || undefined,
                gmatClubLink: form.gmatClubLink || undefined,
                personalNote: form.personalNote || undefined,
            });

            // Show success and redirect
            navigate('/questions');
        } catch (error: any) {
            alert(error.message || 'Failed to add question');
        } finally {
            setIsSubmitting(false);
        }
    };

    const topics = form.section ? SECTION_TOPICS[form.section as Section] : [];
    const subtopics = form.topic ? TOPIC_SUBTOPICS[form.topic] || [] : [];

    return (
        <div className="max-w-4xl mx-auto animate-fadeIn">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Add Wrong Question</h1>
                <p className="text-gray-400">Log a mistake to learn from it later</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Question Text */}
                <div className="card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Question</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Question Text *</label>
                            <textarea
                                className="textarea min-h-[150px]"
                                placeholder="Paste the full question text here..."
                                value={form.questionText}
                                onChange={(e) => handleChange('questionText', e.target.value)}
                                required
                            />
                        </div>

                        {/* GMAT Club Search */}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleSearchGmatClub}
                                disabled={isSearching || form.questionText.length < 20}
                                className="btn btn-secondary"
                            >
                                {isSearching ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Search className="w-4 h-4" />
                                )}
                                Find on GMAT Club
                            </button>

                            {fallbackUrl && (
                                <a
                                    href={fallbackUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-ghost"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Search Manually
                                </a>
                            )}
                        </div>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div className="space-y-2 p-4 rounded-lg bg-surface-light">
                                <p className="text-sm text-gray-400 mb-2">Select a matching discussion:</p>
                                {searchResults.map((result, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        onClick={() => handleSelectLink(result.url)}
                                        className="w-full text-left p-3 rounded-lg bg-bg hover:bg-purple-500/10 transition-colors"
                                    >
                                        <p className="text-sm font-medium text-white truncate">{result.title}</p>
                                        <p className="text-xs text-gray-500 truncate">{result.url}</p>
                                    </button>
                                ))}
                            </div>
                        )}

                        {form.gmatClubLink && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                                <span className="text-sm text-green-400">✓ GMAT Club link attached</span>
                                <a
                                    href={form.gmatClubLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-green-300 hover:underline"
                                >
                                    {form.gmatClubLink.substring(0, 50)}...
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                {/* Answer Options */}
                <div className="card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Answer Options</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {['A', 'B', 'C', 'D', 'E'].map((letter) => (
                            <div key={letter} className="flex items-start gap-3">
                                <div className="answer-letter mt-2">{letter}</div>
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder={`Option ${letter}${letter === 'E' ? ' (optional)' : ''}`}
                                        value={form[`option${letter}` as keyof typeof form] as string}
                                        onChange={(e) => handleChange(`option${letter}`, e.target.value)}
                                        required={letter !== 'E'}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Correct Answer *</label>
                            <select
                                className="select"
                                value={form.correctAnswer}
                                onChange={(e) => handleChange('correctAnswer', e.target.value)}
                                required
                            >
                                <option value="">Select correct answer</option>
                                {['A', 'B', 'C', 'D', 'E'].map((letter) => (
                                    <option key={letter} value={letter}>{letter}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Your Wrong Answer *</label>
                            <select
                                className="select"
                                value={form.myWrongAnswer}
                                onChange={(e) => handleChange('myWrongAnswer', e.target.value)}
                                required
                            >
                                <option value="">Select your answer</option>
                                {['A', 'B', 'C', 'D', 'E'].map((letter) => (
                                    <option key={letter} value={letter}>{letter}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Classification */}
                <div className="card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Classification</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Section *</label>
                            <select
                                className="select"
                                value={form.section}
                                onChange={(e) => handleChange('section', e.target.value)}
                                required
                            >
                                <option value="">Select section</option>
                                {SECTIONS.map((section) => (
                                    <option key={section} value={section}>
                                        {SECTION_LABELS[section]}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Topic *</label>
                            <select
                                className="select"
                                value={form.topic}
                                onChange={(e) => handleChange('topic', e.target.value)}
                                required
                                disabled={!form.section}
                            >
                                <option value="">Select topic</option>
                                {topics.map((topic) => (
                                    <option key={topic} value={topic}>{topic}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Subtopic</label>
                            <select
                                className="select"
                                value={form.subtopic}
                                onChange={(e) => handleChange('subtopic', e.target.value)}
                                disabled={!form.topic}
                            >
                                <option value="">Select subtopic (optional)</option>
                                {subtopics.map((subtopic) => (
                                    <option key={subtopic} value={subtopic}>{subtopic}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Error Type</label>
                            <select
                                className="select"
                                value={form.errorType}
                                onChange={(e) => handleChange('errorType', e.target.value)}
                            >
                                <option value="">Why did you get it wrong?</option>
                                {ERROR_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.emoji} {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Difficulty</label>
                            <select
                                className="select"
                                value={form.difficulty}
                                onChange={(e) => handleChange('difficulty', e.target.value)}
                            >
                                {DIFFICULTIES.map((diff) => (
                                    <option key={diff.value} value={diff.value}>{diff.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Source</label>
                            <select
                                className="select"
                                value={form.source}
                                onChange={(e) => handleChange('source', e.target.value)}
                            >
                                <option value="">Where did you find this?</option>
                                {SOURCES.map((src) => (
                                    <option key={src.value} value={src.value}>{src.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Personal Note */}
                <div className="card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Reflection</h3>

                    <div>
                        <label className="block text-sm text-gray-400 mb-2">
                            Why did you get this wrong? What will you remember next time?
                        </label>
                        <textarea
                            className="textarea"
                            placeholder="e.g., 'I forgot to check if x could be negative' or 'Fell for the trap answer C'..."
                            value={form.personalNote}
                            onChange={(e) => handleChange('personalNote', e.target.value)}
                        />
                    </div>
                </div>

                {/* Submit */}
                <div className="flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="btn btn-ghost"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn btn-primary"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        Save Question
                    </button>
                </div>
            </form>
        </div>
    );
}
