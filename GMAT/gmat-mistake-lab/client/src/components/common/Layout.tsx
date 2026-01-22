// Layout Component - Main app shell with navigation
import { Outlet, NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    PlusCircle,
    ListTodo,
    PlayCircle,
    BarChart3,
    Flame,
    Sparkles,
    Upload
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { analyticsApi } from '../../services/api';

interface UserStats {
    totalXp: number;
    currentStreak: number;
    level: number;
}

export default function Layout() {
    const [stats, setStats] = useState<UserStats | null>(null);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const data = await analyticsApi.getGamification() as UserStats;
            setStats(data);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    const navItems = [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/add', icon: PlusCircle, label: 'Add Question' },
        { to: '/import', icon: Upload, label: 'Import' },
        { to: '/questions', icon: ListTodo, label: 'Questions' },
        { to: '/practice', icon: PlayCircle, label: 'Practice' },
        { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    ];

    return (
        <div className="min-h-screen flex">
            {/* Sidebar */}
            <aside className="w-64 glass border-r border-purple-500/20 p-4 flex flex-col">
                {/* Logo */}
                <div className="mb-8 px-2">
                    <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
                        <Sparkles className="w-6 h-6" />
                        GMAT Lab
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Turn mistakes into mastery</p>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/'}
                            className={({ isActive }) =>
                                `nav-link ${isActive ? 'active' : ''}`
                            }
                        >
                            <item.icon className="w-5 h-5" />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Stats Footer */}
                {stats && (
                    <div className="mt-auto pt-4 border-t border-purple-500/20">
                        <div className="card p-3 space-y-3">
                            {/* XP & Level */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-sm font-bold">
                                        {stats.level}
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Level</p>
                                        <p className="text-sm font-semibold text-white">{stats.totalXp.toLocaleString()} XP</p>
                                    </div>
                                </div>
                            </div>

                            {/* Streak */}
                            <div className="flex items-center gap-2">
                                <Flame className={`w-5 h-5 ${stats.currentStreak > 0 ? 'text-orange-400 streak-fire' : 'text-gray-500'}`} />
                                <span className="text-sm">
                                    <span className="font-bold text-white">{stats.currentStreak}</span>
                                    <span className="text-gray-400"> day streak</span>
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 overflow-y-auto">
                <Outlet context={{ refreshStats: loadStats }} />
            </main>
        </div>
    );
}
