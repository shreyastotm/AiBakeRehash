import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { storeToken, clearToken, TOKEN_KEY } from '../services/api'

export interface User {
  id: string
  email: string
  display_name: string
}

interface AuthStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  // Actions
  login: (token: string, user: User) => void
  logout: () => void
  setToken: (token: string) => void
  setUser: (user: User) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  /** @deprecated Use logout() instead */
  clearAuth: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: (token, user) => {
        storeToken(token)
        set({ token, user, isAuthenticated: true, error: null })
      },

      logout: () => {
        clearToken()
        set({ user: null, token: null, isAuthenticated: false, error: null })
      },

      setToken: (token) => {
        storeToken(token)
        set({ token, isAuthenticated: true })
      },

      setUser: (user) => set({ user }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      clearAuth: () => {
        clearToken()
        set({ user: null, token: null, isAuthenticated: false, error: null })
      },
    }),
    {
      name: 'aibake-auth',
      version: 1,
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Validate stored token is still present in localStorage
          const storedToken = localStorage.getItem(TOKEN_KEY)
          if (!storedToken) {
            state.token = null
            state.user = null
            state.isAuthenticated = false
          }

          // Listen for auth changes from other tabs
          window.addEventListener('storage', (e) => {
            if (e.key === TOKEN_KEY) {
              if (!e.newValue) {
                // Token was cleared in another tab
                state.token = null
                state.user = null
                state.isAuthenticated = false
              }
            }
          })
        }
      },
    }
  )
)
