import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios'

const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000/api/v1'

// Token storage keys
export const TOKEN_KEY = 'aibake_token'
export const TOKEN_EXPIRY_KEY = 'aibake_token_expiry'

// Retry configuration
interface RetryConfig {
  maxRetries: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
}

// Extended config with retry tracking
interface RetryableAxiosConfig extends InternalAxiosRequestConfig {
  retryCount?: number
  _isRefreshRequest?: boolean
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
}

// Calculate exponential backoff delay
const getBackoffDelay = (attempt: number, config: RetryConfig): number => {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1)
  return Math.min(delay, config.maxDelayMs)
}

// Check if error is retryable
const isRetryableError = (error: AxiosError): boolean => {
  if (!error.response) {
    return true
  }
  const status = error.response.status
  return status === 408 || status === 429 || (status >= 500 && status < 600)
}

// Parse JWT payload to get expiry time
export const parseTokenExpiry = (token: string): number | null => {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const decoded = JSON.parse(atob(payload))
    return decoded.exp ? decoded.exp * 1000 : null // Convert to ms
  } catch {
    return null
  }
}

// Store token with expiry derived from JWT payload
export const storeToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token)
  const expiry = parseTokenExpiry(token)
  if (expiry) {
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(expiry))
  }
}

// Clear stored token
export const clearToken = (): void => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_EXPIRY_KEY)
}

// Check if token is expired or expiring within the given threshold (ms)
export const isTokenExpiringSoon = (thresholdMs = 5 * 60 * 1000): boolean => {
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY)
  if (!expiry) return false
  return Date.now() + thresholdMs >= Number(expiry)
}

// Check if token is fully expired
export const isTokenExpired = (): boolean => {
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY)
  if (!expiry) return false
  return Date.now() >= Number(expiry)
}

// Track ongoing refresh to avoid parallel refresh calls
let refreshPromise: Promise<string | null> | null = null

const refreshToken = async (): Promise<string | null> => {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          },
        }
      )
      const newToken: string = response.data?.token
      if (newToken) {
        storeToken(newToken)
        return newToken
      }
      return null
    } catch {
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: attach token and proactively refresh if expiring soon
api.interceptors.request.use(async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
  const retryableConfig = config as RetryableAxiosConfig

  // Skip refresh logic for the refresh request itself
  if (!retryableConfig._isRefreshRequest) {
    const token = localStorage.getItem(TOKEN_KEY)

    if (token) {
      // Proactively refresh if token expires within 5 minutes
      if (isTokenExpiringSoon()) {
        const newToken = await refreshToken()
        const activeToken = newToken || token
        config.headers.Authorization = `Bearer ${activeToken}`
      } else {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
  }

  return config
})

// Response interceptor with retry logic and 401 handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError): Promise<AxiosResponse | never> => {
    const config = error.config as RetryableAxiosConfig

    if (!config) {
      return Promise.reject(error)
    }

    // Handle 401 Unauthorized - clear token and redirect to login
    if (error.response?.status === 401) {
      clearToken()
      window.location.href = '/login'
      return Promise.reject(error)
    }

    // Initialize retry count
    if (config.retryCount === undefined) {
      config.retryCount = 0
    }

    // Check if we should retry
    if (
      isRetryableError(error) &&
      config.retryCount < DEFAULT_RETRY_CONFIG.maxRetries
    ) {
      config.retryCount++
      const delay = getBackoffDelay(config.retryCount, DEFAULT_RETRY_CONFIG)
      await new Promise((resolve) => setTimeout(resolve, delay))
      return api(config)
    }

    return Promise.reject(error)
  }
)

export default api
export { DEFAULT_RETRY_CONFIG, type RetryConfig }
