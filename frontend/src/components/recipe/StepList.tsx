import React from 'react'
import { useLocalization } from '../../hooks/useLocalization'

export interface RecipeStep {
  id: string
  instruction: string
  duration_seconds?: number | null
  temperature_celsius?: number | null
  position: number
  section_id?: string
}

export interface RecipeSection {
  id: string
  title: string
  type: 'pre_prep' | 'prep' | 'bake' | 'rest' | 'notes'
  position: number
  steps: RecipeStep[]
}

interface StepListProps {
  sections?: RecipeSection[]
  steps?: RecipeStep[]
  className?: string
}

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (secs === 0) return `${mins} min`
  return `${mins} min ${secs}s`
}

export const StepList: React.FC<StepListProps> = ({
  sections,
  steps,
  className = '',
}) => {
  const { t } = useLocalization()

  // Render flat steps list (no sections)
  if (!sections || sections.length === 0) {
    const flatSteps = (steps ?? []).sort((a, b) => a.position - b.position)
    return (
      <div className={`space-y-4 ${className}`}>
        {flatSteps.length === 0 ? (
          <p className="text-gray-500 text-sm">{t('recipes.noSteps', 'No steps added yet')}</p>
        ) : (
          <ol className="space-y-4" aria-label={t('recipes.steps')}>
            {flatSteps.map((step, idx) => (
              <StepItem key={step.id} step={step} index={idx + 1} t={t} />
            ))}
          </ol>
        )}
      </div>
    )
  }

  // Render sections with steps
  const sortedSections = [...sections].sort((a, b) => a.position - b.position)

  return (
    <div className={`space-y-6 ${className}`}>
      {sortedSections.map((section) => {
        const sortedSteps = [...section.steps].sort((a, b) => a.position - b.position)
        return (
          <section key={section.id} aria-labelledby={`section-${section.id}`}>
            <h3
              id={`section-${section.id}`}
              className="text-base font-semibold text-amber-700 uppercase tracking-wide mb-3"
            >
              {section.title}
            </h3>
            <ol className="space-y-4" aria-label={section.title}>
              {sortedSteps.map((step, idx) => (
                <StepItem key={step.id} step={step} index={idx + 1} t={t} />
              ))}
            </ol>
          </section>
        )
      })}
    </div>
  )
}

interface StepItemProps {
  step: RecipeStep
  index: number
  t: (key: string, fallback?: string) => string
}

const StepItem: React.FC<StepItemProps> = ({ step, index, t }) => (
  <li className="flex gap-4">
    <span
      className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold text-sm flex items-center justify-center"
      aria-label={`${t('recipes.step', 'Step')} ${index}`}
    >
      {index}
    </span>
    <div className="flex-1 pt-0.5">
      <p className="text-gray-800 leading-relaxed">{step.instruction}</p>
      {(step.duration_seconds || step.temperature_celsius) && (
        <div className="flex gap-3 mt-1.5 text-sm text-gray-500">
          {step.duration_seconds && (
            <span className="flex items-center gap-1">
              <span aria-hidden="true">⏱</span>
              {formatDuration(step.duration_seconds)}
            </span>
          )}
          {step.temperature_celsius && (
            <span className="flex items-center gap-1">
              <span aria-hidden="true">🌡</span>
              {step.temperature_celsius}°C
            </span>
          )}
        </div>
      )}
    </div>
  </li>
)
