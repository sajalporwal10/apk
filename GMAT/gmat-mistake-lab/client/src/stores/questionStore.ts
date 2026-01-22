// Question Store - Zustand store for question management
import { create } from 'zustand';
import { questionsApi } from '../services/api';

export interface Question {
    id: number;
    questionText: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    optionE?: string;
    correctAnswer: string;
    myWrongAnswer: string;
    section: string;
    topic: string;
    subtopic?: string;
    errorType?: string;
    difficulty: string;
    source?: string;
    sourceId?: string;
    gmatClubLink?: string;
    personalNote?: string;
    imagePath?: string;
    nextReviewDate?: string;
    intervalDays: number;
    easeFactor: number;
    repetitionCount: number;
    createdAt: string;
    updatedAt: string;
}

interface QuestionFilters {
    section?: string;
    topic?: string;
    errorType?: string;
    search?: string;
}

interface QuestionStore {
    questions: Question[];
    isLoading: boolean;
    error: string | null;
    filters: QuestionFilters;

    // Actions
    fetchQuestions: () => Promise<void>;
    setFilters: (filters: QuestionFilters) => void;
    addQuestion: (data: Partial<Question>) => Promise<Question>;
    updateQuestion: (id: number, data: Partial<Question>) => Promise<Question>;
    deleteQuestion: (id: number) => Promise<void>;
}

export const useQuestionStore = create<QuestionStore>((set, get) => ({
    questions: [],
    isLoading: false,
    error: null,
    filters: {},

    fetchQuestions: async () => {
        set({ isLoading: true, error: null });
        try {
            const questions = await questionsApi.getAll(get().filters) as Question[];
            set({ questions, isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    setFilters: (filters) => {
        set({ filters });
        get().fetchQuestions();
    },

    addQuestion: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const question = await questionsApi.create(data) as Question;
            set((state) => ({
                questions: [question, ...state.questions],
                isLoading: false,
            }));
            return question;
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    updateQuestion: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
            const question = await questionsApi.update(id, data) as Question;
            set((state) => ({
                questions: state.questions.map((q) => (q.id === id ? question : q)),
                isLoading: false,
            }));
            return question;
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    deleteQuestion: async (id) => {
        set({ isLoading: true, error: null });
        try {
            await questionsApi.delete(id);
            set((state) => ({
                questions: state.questions.filter((q) => q.id !== id),
                isLoading: false,
            }));
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },
}));
