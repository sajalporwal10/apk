// Dashboard Page - Overview and quick actions
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    PlusCircle,
    PlayCircle,
    Target,
    TrendingUp,
    Clock,
    Flame,
    Award,
    AlertTriangle
} from 'lucide-react';
import { analyticsApi } from '../services/api';

interface OverviewStats {
    totalQuestions: number;
    totalPracticeSessions: number;
    totalAttempts: number;
    overallAccuracy: number;
    averageTimePerQuestion: number;
    currentStreak: number;
    totalXp: number;
    level: number;
}

interface WeakTopic {
    section: string;
    topic: string;
    accuracy: number;
    practiced: number;
}

export default function Dashboard() {
    const [stats, setStats] = useState<OverviewStats | null>(null);
    const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            const [overview, weak] = await Promise.all([
                analyticsApi.getOverview() as Promise<OverviewStats>,
                analyticsApi.getWeakest(3) as Promise<WeakTopic[]>,
            ]);
            setStats(overview);
            setWeakTopics(weak);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
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

    return (
        <div className="max-w-6xl mx-auto animate-fadeIn">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
                <p className="text-gray-400">Your GMAT improvement at a glance</p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <Link to="/add" className="card card-hover p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                        <PlusCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Add Question</h3>
                        <p className="text-sm text-gray-400">Log a new mistake to learn from</p>
                    </div>
                </Link>

                <Link to="/practice" className="card card-hover p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
                        <PlayCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Start Practice</h3>
                        <p className="text-sm text-gray-400">Retry your wrong questions</p>
                    </div>
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="card p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <Target className="w-5 h-5 text-purple-400" />
                        <span className="text-sm text-gray-400">Questions</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{stats?.totalQuestions || 0}</p>
                </div>

                <div className="card p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className="w-5 h-5 text-cyan-400" />
                        <span className="text-sm text-gray-400">Accuracy</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{stats?.overallAccuracy || 0}%</p>
                </div>

                <div className="card p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <Clock className="w-5 h-5 text-amber-400" />
                        <span className="text-sm text-gray-400">Avg Time</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{stats?.averageTimePerQuestion || 0}s</p>
                </div>

                <div className="card p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <Flame className={`w-5 h-5 ${(stats?.currentStreak || 0) > 0 ? 'text-orange-400' : 'text-gray-500'}`} />
                        <span className="text-sm text-gray-400">Streak</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{stats?.currentStreak || 0} days</p>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* XP Progress */}
                <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Award className="w-5 h-5 text-purple-400" />
                            Your Progress
                        </h3>
                        <span className="badge badge-primary">Level {stats?.level || 1}</span>
                    </div>

                    <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-400">Total XP</span>
                            <span className="text-white font-semibold">{stats?.totalXp?.toLocaleString() || 0}</span>
                        </div>
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${((stats?.totalXp || 0) % 1000) / 10}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {1000 - ((stats?.totalXp || 0) % 1000)} XP to next level
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="p-3 rounded-lg bg-purple-500/10">
                            <p className="text-2xl font-bold text-purple-400">{stats?.totalPracticeSessions || 0}</p>
                            <p className="text-xs text-gray-400">Sessions</p>
                        </div>
                        <div className="p-3 rounded-lg bg-cyan-500/10">
                            <p className="text-2xl font-bold text-cyan-400">{stats?.totalAttempts || 0}</p>
                            <p className="text-xs text-gray-400">Attempts</p>
                        </div>
                    </div>
                </div>

                {/* Weak Topics */}
                <div className="card p-6">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                        Focus Areas
                    </h3>

                    {weakTopics.length > 0 ? (
                        <div className="space-y-3">
                            {weakTopics.map((topic, index) => (
                                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-surface-light">
                                    <div>
                                        <p className="font-medium text-white">{topic.topic}</p>
                                        <p className="text-xs text-gray-400">{topic.section} • {topic.practiced} practiced</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold ${topic.accuracy < 50 ? 'text-red-400' : 'text-amber-400'}`}>
                                            {topic.accuracy}%
                                        </p>
                                        <p className="text-xs text-gray-500">accuracy</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400">
                            <p>No weak topics yet</p>
                            <p className="text-sm mt-1">Add questions and practice to see insights</p>
                        </div>
                    )}

                    {weakTopics.length > 0 && (
                        <Link to="/practice" className="btn btn-secondary w-full mt-4">
                            Practice Weak Areas
                        </Link>
                    )}
                </div>
            </div>

            {/* Empty State */}
            {stats?.totalQuestions === 0 && (
                <div className="card p-8 text-center mt-8">
                    <div className="text-6xl mb-4">📝</div>
                    <h3 className="text-xl font-semibold text-white mb-2">Start Your GMAT Lab</h3>
                    <p className="text-gray-400 mb-6">
                        Add your first wrong question to begin turning mistakes into mastery.
                    </p>
                    <Link to="/add" className="btn btn-primary">
                        <PlusCircle className="w-5 h-5" />
                        Add Your First Question
                    </Link>
                </div>
            )}
        </div>
    );
}
