// Practice Session Page - Active practice with timer
import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Clock, ChevronRight, Check, X, ExternalLink, Flag } from 'lucide-react';
import { practiceApi } from '../services/api';

interface Question {
    id: number;
    questionText: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    optionE?: string;
    correctAnswer: string;
    section: string;
    topic: string;
    personalNote?: string;
    gmatClubLink?: string;
}

interface SessionState {
    id: number;
    mode: string;
    totalQuestions: number;
    timeLimitSeconds: number;
}

type Confidence = 1 | 2 | 3;

export default function PracticeSession() {
    const { sessionId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [questions, setQuestions] = useState<Question[]>([]);
    const [session, setSession] = useState<SessionState | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [confidence, setConfidence] = useState<Confidence>(2);
    const [isAnswered, setIsAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [questionStartTime, setQuestionStartTime] = useState(Date.now());
    const [results, setResults] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 });
    const [isComplete, setIsComplete] = useState(false);
    const [sessionTimeSpent, setSessionTimeSpent] = useState(0);

    // Initialize from navigation state
    useEffect(() => {
        const state = location.state as { questions: Question[]; session: SessionState } | null;
        if (state) {
            setQuestions(state.questions);
            setSession(state.session);
            setTimeRemaining(state.session.timeLimitSeconds);
        } else {
            // If no state, redirect back to practice
            navigate('/practice');
        }
    }, [location.state, navigate]);

    // Timer
    useEffect(() => {
        if (!session || isComplete || timeRemaining <= 0) return;

        const interval = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 1) {
                    handleTimeUp();
                    return 0;
                }
                return prev - 1;
            });
            setSessionTimeSpent((prev) => prev + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [session, isComplete, timeRemaining]);

    const handleTimeUp = useCallback(async () => {
        if (!session) return;

        try {
            await practiceApi.complete(session.id, sessionTimeSpent);
            setIsComplete(true);
        } catch (error) {
            console.error('Failed to complete session:', error);
        }
    }, [session, sessionTimeSpent]);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getTimerClass = (): string => {
        if (!session) return 'timer';
        const pct = timeRemaining / session.timeLimitSeconds;
        if (pct < 0.1) return 'timer critical';
        if (pct < 0.25) return 'timer warning';
        return 'timer';
    };

    const handleSelectAnswer = (letter: string) => {
        if (isAnswered) return;
        setSelectedAnswer(letter);
    };

    const handleSubmitAnswer = async () => {
        if (!selectedAnswer || !session || isAnswered) return;

        const currentQuestion = questions[currentIndex];
        const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
        const correct = selectedAnswer === currentQuestion.correctAnswer;

        try {
            await practiceApi.submitAttempt(
                session.id,
                currentQuestion.id,
                selectedAnswer,
                confidence,
                timeSpent
            );

            setIsAnswered(true);
            setIsCorrect(correct);
            setResults((prev) => ({
                correct: prev.correct + (correct ? 1 : 0),
                total: prev.total + 1,
            }));
        } catch (error) {
            console.error('Failed to submit answer:', error);
        }
    };

    const handleNextQuestion = async () => {
        if (currentIndex >= questions.length - 1) {
            // Session complete
            try {
                await practiceApi.complete(session!.id, sessionTimeSpent);
                setIsComplete(true);
            } catch (error) {
                console.error('Failed to complete session:', error);
            }
        } else {
            setCurrentIndex((prev) => prev + 1);
            setSelectedAnswer(null);
            setConfidence(2);
            setIsAnswered(false);
            setQuestionStartTime(Date.now());
        }
    };

    const handleEndEarly = async () => {
        if (!confirm('Are you sure you want to end this session early?')) return;

        try {
            await practiceApi.complete(session!.id, sessionTimeSpent);
            setIsComplete(true);
        } catch (error) {
            console.error('Failed to complete session:', error);
        }
    };

    // Session Complete View
    if (isComplete) {
        const accuracy = results.total > 0 ? Math.round((results.correct / results.total) * 100) : 0;

        return (
            <div className="max-w-2xl mx-auto animate-fadeIn">
                <div className="card p-8 text-center">
                    <div className="text-6xl mb-4">
                        {accuracy >= 80 ? '🎉' : accuracy >= 60 ? '👍' : '💪'}
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Session Complete!</h1>
                    <p className="text-gray-400 mb-6">
                        You answered {results.total} question{results.total !== 1 ? 's' : ''}
                    </p>

                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="p-4 rounded-xl bg-surface-light">
                            <p className="text-3xl font-bold text-green-400">{results.correct}</p>
                            <p className="text-sm text-gray-400">Correct</p>
                        </div>
                        <div className="p-4 rounded-xl bg-surface-light">
                            <p className="text-3xl font-bold text-red-400">{results.total - results.correct}</p>
                            <p className="text-sm text-gray-400">Wrong</p>
                        </div>
                        <div className="p-4 rounded-xl bg-surface-light">
                            <p className={`text-3xl font-bold ${accuracy >= 70 ? 'text-green-400' : accuracy >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                                {accuracy}%
                            </p>
                            <p className="text-sm text-gray-400">Accuracy</p>
                        </div>
                    </div>

                    <div className="text-sm text-gray-400 mb-6">
                        Time spent: {formatTime(sessionTimeSpent)}
                    </div>

                    <div className="flex gap-4 justify-center">
                        <button onClick={() => navigate('/practice')} className="btn btn-secondary">
                            Practice Again
                        </button>
                        <button onClick={() => navigate('/analytics')} className="btn btn-primary">
                            View Analytics
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Loading state
    if (!session || questions.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner" />
            </div>
        );
    }

    const currentQuestion = questions[currentIndex];
    const options = ['A', 'B', 'C', 'D', 'E'].filter(
        (letter) => currentQuestion[`option${letter}` as keyof Question]
    );

    return (
        <div className="max-w-4xl mx-auto animate-fadeIn">
            {/* Header with Timer */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <span className="badge badge-primary">
                        {currentIndex + 1} / {questions.length}
                    </span>
                    <span className="badge badge-info">{currentQuestion.section}</span>
                    <span className="text-sm text-gray-400">{currentQuestion.topic}</span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-purple-400" />
                        <span className={getTimerClass()}>{formatTime(timeRemaining)}</span>
                    </div>
                    <button onClick={handleEndEarly} className="btn btn-ghost text-sm py-2">
                        <Flag className="w-4 h-4" />
                        End
                    </button>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="progress-bar mb-6">
                <div
                    className="progress-fill"
                    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
            </div>

            {/* Question */}
            <div className="card p-6 mb-6">
                <p className="text-lg text-white leading-relaxed whitespace-pre-wrap">
                    {currentQuestion.questionText}
                </p>
            </div>

            {/* Answer Options */}
            <div className="space-y-3 mb-6">
                {options.map((letter) => {
                    const optionText = currentQuestion[`option${letter}` as keyof Question] as string;
                    const isSelected = selectedAnswer === letter;
                    const isCorrectAnswer = letter === currentQuestion.correctAnswer;

                    let optionClass = 'answer-option';
                    if (isAnswered) {
                        if (isCorrectAnswer) {
                            optionClass += ' correct';
                        } else if (isSelected && !isCorrect) {
                            optionClass += ' incorrect';
                        }
                    } else if (isSelected) {
                        optionClass += ' selected';
                    }

                    return (
                        <button
                            key={letter}
                            onClick={() => handleSelectAnswer(letter)}
                            disabled={isAnswered}
                            className={optionClass}
                        >
                            <div className="answer-letter">
                                {isAnswered ? (
                                    isCorrectAnswer ? (
                                        <Check className="w-4 h-4 text-green-400" />
                                    ) : isSelected ? (
                                        <X className="w-4 h-4 text-red-400" />
                                    ) : (
                                        letter
                                    )
                                ) : (
                                    letter
                                )}
                            </div>
                            <span className="flex-1">{optionText}</span>
                        </button>
                    );
                })}
            </div>

            {/* Confidence Selection (before answering) */}
            {!isAnswered && selectedAnswer && (
                <div className="card p-4 mb-6">
                    <p className="text-sm text-gray-400 mb-3">How confident are you?</p>
                    <div className="flex gap-3">
                        {[
                            { value: 1, label: 'Guess', emoji: '🤷' },
                            { value: 2, label: 'Unsure', emoji: '🤔' },
                            { value: 3, label: 'Confident', emoji: '😎' },
                        ].map((conf) => (
                            <button
                                key={conf.value}
                                onClick={() => setConfidence(conf.value as Confidence)}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm transition-all ${confidence === conf.value
                                        ? 'bg-purple-500/30 border-purple-500'
                                        : 'bg-surface-light border-transparent'
                                    } border`}
                            >
                                {conf.emoji} {conf.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Submit / Next Button */}
            {!isAnswered ? (
                <button
                    onClick={handleSubmitAnswer}
                    disabled={!selectedAnswer}
                    className="btn btn-primary w-full py-4"
                >
                    Submit Answer
                </button>
            ) : (
                <div className="space-y-4">
                    {/* Feedback */}
                    <div className={`p-4 rounded-xl ${isCorrect ? 'bg-green-500/20 border border-green-500/40' : 'bg-red-500/20 border border-red-500/40'}`}>
                        <div className="flex items-center gap-3">
                            {isCorrect ? (
                                <Check className="w-6 h-6 text-green-400" />
                            ) : (
                                <X className="w-6 h-6 text-red-400" />
                            )}
                            <span className={`font-semibold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                                {isCorrect ? 'Correct! +25 XP' : `Wrong. The answer was ${currentQuestion.correctAnswer}`}
                            </span>
                        </div>

                        {currentQuestion.personalNote && (
                            <div className="mt-3 pt-3 border-t border-white/10">
                                <p className="text-xs text-gray-400 mb-1">Your note:</p>
                                <p className="text-sm text-gray-200">{currentQuestion.personalNote}</p>
                            </div>
                        )}
                    </div>

                    {currentQuestion.gmatClubLink && (
                        <a
                            href={currentQuestion.gmatClubLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary w-full"
                        >
                            <ExternalLink className="w-4 h-4" />
                            View Discussion
                        </a>
                    )}

                    <button onClick={handleNextQuestion} className="btn btn-primary w-full py-4">
                        {currentIndex >= questions.length - 1 ? 'Finish Session' : 'Next Question'}
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
}
