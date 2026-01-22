// Questions Page - List all logged questions
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Trash2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { questionsApi } from '../services/api';
import {
    SECTIONS,
    SECTION_LABELS,
    SECTION_TOPICS,
    ERROR_TYPES,
    getSectionColor,
    getSectionBgColor,
    type Section
} from '../utils/taxonomy';

interface Question {
    id: number;
    questionText: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    optionE?: string;
    correctAnswer: string;
    myWrongAnswer: string;
    section: Section;
    topic: string;
    subtopic?: string;
    errorType?: string;
    difficulty: string;
    source?: string;
    gmatClubLink?: string;
    personalNote?: string;
    createdAt: string;
}

export default function Questions() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterSection, setFilterSection] = useState('');
    const [filterTopic, setFilterTopic] = useState('');
    const [filterError, setFilterError] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        loadQuestions();
    }, [filterSection, filterTopic, filterError]);

    const loadQuestions = async () => {
        setIsLoading(true);
        try {
            const data = await questionsApi.getAll({
                section: filterSection || undefined,
                topic: filterTopic || undefined,
                errorType: filterError || undefined,
                search: searchQuery || undefined,
            }) as Question[];
            setQuestions(data);
        } catch (error) {
            console.error('Failed to load questions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        loadQuestions();
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this question?')) return;

        try {
            await questionsApi.delete(id);
            setQuestions((prev) => prev.filter((q) => q.id !== id));
        } catch (error) {
            console.error('Failed to delete:', error);
        }
    };

    const toggleExpand = (id: number) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const filteredTopics = filterSection ? SECTION_TOPICS[filterSection as Section] : [];

    const getErrorEmoji = (errorType?: string) => {
        const error = ERROR_TYPES.find((e) => e.value === errorType);
        return error?.emoji || '❓';
    };

    return (
        <div className="max-w-6xl mx-auto animate-fadeIn">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Questions</h1>
                    <p className="text-gray-400">{questions.length} questions logged</p>
                </div>
                <Link to="/add" className="btn btn-primary">
                    + Add Question
                </Link>
            </div>

            {/* Search & Filters */}
            <div className="card p-4 mb-6">
                <form onSubmit={handleSearch} className="flex gap-3 mb-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            className="input pl-10"
                            placeholder="Search questions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="btn btn-secondary">
                        Search
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowFilters(!showFilters)}
                        className={`btn ${showFilters ? 'btn-primary' : 'btn-ghost'}`}
                    >
                        <Filter className="w-4 h-4" />
                        Filters
                    </button>
                </form>

                {/* Filter Options */}
                {showFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-purple-500/20">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Section</label>
                            <select
                                className="select"
                                value={filterSection}
                                onChange={(e) => {
                                    setFilterSection(e.target.value);
                                    setFilterTopic('');
                                }}
                            >
                                <option value="">All Sections</option>
                                {SECTIONS.map((section) => (
                                    <option key={section} value={section}>
                                        {SECTION_LABELS[section]}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Topic</label>
                            <select
                                className="select"
                                value={filterTopic}
                                onChange={(e) => setFilterTopic(e.target.value)}
                                disabled={!filterSection}
                            >
                                <option value="">All Topics</option>
                                {filteredTopics.map((topic) => (
                                    <option key={topic} value={topic}>{topic}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Error Type</label>
                            <select
                                className="select"
                                value={filterError}
                                onChange={(e) => setFilterError(e.target.value)}
                            >
                                <option value="">All Error Types</option>
                                {ERROR_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.emoji} {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Questions List */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="spinner" />
                </div>
            ) : questions.length === 0 ? (
                <div className="card p-8 text-center">
                    <div className="text-6xl mb-4">📭</div>
                    <h3 className="text-xl font-semibold text-white mb-2">No Questions Found</h3>
                    <p className="text-gray-400 mb-6">
                        {filterSection || filterTopic || filterError || searchQuery
                            ? 'Try adjusting your filters'
                            : 'Add your first wrong question to get started'}
                    </p>
                    {!searchQuery && !filterSection && (
                        <Link to="/add" className="btn btn-primary">
                            Add Question
                        </Link>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {questions.map((question) => (
                        <div key={question.id} className="card card-hover">
                            <div
                                className="flex items-start gap-4 p-4 cursor-pointer"
                                onClick={() => toggleExpand(question.id)}
                            >
                                {/* Section Badge */}
                                <div className={`px-3 py-1 rounded-lg text-xs font-semibold ${getSectionBgColor(question.section)} ${getSectionColor(question.section)}`}>
                                    {question.section}
                                </div>

                                {/* Question Preview */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-medium line-clamp-2">
                                        {question.questionText}
                                    </p>
                                    <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
                                        <span>{question.topic}</span>
                                        {question.subtopic && (
                                            <>
                                                <span>•</span>
                                                <span>{question.subtopic}</span>
                                            </>
                                        )}
                                        {question.errorType && (
                                            <>
                                                <span>•</span>
                                                <span>{getErrorEmoji(question.errorType)} {question.errorType}</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Answers */}
                                <div className="flex items-center gap-4 text-sm">
                                    <div className="text-center">
                                        <p className="text-gray-500 text-xs">Correct</p>
                                        <p className="text-green-400 font-bold text-lg">{question.correctAnswer}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-gray-500 text-xs">Yours</p>
                                        <p className="text-red-400 font-bold text-lg">{question.myWrongAnswer}</p>
                                    </div>
                                </div>

                                {/* Expand Icon */}
                                <div className="text-gray-400">
                                    {expandedId === question.id ? (
                                        <ChevronUp className="w-5 h-5" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5" />
                                    )}
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {expandedId === question.id && (
                                <div className="px-4 pb-4 pt-2 border-t border-purple-500/20 animate-fadeIn">
                                    {/* Full Question Text */}
                                    <div className="mb-4 p-4 rounded-lg bg-surface-light">
                                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                                            {question.questionText}
                                        </p>
                                    </div>

                                    {/* Answer Options */}
                                    <div className="space-y-2 mb-4">
                                        <p className="text-xs text-gray-400 mb-2 font-semibold">Answer Options:</p>
                                        {['A', 'B', 'C', 'D', 'E'].map((letter) => {
                                            const optionKey = `option${letter}` as keyof Question;
                                            const optionText = question[optionKey] as string | undefined;
                                            if (!optionText) return null;

                                            const isCorrect = question.correctAnswer === letter;
                                            const isWrong = question.myWrongAnswer === letter;

                                            return (
                                                <div
                                                    key={letter}
                                                    className={`flex items-start gap-3 p-3 rounded-lg transition-all ${isCorrect
                                                            ? 'bg-green-500/10 border border-green-500/30'
                                                            : isWrong
                                                                ? 'bg-red-500/10 border border-red-500/30'
                                                                : 'bg-surface border border-purple-500/10'
                                                        }`}
                                                >
                                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold ${isCorrect
                                                            ? 'bg-green-500 text-white'
                                                            : isWrong
                                                                ? 'bg-red-500 text-white'
                                                                : 'bg-purple-500/20 text-gray-300'
                                                        }`}>
                                                        {letter}
                                                    </span>
                                                    <span className={`flex-1 text-sm ${isCorrect ? 'text-green-300' : isWrong ? 'text-red-300' : 'text-gray-300'
                                                        }`}>
                                                        {optionText}
                                                    </span>
                                                    {isCorrect && (
                                                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">✓ Correct</span>
                                                    )}
                                                    {isWrong && (
                                                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">✗ Your Answer</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Personal Note */}
                                    {question.personalNote && (
                                        <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                            <p className="text-xs text-amber-400 mb-1 font-semibold">📝 Your Note:</p>
                                            <p className="text-sm text-amber-200">{question.personalNote}</p>
                                        </div>
                                    )}

                                    {/* Metadata & Actions */}
                                    <div className="flex items-center gap-3 pt-3 border-t border-purple-500/10">
                                        <span className="text-xs text-gray-500 bg-surface px-2 py-1 rounded">
                                            {question.difficulty}
                                        </span>
                                        {question.source && (
                                            <span className="text-xs text-gray-500 bg-surface px-2 py-1 rounded">
                                                {question.source}
                                            </span>
                                        )}
                                        {question.gmatClubLink && (
                                            <a
                                                href={question.gmatClubLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-secondary text-xs py-1 px-3"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                GMAT Club
                                            </a>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(question.id);
                                            }}
                                            className="btn btn-ghost text-xs py-1 px-3 text-red-400 hover:text-red-300"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                            Delete
                                        </button>
                                        <span className="ml-auto text-xs text-gray-500">
                                            Added {new Date(question.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
