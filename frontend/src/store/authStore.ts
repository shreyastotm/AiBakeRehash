import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  display_name: string
}

interface AuthStore {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
  setUser: (user: User) => void
  setToken: (token: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,
      setUser: (user) => set({ user }),
      setToken: (token) => {
        set({ token })
        // Sync token across tabs
        localStorage.setItem('auth_token', token)
      },
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      clearAuth: () => {
        set({ user: null, token: null, error: null })
        localStorage.removeItem('auth_token')
      },
    }),
    {
      name: 'aibake-auth',
      version: 1,
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
      // Listen for auth changes from other tabs
      onRehydrateStorage: () => (state) => {
        if (state) {
          window.addEventListener('storage', (e) => {
            if (e.key === 'aibake-auth') {
              const newState = JSON.parse(e.newValue || '{}')
              state.user = newState.state?.user || null
              state.token = newState.state?.token || null
            }
          })
        }
      },
    }
  )
)
