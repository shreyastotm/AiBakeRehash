import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'
import { Select } from '../components/common/Select'
import { Card } from '../components/common/Card'
import { usePreferencesStore } from '../store/preferencesStore'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import { TagManagement } from '../components/settings/TagManagement'
import { IngredientManagement } from '../components/settings/IngredientManagement'

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string
  email: string
  display_name: string
  unit_preferences: Record<string, string>
  default_currency: string
  language: string
  business_brand_name?: string
  business_manufacturer_name?: string
  business_manufacturer_address?: string
  business_fssai_license?: string
  business_contact_number?: string
  business_email_id?: string
  default_recipe_creation_mode?: 'manual' | 'smart'
}

interface UpdateProfilePayload {
  display_name?: string
  email?: string
  unit_preferences?: Record<string, string>
  default_currency?: string
  language?: string
  temperature_unit?: string
  date_format?: string
  business_brand_name?: string
  business_manufacturer_name?: string
  business_manufacturer_address?: string
  business_fssai_license?: string
  business_contact_number?: string
  business_email_id?: string
  default_recipe_creation_mode?: 'manual' | 'smart'
}

interface ChangePasswordPayload {
  current_password: string
  new_password: string
}

// ─── Option lists ─────────────────────────────────────────────────────────────

const UNIT_SYSTEM_OPTIONS = [
  { value: 'metric', label: 'Metric (grams, ml)' },
  { value: 'cups', label: 'Cups & Spoons' },
  { value: 'hybrid', label: 'Hybrid (metric + cups)' },
  { value: 'bakers_percent', label: "Baker's Percent" },
]

const TEMPERATURE_OPTIONS = [
  { value: 'celsius', label: 'Celsius (°C)' },
  { value: 'fahrenheit', label: 'Fahrenheit (°F)' },
]

const CURRENCY_OPTIONS = [
  { value: 'INR', label: '₹ Indian Rupee (INR)' },
  { value: 'USD', label: '$ US Dollar (USD)' },
  { value: 'EUR', label: '€ Euro (EUR)' },
]

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिंदी (Hindi)' },
]

const DATE_FORMAT_OPTIONS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2024)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2024)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2024-12-31)' },
]

const CREATION_MODE_OPTIONS = [
  { value: 'manual', label: 'Manual Input (Default)' },
  { value: 'smart', label: 'Smart Import Modal' },
]

// ─── Tab type ─────────────────────────────────────────────────────────────────

type Tab = 'preferences' | 'profile' | 'security' | 'tags' | 'ingredients'

// ─── Main component ───────────────────────────────────────────────────────────

