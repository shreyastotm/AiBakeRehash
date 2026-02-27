import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserPreferences {
  unit_system: 'metric' | 'cups' | 'hybrid' | 'bakers_percent'
  temperature_unit: 'celsius' | 'fahrenheit'
  language: 'en' | 'hi'
  currency: string
  date_format: string
  theme: 'light' | 'dark' | 'auto'
  notifications_enabled: boolean
  auto_save_enabled: boolean
  [key: string]: any
}

interface PreferencesStore {
  preferences: UserPreferences
  setPreferences: (preferences: Partial<UserPreferences>) => void
  resetPreferences: () => void
}

const defaultPreferences: UserPreferences = {
  unit_system: 'metric',
  temperature_unit: 'celsius',
  language: 'en',
  currency: 'INR',
  date_format: 'DD/MM/YYYY',
  theme: 'light',
  notifications_enabled: true,
  auto_save_enabled: true,
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      preferences: defaultPreferences,
      setPreferences: (updates) =>
        set((state) => ({
          preferences: { ...state.preferences, ...updates },
        })),
      resetPreferences: () => set({ preferences: defaultPreferences }),
    }),
    {
      name: 'aibake-preferences',
      version: 1,
      // Sync across tabs
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Listen for storage changes from other tabs
          window.addEventListener('storage', (e) => {
            if (e.key === 'aibake-preferences') {
              const newState = JSON.parse(e.newValue || '{}')
              state.preferences = newState.state?.preferences || defaultPreferences
            }
          })
        }
      },
    }
  )
)
