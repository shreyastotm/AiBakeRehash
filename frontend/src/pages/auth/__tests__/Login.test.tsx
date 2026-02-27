import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Login } from '../Login'

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

// Mock useAuth hook
const mockLoginAsync = vi.fn()
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    loginAsync: mockLoginAsync,
    isLoginLoading: false,
  }),
}))

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  )

describe('Login form', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Req 28.2: login form with email and password fields
  it('renders email and password fields', () => {
    renderLogin()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders the sign in button', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows validation errors when submitting empty form', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(mockLoginAsync).not.toHaveBeenCalled()
  })

  it('shows validation error for invalid email format', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText(/email/i), 'not-an-email')
    await user.type(screen.getByLabelText(/password/i), 'somepassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('Please enter a valid email address')).toBeInTheDocument()
  })

  // Req 28.2 + auth flow: successful login redirects to dashboard
  it('calls loginAsync and navigates to /dashboard on success', async () => {
    const user = userEvent.setup()
    mockLoginAsync.mockResolvedValueOnce(undefined)
    renderLogin()

    await user.type(screen.getByLabelText(/email/i), 'baker@example.com')
    await user.type(screen.getByLabelText(/password/i), 'Password1')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockLoginAsync).toHaveBeenCalledWith({
        email: 'baker@example.com',
        password: 'Password1',
      })
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('shows form-level error when login fails', async () => {
    const user = userEvent.setup()
    mockLoginAsync.mockRejectedValueOnce(new Error('Invalid credentials'))
    renderLogin()

    await user.type(screen.getByLabelText(/email/i), 'baker@example.com')
    await user.type(screen.getByLabelText(/password/i), 'WrongPass1')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials')
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
