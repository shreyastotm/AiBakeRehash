import api, { storeToken } from './api'

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  display_name: string
}

export interface AuthUser {
  id: string
  email: string
  display_name: string
  unit_preferences?: Record<string, unknown>
}

/**
 * Normalised auth response — both login and register return this shape.
 * The raw API envelope is: { success: true, data: { user, accessToken, refreshToken } }
 */
export interface AuthResponse {
  /** Access JWT — stored in localStorage via storeToken() */
  token: string
  user: AuthUser
}

/** Unwrap the API envelope and normalise token field name */
function unwrapAuth(responseData: unknown): AuthResponse {
  // Raw shape: { success, data: { user, accessToken, refreshToken } }
  const envelope = responseData as { success: boolean; data: Record<string, unknown> }
  const inner = envelope?.data ?? (responseData as Record<string, unknown>)
  const token = (inner.accessToken ?? inner.token) as string
  const user = inner.user as AuthUser

  if (!token) throw new Error('No access token in auth response')

  // Persist token immediately so subsequent requests are authenticated
  storeToken(token)

  return { token, user }
}

export const authService = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', credentials)
    return unwrapAuth(response.data)
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', data)
    return unwrapAuth(response.data)
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout').catch(() => {
      // best-effort — always clear local state
    })
  },

  getCurrentUser: async (): Promise<AuthUser> => {
    const response = await api.get('/users/me')
    // Envelope: { success, data: user }
    const envelope = response.data as { success: boolean; data: AuthUser }
    return envelope?.data ?? response.data
  },
}
