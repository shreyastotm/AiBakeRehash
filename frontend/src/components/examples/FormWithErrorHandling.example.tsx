/**
 * Example: Form Component with Complete Error Handling and Recovery
 * 
 * This example demonstrates how to implement a form with:
 * - Auto-save functionality (30-second intervals)
 * - Form data recovery on page reload
 * - Error handling with retry logic
 * - User-friendly error messages
 * 
 * Requirements:
 * - 94.1: Create error boundary component catching React errors
 * - 94.2: Implement auto-save for form data (localStorage, 30-second interval)
 * - 94.5: Create user-friendly error messages
 * - 94.6: Implement form data restoration on page reload
 */

import React, { useState } from 'react'
import { useAutoSave, useRestoreFormData } from '@/hooks/useAutoSave'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { ErrorMessage } from '@/components/common/ErrorMessage'
import { FormRecoveryBanner } from '@/components/FormRecoveryBanner'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'

interface RecipeFormData {
  title: string
  description: string
  servings: number
  yieldWeightGrams: number
  ingredients: Array<{
    name: string
    quantity: number
    unit: string
  }>
}

const DEFAULT_FORM_DATA: RecipeFormData = {
  title: '',
  description: '',
  servings: 1,
  yieldWeightGrams: 0,
  ingredients: [],
}

/**
 * Example form component with error handling and recovery
 */
export const FormWithErrorHandling: React.FC = () => {
  // Step 1: Restore form data from localStorage
  const {
    data: restoredData,
    hasRestoredData,
    timestamp: recoveryTimestamp,
    clearRestored,
  } = useRestoreFormData('recipe-form-draft', DEFAULT_FORM_DATA)

  // Step 2: Initialize form state with restored data
  const [formData, setFormData] = useState<RecipeFormData>(restoredData)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Step 3: Setup auto-save (saves every 30 seconds)
  useAutoSave(formData, {
    key: 'recipe-form-draft',
    interval: 30000, // 30 seconds
    enabled: true,
  })

  // Step 4: Setup error handling with retry logic
  const {
    error,
    isRetrying,
    retry,
    clearError,
    isRetryable,
    handleError,
  } = useErrorHandler({
    maxRetries: 3,
    onError: (err) => {
      console.error('Form submission error:', err)
    },
  })

  // Step 5: Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Simulate API call
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Success: Clear saved data and reset form
      clearRestored()
      setFormData(DEFAULT_FORM_DATA)
      clearError()

      // Show success message (implement toast notification)
      console.log('Recipe created successfully')
    } catch (err) {
      handleError(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Step 6: Handle retry
  const handleRetry = async () => {
    await retry(async () => {
      setIsSubmitting(true)
      try {
        const response = await fetch('/api/recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        clearRestored()
        setFormData(DEFAULT_FORM_DATA)
        clearError()
      } finally {
        setIsSubmitting(false)
      }
    })
  }

  // Step 7: Handle form recovery
  const handleRestore = () => {
    setFormData(restoredData)
  }

  const handleDiscard = () => {
    setFormData(DEFAULT_FORM_DATA)
    clearRestored()
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Recovery Banner */}
      {hasRestoredData && (
        <FormRecoveryBanner
          timestamp={recoveryTimestamp}
          onRestore={handleRestore}
          onDiscard={handleDiscard}
        />
      )}

      {/* Error Message */}
      {error && (
        <ErrorMessage
          title="Failed to create recipe"
          message={error.message}
          details={error.details}
          onRetry={isRetryable ? handleRetry : undefined}
          onDismiss={clearError}
          isRetrying={isRetrying}
          variant="error"
        />
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Recipe Title *
          </label>
          <Input
            type="text"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            placeholder="e.g., Chocolate Chip Cookies"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Describe your recipe..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Servings *
            </label>
            <Input
              type="number"
              value={formData.servings}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  servings: parseInt(e.target.value) || 1,
                })
              }
              min="1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Yield (grams) *
            </label>
            <Input
              type="number"
              value={formData.yieldWeightGrams}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  yieldWeightGrams: parseFloat(e.target.value) || 0,
                })
              }
              min="0"
              step="0.1"
              required
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={isSubmitting || isRetrying}
            className="flex-1"
          >
            {isSubmitting || isRetrying ? 'Saving...' : 'Save Recipe'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setFormData(DEFAULT_FORM_DATA)
              clearRestored()
              clearError()
            }}
            disabled={isSubmitting || isRetrying}
          >
            Clear
          </Button>
        </div>
      </form>

      {/* Auto-save Indicator */}
      <div className="text-xs text-gray-500 text-center">
        💾 Your changes are automatically saved every 30 seconds
      </div>
    </div>
  )
}

export default FormWithErrorHandling
