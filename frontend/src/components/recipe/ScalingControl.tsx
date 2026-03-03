import React, { useState, useCallback } from 'react'
import { useLocalization } from '../../hooks/useLocalization'
import { Button } from '../common/Button'
import { Input } from '../common/Input'

interface ScalingControlProps {
  originalServings: number
  originalYieldGrams: number
  onScale: (scalingFactor: number) => void
  onSaveAsNew?: (scalingFactor: number) => void
  savingAsNew?: boolean
  loading?: boolean
  className?: string
}

type ScaleMode = 'servings' | 'yield'

const WARNING_HIGH = 3
const WARNING_LOW = 0.25

export function ScalingControl({
  originalServings,
  originalYieldGrams,
  onScale,
  onSaveAsNew,
  savingAsNew = false,
  loading = false,
  className = '',
}: ScalingControlProps) {
  const { t, formatNumber } = useLocalization()
  const [mode, setMode] = useState<ScaleMode>('servings')
  const [targetServings, setTargetServings] = useState(String(originalServings))
  const [targetYield, setTargetYield] = useState(String(originalYieldGrams))

  const scalingFactor = useCallback((): number => {
    if (mode === 'servings') {
      const val = parseFloat(targetServings)
      return isNaN(val) || val <= 0 ? 1 : val / originalServings
    }
    const val = parseFloat(targetYield)
    return isNaN(val) || val <= 0 ? 1 : val / originalYieldGrams
  }, [mode, targetServings, targetYield, originalServings, originalYieldGrams])

  const factor = scalingFactor()
  const hasWarning = factor > WARNING_HIGH || factor < WARNING_LOW
  const isUnchanged = Math.abs(factor - 1) < 0.001

  return (
    <div className={`bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-4 ${className}`}>
      <h3 className="font-semibold text-gray-800 text-base">{t('recipes.scaleRecipe')}</h3>

      {/* Mode toggle */}
      <fieldset>
        <legend className="sr-only">{t('recipes.scaleBy', 'Scale by')}</legend>
        <div className="flex rounded-lg overflow-hidden border border-amber-300 w-fit">
          <button
            type="button"
            onClick={() => setMode('servings')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              mode === 'servings'
                ? 'bg-amber-600 text-white'
                : 'bg-white text-amber-700 hover:bg-amber-50'
            }`}
            aria-pressed={mode === 'servings'}
          >
            {t('recipes.targetServings')}
          </button>
          <button
            type="button"
            onClick={() => setMode('yield')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              mode === 'yield'
                ? 'bg-amber-600 text-white'
                : 'bg-white text-amber-700 hover:bg-amber-50'
            }`}
            aria-pressed={mode === 'yield'}
          >
            {t('recipes.targetYield')}
          </button>
        </div>
      </fieldset>

      {/* Input */}
      <div className="flex items-end gap-3 flex-wrap">
        {mode === 'servings' ? (
          <Input
            label={`${t('recipes.targetServings')} (${t('recipes.original', 'original')}: ${originalServings})`}
            type="number"
            min="0.1"
            step="1"
            value={targetServings}
            onChange={(e: { target: { value: string } }) => setTargetServings(e.target.value)}
            className="max-w-[160px]"
          />
        ) : (
          <Input
            label={`${t('recipes.targetYield')} (${t('recipes.original', 'original')}: ${originalYieldGrams}g)`}
            type="number"
            min="1"
            step="10"
            value={targetYield}
            onChange={(e: { target: { value: string } }) => setTargetYield(e.target.value)}
            className="max-w-[160px]"
          />
        )}

        <div className="pb-1 text-sm text-gray-600">
          <span className="font-medium">{t('recipes.scalingFactor')}:</span>{' '}
          <span className={`font-bold ${hasWarning ? 'text-orange-600' : 'text-amber-700'}`}>
            {formatNumber(parseFloat(factor.toFixed(2)))}×
          </span>
        </div>
      </div>

      {/* Warning */}
      {hasWarning && (
        <p className="text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2" role="alert">
          {factor > WARNING_HIGH
            ? t('recipes.scalingWarningHigh', 'Scaling above 3× may affect texture and timing.')
            : t('recipes.scalingWarningLow', 'Scaling below 0.25× may be difficult to measure accurately.')}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="primary"
          size="sm"
          onClick={() => { if (!isUnchanged) onScale(factor) }}
          disabled={isUnchanged}
          loading={loading}
        >
          {t('recipes.applyScaling', 'Apply')}
        </Button>
        {onSaveAsNew && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onSaveAsNew(factor)}
            disabled={isUnchanged}
            loading={savingAsNew}
          >
            {t('recipes.saveAsNewRecipe', 'Save as New Recipe')}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setTargetServings(String(originalServings))
            setTargetYield(String(originalYieldGrams))
            onScale(1)
          }}
          disabled={isUnchanged && !loading}
        >
          {t('common.cancel')}
        </Button>
      </div>
    </div>
  )
}
