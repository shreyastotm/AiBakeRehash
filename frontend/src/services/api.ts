import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios'

const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000/api/v1'

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
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
}

// Calculate exponential backoff delay
const getBackoffDelay = (
  attempt: number,
  config: RetryConfig
): number => {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1)
  return Math.min(delay, config.maxDelayMs)
}

// Check if error is retryable
const isRetryableError = (error: AxiosError): boolean => {
  if (!error.response) {
    // Network error
    return true
  }

  const status = error.response.status
  // Retry on 408 (Request Timeout), 429 (Too Many Requests), 5xx errors
  return status === 408 || status === 429 || (status >= 500 && status < 600)
}

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use((config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor with retry logic and error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError): Promise<AxiosResponse | never> => {
    const config = error.config as RetryableAxiosConfig

    // Initialize retry count
    if (!config || !config.retryCount) {
      if (config) {
        config.retryCount = 0
      }
    }

    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
      return Promise.reject(error)
    }

    // Check if we should retry
    if (
      config &&
      isRetryableError(error) &&
      config.retryCount !== undefined &&
      config.retryCount < DEFAULT_RETRY_CONFIG.maxRetries
    ) {
      config.retryCount++
      const delay = getBackoffDelay(config.retryCount, DEFAULT_RETRY_CONFIG)

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay))

      // Retry the request
      return api(config)
    }

    return Promise.reject(error)
  }
)

export default api
export { DEFAULT_RETRY_CONFIG, type RetryConfig }