export const Settings = () => {
  const [activeTab, setActiveTab] = useState<Tab>('preferences')

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="flex border-b border-gray-200 mb-6" role="tablist" aria-label="Settings sections">
        {(['preferences', 'profile', 'tags', 'ingredients', 'security'] as Tab[]).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`panel-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-sm font-medium capitalize border-b-2 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-inset ${activeTab === tab
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Panels */}
      <div id="panel-preferences" role="tabpanel" aria-labelledby="tab-preferences" hidden={activeTab !== 'preferences'}>
        {activeTab === 'preferences' && <PreferencesTab />}
      </div>
      <div id="panel-profile" role="tabpanel" aria-labelledby="tab-profile" hidden={activeTab !== 'profile'}>
        {activeTab === 'profile' && <ProfileTab />}
      </div>
      <div id="panel-security" role="tabpanel" aria-labelledby="tab-security" hidden={activeTab !== 'security'}>
        {activeTab === 'security' && <SecurityTab />}
      </div>
      <div id="panel-tags" role="tabpanel" aria-labelledby="tab-tags" hidden={activeTab !== 'tags'}>
        {activeTab === 'tags' && <TagManagement />}
      </div>
      <div id="panel-ingredients" role="tabpanel" aria-labelledby="tab-ingredients" hidden={activeTab !== 'ingredients'}>
        {activeTab === 'ingredients' && <IngredientManagement />}
      </div>
    </div>
  )
}

// ─── Preferences Tab ──────────────────────────────────────────────────────────

const PreferencesTab = () => {
  const { preferences, setPreferences } = usePreferencesStore()
  const { user } = useAuthStore()

  // Local state mirrors store; we apply immediately on change
  const [unitSystem, setUnitSystem] = useState(preferences.unit_system ?? 'metric')
  const [temperatureUnit, setTemperatureUnit] = useState(preferences.temperature_unit ?? 'celsius')
  const [currency, setCurrency] = useState(preferences.currency ?? 'INR')
  const [language, setLanguage] = useState(preferences.language ?? 'en')
  const [dateFormat, setDateFormat] = useState(preferences.date_format ?? 'DD/MM/YYYY')

  const [creationMode, setCreationMode] = useState<string>(
    user?.default_recipe_creation_mode ?? 'manual'
  )

  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const mutation = useMutation({
    mutationFn: (payload: UpdateProfilePayload) => api.patch('/users/me', payload),
    onSuccess: () => {
      setSuccessMsg('Preferences saved successfully.')
      setErrorMsg('')
      setTimeout(() => setSuccessMsg(''), 3000)
    },
    onError: () => {
      setErrorMsg('Failed to save preferences. Please try again.')
    },
  })

  const handleSave = () => {
    // Apply immediately to local store
    setPreferences({
      unit_system: unitSystem as 'metric' | 'cups' | 'hybrid' | 'bakers_percent',
      temperature_unit: temperatureUnit,
      currency,
      language: language as 'en' | 'hi',
      date_format: dateFormat,
    })

    // Persist to backend
    mutation.mutate({
      unit_preferences: { unit_system: unitSystem, temperature_unit: temperatureUnit, date_format: dateFormat },
      default_currency: currency,
      language,
      default_recipe_creation_mode: creationMode as 'manual' | 'smart'
    })
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold text-gray-900 mb-5">Display Preferences</h2>

      <div className="space-y-5">
        <Select
          label="Unit System"
          options={UNIT_SYSTEM_OPTIONS}
          value={unitSystem}
          onChange={(v) => { setUnitSystem(v as typeof unitSystem); setPreferences({ unit_system: v as 'metric' | 'cups' | 'hybrid' | 'bakers_percent' }) }}
          hint="Controls how ingredient quantities are displayed across recipes"
        />

        <Select
          label="Temperature Unit"
          options={TEMPERATURE_OPTIONS}
          value={temperatureUnit}
          onChange={(v) => { setTemperatureUnit(v as 'celsius' | 'fahrenheit'); setPreferences({ temperature_unit: v as 'celsius' | 'fahrenheit' }) }}
        />

        <Select
          label="Currency"
          options={CURRENCY_OPTIONS}
          value={currency}
          onChange={(v) => { setCurrency(v); setPreferences({ currency: v }) }}
          hint="Used for inventory costs and recipe pricing"
        />

        <Select
          label="Language"
          options={LANGUAGE_OPTIONS}
          value={language}
          onChange={(v) => { setLanguage(v as 'en' | 'hi'); setPreferences({ language: v as 'en' | 'hi' }) }}
        />

        <Select
          label="Date Format"
          options={DATE_FORMAT_OPTIONS}
          value={dateFormat}
          onChange={(v) => { setDateFormat(v); setPreferences({ date_format: v }) }}
        />

        <div className="pt-4 border-t border-gray-100">
          <Select
            label="Default Recipe Creation"
            options={CREATION_MODE_OPTIONS}
            value={creationMode}
            onChange={(v) => setCreationMode(v)}
            hint="Controls what happens when you click 'New Recipe'"
          />
        </div>
      </div>

      {successMsg && (
        <p role="status" className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          {successMsg}
        </p>
      )}
      {errorMsg && (
        <p role="alert" className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {errorMsg}
        </p>
      )}

      <div className="mt-6">
        <Button onClick={handleSave} loading={mutation.isPending}>
          Save Preferences
        </Button>
      </div>
    </Card>
  )
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

const ProfileTab = () => {
  const { user, setUser } = useAuthStore()

  const { data: profileData } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => api.get<{ success: boolean; data: UserProfile }>('/users/me').then((r) => r.data.data),
  })

  const profile = profileData ?? user

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [email, setEmail] = useState(profile?.email ?? '')

  // Business fields
  const [brandName, setBrandName] = useState(profile?.business_brand_name ?? '')
  const [manufacturerName, setManufacturerName] = useState(profile?.business_manufacturer_name ?? '')
  const [manufacturerAddress, setManufacturerAddress] = useState(profile?.business_manufacturer_address ?? '')
  const [fssaiLicense, setFssaiLicense] = useState(profile?.business_fssai_license ?? '')
  const [contactNumber, setContactNumber] = useState(profile?.business_contact_number ?? '')
  const [businessEmail, setBusinessEmail] = useState(profile?.business_email_id ?? '')

  const [errors, setErrors] = useState<{ display_name?: string; email?: string; fssai_license?: string }>({})
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const mutation = useMutation({
    mutationFn: (payload: UpdateProfilePayload) => api.patch('/users/me', payload),
    onSuccess: (res) => {
      const updated = res.data?.data
      if (updated && setUser) {
        setUser({ id: updated.id, email: updated.email, display_name: updated.display_name })
      }
      setSuccessMsg('Profile updated successfully.')
      setErrorMsg('')
      setTimeout(() => setSuccessMsg(''), 3000)
    },
    onError: () => {
      setErrorMsg('Failed to update profile. Please try again.')
    },
  })

  const validate = () => {
    const next: typeof errors = {}
    if (!displayName.trim()) next.display_name = 'Display name is required'
    if (!email.trim()) next.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email address'

    if (fssaiLicense.trim() && !/^\d{14}$/.test(fssaiLicense.trim())) {
      next.fssai_license = 'FSSAI License must be exactly 14 digits'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    mutation.mutate({
      display_name: displayName,
      email,
      business_brand_name: brandName,
      business_manufacturer_name: manufacturerName,
      business_manufacturer_address: manufacturerAddress,
      business_fssai_license: fssaiLicense,
      business_contact_number: contactNumber,
      business_email_id: businessEmail
    })
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold text-gray-900 mb-5">Profile Information</h2>

      <div className="space-y-4">
        <Input
          label="Display Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          error={errors.display_name}
          placeholder="Your name"
          autoComplete="name"
        />

        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </div>

      <h3 className="text-md font-semibold text-gray-900 mt-8 mb-4">Business & Labeling</h3>
      <div className="space-y-4">
        <Input
          label="Brand Name"
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          placeholder="e.g. Acme Bakery"
          hint="Brand name to appear on FSSAI labels"
        />
        <Input
          label="Manufacturer Name"
          value={manufacturerName}
          onChange={(e) => setManufacturerName(e.target.value)}
          placeholder="e.g. Acme Foods Pvt Ltd"
          hint="Legal manufacturer entity name"
        />
        <Input
          label="Manufacturer Address"
          value={manufacturerAddress}
          onChange={(e) => setManufacturerAddress(e.target.value)}
          placeholder="Full postal address"
          hint="Appears on FSSAI label"
        />
        <Input
          label="FSSAI License Number"
          value={fssaiLicense}
          onChange={(e) => setFssaiLicense(e.target.value)}
          placeholder="14-digit FSSAI No."
          hint="E.g. 10012011000000"
          error={errors.fssai_license}
        />
        <Input
          label="Business Contact No."
          value={contactNumber}
          onChange={(e) => setContactNumber(e.target.value)}
          placeholder="+91..."
          hint="Will appear on the FSSAI label"
        />
        <Input
          label="Business Email"
          type="email"
          value={businessEmail}
          onChange={(e) => setBusinessEmail(e.target.value)}
          placeholder="support@example.com"
          hint="Will appear on the FSSAI label"
        />
      </div>

      {successMsg && (
        <p role="status" className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          {successMsg}
        </p>
      )}
      {errorMsg && (
        <p role="alert" className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {errorMsg}
        </p>
      )}

      <div className="mt-6">
        <Button onClick={handleSave} loading={mutation.isPending}>
          Save Profile
        </Button>
      </div>
    </Card>
  )
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

const SecurityTab = () => {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<{
    current_password?: string
    new_password?: string
    confirm_password?: string
  }>({})
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const mutation = useMutation({
    mutationFn: (payload: ChangePasswordPayload) => api.patch('/users/me/password', payload),
    onSuccess: () => {
      setSuccessMsg('Password changed successfully.')
      setErrorMsg('')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setSuccessMsg(''), 4000)
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to change password. Please check your current password.'
      setErrorMsg(msg)
    },
  })

  const validate = () => {
    const next: typeof errors = {}
    if (!currentPassword) next.current_password = 'Current password is required'
    if (!newPassword) next.new_password = 'New password is required'
    else if (newPassword.length < 8) next.new_password = 'Password must be at least 8 characters'
    if (!confirmPassword) next.confirm_password = 'Please confirm your new password'
    else if (newPassword !== confirmPassword) next.confirm_password = 'Passwords do not match'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    mutation.mutate({ current_password: currentPassword, new_password: newPassword })
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold text-gray-900 mb-5">Change Password</h2>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Current Password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          error={errors.current_password}
          autoComplete="current-password"
          placeholder="Your current password"
        />

        <Input
          label="New Password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          error={errors.new_password}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          hint="Minimum 8 characters"
        />

        <Input
          label="Confirm New Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirm_password}
          autoComplete="new-password"
          placeholder="Repeat new password"
        />

        {successMsg && (
          <p role="status" className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
            {successMsg}
          </p>
        )}
        {errorMsg && (
          <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {errorMsg}
          </p>
        )}

        <div className="pt-2">
          <Button type="submit" loading={mutation.isPending}>
            Change Password
          </Button>
        </div>
      </form>
    </Card>
  )
}
