import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Register } from '../Register'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockRegisterAsync = vi.fn()
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    registerAsync: mockRegisterAsync,
    isRegisterLoading: false,
  }),
}))

const renderRegister = () =>
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  )

describe('Register form', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Req 28.1: registration form with email, password, and display name fields
  it('renders display name, email, and password fields', () => {
    renderRegister()
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    // Two password fields — match by placeholder text to distinguish them
    expect(screen.getByPlaceholderText(/min\. 8 characters/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/repeat your password/i)).toBeInTheDocument()
  })

  it('renders the create account button', () => {
    renderRegister()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('shows validation errors when submitting empty form', async () => {
    const user = userEvent.setup()
    renderRegister()

    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText('Display name is required')).toBeInTheDocument()
    expect(screen.getByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(screen.getByText('Please confirm your password')).toBeInTheDocument()
    expect(mockRegisterAsync).not.toHaveBeenCalled()
  })

  it('shows error for invalid email format', async () => {
    const user = userEvent.setup()
    renderRegister()

    await user.type(screen.getByLabelText(/display name/i), 'Priya')
    await user.type(screen.getByLabelText(/email/i), 'bad-email')
    await user.type(screen.getByPlaceholderText(/min\. 8 characters/i), 'Password1')
    await user.type(screen.getByPlaceholderText(/repeat your password/i), 'Password1')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText('Please enter a valid email address')).toBeInTheDocument()
  })

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup()
    renderRegister()

    await user.type(screen.getByLabelText(/display name/i), 'Priya')
    await user.type(screen.getByLabelText(/email/i), 'priya@example.com')
    await user.type(screen.getByPlaceholderText(/min\. 8 characters/i), 'Password1')
    await user.type(screen.getByPlaceholderText(/repeat your password/i), 'Different1')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument()
  })

  // Req 28.1: successful registration navigates to dashboard
  it('calls registerAsync and navigates to /dashboard on success', async () => {
    const user = userEvent.setup()
    mockRegisterAsync.mockResolvedValueOnce(undefined)
    renderRegister()

    await user.type(screen.getByLabelText(/display name/i), 'Priya Baker')
    await user.type(screen.getByLabelText(/email/i), 'priya@example.com')
    await user.type(screen.getByPlaceholderText(/min\. 8 characters/i), 'Password1')
    await user.type(screen.getByPlaceholderText(/repeat your password/i), 'Password1')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(mockRegisterAsync).toHaveBeenCalledWith({
        email: 'priya@example.com',
        display_name: 'Priya Baker',
        password: 'Password1',
      })
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('shows form-level error when registration fails', async () => {
    const user = userEvent.setup()
    mockRegisterAsync.mockRejectedValueOnce(new Error('Email already in use'))
    renderRegister()

    await user.type(screen.getByLabelText(/display name/i), 'Priya')
    await user.type(screen.getByLabelText(/email/i), 'priya@example.com')
    await user.type(screen.getByPlaceholderText(/min\. 8 characters/i), 'Password1')
    await user.type(screen.getByPlaceholderText(/repeat your password/i), 'Password1')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Email already in use')
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
