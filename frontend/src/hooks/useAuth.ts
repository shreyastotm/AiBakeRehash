import { useEffect, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { authService, LoginRequest, RegisterRequest } from '../services/auth.service'
import { useAuthStore } from '../store/authStore'
import { TOKEN_KEY, isTokenExpired } from '../services/api'

export const useAuth = () => {
  const { user, isAuthenticated, login, logout, setUser, setLoading, isLoading } = useAuthStore()
  const [initialCheckDone, setInitialCheckDone] = useState(false)

  // On mount: validate stored token is not expired
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token && isTokenExpired()) {
      // Token is fully expired — clear it
      logout()
    }
    setInitialCheckDone(true)
  }, [logout])

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginRequest) => authService.login(credentials),
    onSuccess: (data) => {
      login(data.token, data.user)
    },
  })

  const registerMutation = useMutation({
    mutationFn: (data: RegisterRequest) => authService.register(data),
    onSuccess: (data) => {
      login(data.token, data.user)
    },
  })

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      // Always clear local state even if the API call fails
      logout()
    },
  })

  const { data: currentUser, isLoading: isCurrentUserLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => authService.getCurrentUser(),
    enabled: isAuthenticated && initialCheckDone,
    retry: false,
    select: (data) => data?.data ?? data,
  })

  // Sync fetched user into store
  useEffect(() => {
    if (currentUser) {
      setUser(currentUser)
    }
  }, [currentUser, setUser])

  const loading = !initialCheckDone || isCurrentUserLoading || isLoading

  return {
    user: user ?? currentUser ?? null,
    isAuthenticated,
    loading,
    // Login
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    loginError: loginMutation.error,
    isLoginLoading: loginMutation.isPending,
    // Register
    register: registerMutation.mutate,
    registerAsync: registerMutation.mutateAsync,
    registerError: registerMutation.error,
    isRegisterLoading: registerMutation.isPending,
    // Logout
    logout: logoutMutation.mutate,
    isLoading: loading,
    // Legacy compat
    currentUser: user ?? currentUser ?? null,
    setLoading,
  }
}
