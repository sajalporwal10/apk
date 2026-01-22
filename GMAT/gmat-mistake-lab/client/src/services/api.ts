// API Service - HTTP client for backend communication

const API_BASE = '/api';

async function fetchApi<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(data.error || 'API request failed');
    }

    return data.data;
}

// Questions API
export const questionsApi = {
    getAll: (filters?: { section?: string; topic?: string; errorType?: string; search?: string }) => {
        const params = new URLSearchParams();
        if (filters?.section) params.set('section', filters.section);
        if (filters?.topic) params.set('topic', filters.topic);
        if (filters?.errorType) params.set('errorType', filters.errorType);
        if (filters?.search) params.set('search', filters.search);
        const query = params.toString();
        return fetchApi(`/questions${query ? `?${query}` : ''}`);
    },

    getById: (id: number) => fetchApi(`/questions/${id}`),

    create: (data: any) =>
        fetchApi('/questions', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id: number, data: any) =>
        fetchApi(`/questions/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    delete: (id: number) =>
        fetchApi(`/questions/${id}`, {
            method: 'DELETE',
        }),

    import: (questions: any[]) =>
        fetchApi('/questions/import', {
            method: 'POST',
            body: JSON.stringify({ questions }),
        }),

    getStats: () => fetchApi('/questions/stats'),
};

// Practice API
export const practiceApi = {
    start: (mode: string, sectionFilter?: string, topicFilter?: string) =>
        fetchApi('/practice/start', {
            method: 'POST',
            body: JSON.stringify({ mode, sectionFilter, topicFilter }),
        }),

    getSession: (sessionId: number) => fetchApi(`/practice/${sessionId}`),

    submitAttempt: (
        sessionId: number,
        questionId: number,
        selectedAnswer: string,
        confidence: number,
        timeSpentSeconds: number
    ) =>
        fetchApi(`/practice/${sessionId}/attempt`, {
            method: 'POST',
            body: JSON.stringify({ questionId, selectedAnswer, confidence, timeSpentSeconds }),
        }),

    complete: (sessionId: number, timeSpentSeconds: number) =>
        fetchApi(`/practice/${sessionId}/complete`, {
            method: 'POST',
            body: JSON.stringify({ timeSpentSeconds }),
        }),

    getHistory: (limit?: number) => {
        const query = limit ? `?limit=${limit}` : '';
        return fetchApi(`/practice/history${query}`);
    },
};

// Analytics API
export const analyticsApi = {
    getOverview: () => fetchApi('/analytics/overview'),
    getTopics: () => fetchApi('/analytics/topics'),
    getWeakest: (limit?: number) => fetchApi(`/analytics/weakest${limit ? `?limit=${limit}` : ''}`),
    getTrends: (weeks?: number) => fetchApi(`/analytics/trends${weeks ? `?weeks=${weeks}` : ''}`),
    getMastery: () => fetchApi('/analytics/mastery'),
    getRepeatMistakes: (limit?: number) => fetchApi(`/analytics/repeat-mistakes${limit ? `?limit=${limit}` : ''}`),
    getGamification: () => fetchApi('/analytics/gamification'),
    getAchievements: () => fetchApi('/analytics/achievements'),
};

// Search API
export const searchApi = {
    searchGmatClub: (questionText: string) =>
        fetchApi('/search/gmatclub', {
            method: 'POST',
            body: JSON.stringify({ questionText }),
        }),
};
