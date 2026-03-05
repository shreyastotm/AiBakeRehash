import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { JournalEntryWithAudio } from '../services/journal.service';

interface JournalStore {
    entries: JournalEntryWithAudio[];
    selectedEntry: JournalEntryWithAudio | null;
    isLoading: boolean;
    error: string | null;
    setEntries: (entries: JournalEntryWithAudio[]) => void;
    setSelectedEntry: (entry: JournalEntryWithAudio | null) => void;
    addEntry: (entry: JournalEntryWithAudio) => void;
    updateEntry: (id: string, updates: Partial<JournalEntryWithAudio>) => void;
    removeEntry: (id: string) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}

export const useJournalStore = create<JournalStore>()(
    persist(
        (set) => ({
            entries: [],
            selectedEntry: null,
            isLoading: false,
            error: null,
            setEntries: (entries) => set({ entries }),
            setSelectedEntry: (entry) => set({ selectedEntry: entry }),
            addEntry: (entry) =>
                set((state) => ({
                    entries: [entry, ...state.entries],
                })),
            updateEntry: (id, updates) =>
                set((state) => ({
                    entries: state.entries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
                    selectedEntry:
                        state.selectedEntry?.id === id
                            ? { ...state.selectedEntry, ...updates }
                            : state.selectedEntry,
                })),
            removeEntry: (id) =>
                set((state) => ({
                    entries: state.entries.filter((e) => e.id !== id),
                    selectedEntry: state.selectedEntry?.id === id ? null : state.selectedEntry,
                })),
            setLoading: (loading) => set({ isLoading: loading }),
            setError: (error) => set({ error }),
        }),
        {
            name: 'aibake-journal',
            version: 1,
            partialize: (state) => ({
                entries: state.entries,
                selectedEntry: state.selectedEntry,
            }),
            // Sync across tabs
            onRehydrateStorage: () => (state) => {
                if (state) {
                    window.addEventListener('storage', (e) => {
                        if (e.key === 'aibake-journal') {
                            const newState = JSON.parse(e.newValue || '{}');
                            if (newState.state) {
                                state.entries = newState.state.entries || [];
                                state.selectedEntry = newState.state.selectedEntry || null;
                            }
                        }
                    });
                }
            },
        }
    )
);
