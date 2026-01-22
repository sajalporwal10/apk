// Analytics Page - Dashboard with insights and charts
import { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { TrendingUp, Target, Award, AlertTriangle, Trophy, Lock } from 'lucide-react';
import { analyticsApi } from '../services/api';
import { getMasteryColor, SECTION_LABELS } from '../utils/taxonomy';

interface TopicStats {
    section: string;
    topic: string;
    totalQuestions: number;
    practiced: number;
    correct: number;
    accuracy: number;
    masteryLevel: string;
}

interface WeeklyTrend {
    week: string;
    questionsAdded: number;
    questionsPracticed: number;
    accuracy: number;
}

interface Achievement {
    id: number;
    code: string;
    name: string;
    description?: string;
    icon?: string;
    xpReward: number;
    unlockedAt?: string;
}

interface RepeatMistake {
    questionId: number;
    wrongCount: number;
    question: string;
}

const COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ef4444'];

export default function Analytics() {
    const [topicStats, setTopicStats] = useState<TopicStats[]>([]);
    const [trends, setTrends] = useState<WeeklyTrend[]>([]);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [repeatMistakes, setRepeatMistakes] = useState<RepeatMistake[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            const [topics, weekly, ach, mistakes] = await Promise.all([
                analyticsApi.getTopics() as Promise<TopicStats[]>,
                analyticsApi.getTrends() as Promise<WeeklyTrend[]>,
                analyticsApi.getAchievements() as Promise<Achievement[]>,
                analyticsApi.getRepeatMistakes() as Promise<RepeatMistake[]>,
            ]);

            setTopicStats(topics);
            setTrends(weekly);
            setAchievements(ach);
            setRepeatMistakes(mistakes);
        } catch (error) {
            console.error('Failed to load analytics:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner" />
            </div>
        );
    }

    // Prepare section distribution data
    const sectionData = ['Quant', 'Verbal', 'DataInsights'].map((section) => {
        const sectionTopics = topicStats.filter((t) => t.section === section);
        return {
            name: section,
            fullName: SECTION_LABELS[section as keyof typeof SECTION_LABELS],
            questions: sectionTopics.reduce((sum, t) => sum + t.totalQuestions, 0),
            practiced: sectionTopics.reduce((sum, t) => sum + t.practiced, 0),
        };
    });

    // Topics sorted by accuracy (worst first)
    const topicsByAccuracy = [...topicStats]
        .filter((t) => t.practiced > 0)
        .sort((a, b) => a.accuracy - b.accuracy);

    const unlockedAchievements = achievements.filter((a) => a.unlockedAt);
    const lockedAchievements = achievements.filter((a) => !a.unlockedAt);

    return (
        <div className="max-w-6xl mx-auto animate-fadeIn">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
                <p className="text-gray-400">Track your progress and identify weak areas</p>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Section Distribution */}
                <div className="card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Target className="w-5 h-5 text-purple-400" />
                        Questions by Section
                    </h3>

                    {sectionData.some((s) => s.questions > 0) ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={sectionData.filter((s) => s.questions > 0)}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="questions"
                                    nameKey="name"
                                    label={({ name, questions }) => `${name}: ${questions}`}
                                >
                                    {sectionData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1a1025',
                                        border: '1px solid #8b5cf6',
                                        borderRadius: '8px'
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[250px] flex items-center justify-center text-gray-400">
                            No questions logged yet
                        </div>
                    )}
                </div>

                {/* Weekly Trends */}
                <div className="card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-cyan-400" />
                        Weekly Activity
                    </h3>

                    {trends.some((t) => t.questionsPracticed > 0 || t.questionsAdded > 0) ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={trends}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis
                                    dataKey="week"
                                    tickFormatter={(value) => value.slice(5)}
                                    stroke="#666"
                                />
                                <YAxis stroke="#666" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1a1025',
                                        border: '1px solid #8b5cf6',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="questionsPracticed"
                                    stroke="#06b6d4"
                                    strokeWidth={2}
                                    name="Practiced"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="accuracy"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    name="Accuracy %"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[250px] flex items-center justify-center text-gray-400">
                            Start practicing to see trends
                        </div>
                    )}
                </div>
            </div>

            {/* Topic Mastery */}
            <div className="card p-6 mb-8">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    Topic Mastery
                </h3>

                {topicStats.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {topicStats.map((topic, index) => (
                            <div
                                key={index}
                                className="p-4 rounded-xl bg-surface-light flex items-center justify-between"
                            >
                                <div>
                                    <p className="font-medium text-white">{topic.topic}</p>
                                    <p className="text-xs text-gray-400">{topic.section}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-gray-500">{topic.totalQuestions} questions</span>
                                        <span className="text-xs text-gray-500">•</span>
                                        <span className="text-xs text-gray-500">{topic.practiced} practiced</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-sm font-semibold ${getMasteryColor(topic.masteryLevel)}`}>
                                        {topic.masteryLevel}
                                    </p>
                                    {topic.practiced > 0 && (
                                        <p className={`text-lg font-bold ${topic.accuracy >= 70 ? 'text-green-400' :
                                                topic.accuracy >= 50 ? 'text-amber-400' : 'text-red-400'
                                            }`}>
                                            {topic.accuracy}%
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-400">
                        Add questions to see topic breakdown
                    </div>
                )}
            </div>

            {/* Two Column: Achievements + Repeat Mistakes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Achievements */}
                <div className="card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-400" />
                        Achievements ({unlockedAchievements.length}/{achievements.length})
                    </h3>

                    <div className="space-y-3">
                        {unlockedAchievements.map((ach) => (
                            <div key={ach.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-light">
                                <span className="text-2xl">{ach.icon}</span>
                                <div className="flex-1">
                                    <p className="font-medium text-white">{ach.name}</p>
                                    <p className="text-xs text-gray-400">{ach.description}</p>
                                </div>
                                <span className="badge badge-success">+{ach.xpReward} XP</span>
                            </div>
                        ))}

                        {lockedAchievements.slice(0, 3).map((ach) => (
                            <div key={ach.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-light opacity-50">
                                <Lock className="w-6 h-6 text-gray-500" />
                                <div className="flex-1">
                                    <p className="font-medium text-gray-400">{ach.name}</p>
                                    <p className="text-xs text-gray-500">{ach.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Repeat Mistakes */}
                <div className="card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        Repeat Mistakes
                    </h3>

                    {repeatMistakes.length > 0 ? (
                        <div className="space-y-3">
                            {repeatMistakes.map((mistake, index) => (
                                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-surface-light">
                                    <span className="badge badge-error">{mistake.wrongCount}x</span>
                                    <p className="text-sm text-gray-200 flex-1">{mistake.question}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400">
                            <p>No repeat mistakes yet</p>
                            <p className="text-sm mt-1">Questions you get wrong multiple times will appear here</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Accuracy by Topic Bar Chart */}
            {topicsByAccuracy.length > 0 && (
                <div className="card p-6 mt-6">
                    <h3 className="text-lg font-semibold text-white mb-4">
                        Accuracy by Topic (Weakest First)
                    </h3>

                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={topicsByAccuracy.slice(0, 8)} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis type="number" domain={[0, 100]} stroke="#666" />
                            <YAxis type="category" dataKey="topic" width={150} stroke="#666" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1a1025',
                                    border: '1px solid #8b5cf6',
                                    borderRadius: '8px'
                                }}
                            />
                            <Bar
                                dataKey="accuracy"
                                fill="#8b5cf6"
                                radius={[0, 4, 4, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
