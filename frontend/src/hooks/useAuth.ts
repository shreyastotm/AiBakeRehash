import { useQuery, useMutation } from '@tanstack/react-query'
import { authService, LoginRequest, RegisterRequest } from '../services/auth.service'
import { useAuthStore } from '../store/authStore'

export const useAuth = () => {
  const { setUser, setToken, clearAuth } = useAuthStore()

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginRequest) => authService.login(credentials),
    onSuccess: (data) => {
      localStorage.setItem('auth_token', data.token)
      setToken(data.token)
      setUser(data.user)
    },
  })

  const registerMutation = useMutation({
    mutationFn: (data: RegisterRequest) => authService.register(data),
    onSuccess: (data) => {
      localStorage.setItem('auth_token', data.token)
      setToken(data.token)
      setUser(data.user)
    },
  })

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      localStorage.removeItem('auth_token')
      clearAuth()
    },
  })

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => authService.getCurrentUser(),
    enabled: !!localStorage.getItem('auth_token'),
  })

  return {
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    currentUser,
    isLoading,
    isAuthenticated: !!localStorage.getItem('auth_token'),
  }
}
