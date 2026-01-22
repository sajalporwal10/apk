// Practice Page - Select practice mode and start session
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Clock, Zap, Shuffle, Filter, Loader2 } from 'lucide-react';
import { practiceApi } from '../services/api';
import {
    SECTIONS,
    SECTION_LABELS,
    SECTION_TOPICS,
    PRACTICE_MODES,
    getSectionColor,
    type Section
} from '../utils/taxonomy';

export default function Practice() {
    const navigate = useNavigate();
    const [isStarting, setIsStarting] = useState(false);
    const [selectedMode, setSelectedMode] = useState('10q_25m');
    const [sectionFilter, setSectionFilter] = useState('');
    const [topicFilter, setTopicFilter] = useState('');

    const handleStart = async () => {
        setIsStarting(true);
        try {
            const result = await practiceApi.start(
                selectedMode,
                sectionFilter || undefined,
                topicFilter || undefined
            ) as { session: { id: number }; questions: any[] };

            navigate(`/practice/${result.session.id}`, {
                state: { questions: result.questions, session: result.session },
            });
        } catch (error: any) {
            alert(error.message || 'Failed to start practice session');
        } finally {
            setIsStarting(false);
        }
    };

    const filteredTopics = sectionFilter ? SECTION_TOPICS[sectionFilter as Section] : [];
    const selectedModeConfig = PRACTICE_MODES.find((m) => m.value === selectedMode);

    return (
        <div className="max-w-4xl mx-auto animate-fadeIn">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Practice</h1>
                <p className="text-gray-400">Retry your wrong questions in a timed session</p>
            </div>

            {/* Practice Mode Selection */}
            <div className="card p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-400" />
                    Select Practice Mode
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {PRACTICE_MODES.map((mode) => (
                        <button
                            key={mode.value}
                            onClick={() => setSelectedMode(mode.value)}
                            className={`p-4 rounded-xl border-2 transition-all text-left ${selectedMode === mode.value
                                    ? 'border-purple-500 bg-purple-500/10'
                                    : 'border-purple-500/20 hover:border-purple-500/40'
                                }`}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                {mode.mixed ? (
                                    <Shuffle className="w-5 h-5 text-amber-400" />
                                ) : (
                                    <Zap className="w-5 h-5 text-cyan-400" />
                                )}
                                <span className="font-semibold text-white">{mode.label}</span>
                            </div>
                            <p className="text-sm text-gray-400">
                                {mode.questions} questions in {mode.minutes} minutes
                                {mode.mixed && ' (all sections)'}
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Filters (not for mixed mode) */}
            {selectedMode !== '20q_mixed' && (
                <div className="card p-6 mb-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Filter className="w-5 h-5 text-purple-400" />
                        Filter Questions (Optional)
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Section</label>
                            <select
                                className="select"
                                value={sectionFilter}
                                onChange={(e) => {
                                    setSectionFilter(e.target.value);
                                    setTopicFilter('');
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
                                value={topicFilter}
                                onChange={(e) => setTopicFilter(e.target.value)}
                                disabled={!sectionFilter}
                            >
                                <option value="">All Topics</option>
                                {filteredTopics.map((topic) => (
                                    <option key={topic} value={topic}>{topic}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {sectionFilter && (
                        <div className="mt-4 flex items-center gap-2">
                            <span className={`text-sm ${getSectionColor(sectionFilter as Section)}`}>
                                Practicing: {SECTION_LABELS[sectionFilter as Section]}
                                {topicFilter && ` → ${topicFilter}`}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Session Preview */}
            <div className="card p-6 mb-6 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border-purple-500/30">
                <h3 className="text-lg font-semibold text-white mb-4">Session Preview</h3>

                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-3xl font-bold text-purple-400">
                            {selectedModeConfig?.questions}
                        </p>
                        <p className="text-sm text-gray-400">Questions</p>
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-cyan-400">
                            {selectedModeConfig?.minutes}
                        </p>
                        <p className="text-sm text-gray-400">Minutes</p>
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-amber-400">
                            {Math.round((selectedModeConfig?.minutes || 1) * 60 / (selectedModeConfig?.questions || 1))}s
                        </p>
                        <p className="text-sm text-gray-400">Per Question</p>
                    </div>
                </div>
            </div>

            {/* Start Button */}
            <button
                onClick={handleStart}
                disabled={isStarting}
                className="btn btn-success w-full py-4 text-lg"
            >
                {isStarting ? (
                    <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Starting Session...
                    </>
                ) : (
                    <>
                        <PlayCircle className="w-6 h-6" />
                        Start Practice Session
                    </>
                )}
            </button>

            {/* Tips */}
            <div className="mt-8 p-4 rounded-lg bg-surface-light">
                <h4 className="font-semibold text-white mb-2">💡 Practice Tips</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Questions are prioritized by spaced repetition (due for review first)</li>
                    <li>• Mark your confidence level to improve the algorithm</li>
                    <li>• Try to beat your previous time while maintaining accuracy</li>
                    <li>• Focus on understanding, not just getting the right answer</li>
                </ul>
            </div>
        </div>
    );
}
