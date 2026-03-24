import { useState, useEffect } from 'react'

import { useParams, useNavigate, Link } from 'react-router-dom'
import { useRecipe, useDeleteRecipe, useRecipeVersions, useRecipeNutrition, useScaleRecipe, useCalculateNutrition } from '../../hooks/useRecipes'
import { MEDIA_BASE_URL } from '../../services/api'
import { userTagService, type RecipeVersion, type UserTag } from '../../services/recipe.service'

import { useJournalEntries, useEstimateWaterActivity } from '../../hooks/useJournalEntries'
import { LabelDesigner } from '../../components/label/LabelDesigner'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { Button } from '../../components/common/Button'
import { Badge } from '../../components/common/Badge'
import { Modal } from '../../components/common/Modal'
import { VersionDiffModal } from '../../components/common/VersionDiffModal'
import { IngredientList } from '../../components/recipe/IngredientList'
import { StepList } from '../../components/recipe/StepList'
import { NutritionDisplay } from '../../components/recipe/NutritionDisplay'
import { ScalingControl } from '../../components/recipe/ScalingControl'
import { useLocalization } from '../../hooks/useLocalization'
// ─── Status badge variant map ─────────────────────────────────────────────────

const statusVariant = {
  active: 'active',
  draft: 'draft',
  archived: 'archived',
} as const

// ─── Source type label ────────────────────────────────────────────────────────

const sourceLabels: Record<string, string> = {
  manual: 'Manual',
  image: 'Image',
  whatsapp: 'WhatsApp',
  url: 'URL',
}

const TAG_COLORS: Record<string, { bg: string, text: string }> = {
  gray: { bg: 'bg-gray-100', text: 'text-gray-700' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-700' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-700' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  rose: { bg: 'bg-rose-100', text: 'text-rose-700' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-700' },
  violet: { bg: 'bg-violet-100', text: 'text-violet-700' },
}

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: React.ReactNode
}

const StatCard = ({ label, value }: StatCardProps) => (
  <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
    <p className="text-xl font-bold text-gray-900">{value}</p>
  </div>
)

// ─── Version history row ──────────────────────────────────────────────────────

interface VersionRowProps {
  version: RecipeVersion
  formatDate: (d: string, fmt: string) => string
}

const VersionRow = ({ version, formatDate }: VersionRowProps) => (
  <li className="flex items-start justify-between gap-3 py-2.5 border-b border-gray-50 last:border-0">
    <div className="flex items-center gap-2">
      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">
        v{version.version_number}
      </span>
      <span className="text-sm text-gray-700">
        {version.change_summary || 'No description'}
      </span>
    </div>
    <span className="text-xs text-gray-400 shrink-0 mt-0.5">
      {formatDate(version.created_at, 'PP')}
    </span>
  </li>
)

import { AIMeter } from '../../components/recipe/AIMeter'
import { Tooltip } from '../../components/common/Tooltip'

// ─── Advanced baking info section ─────────────────────────────────────────────

interface BakingInfoProps {
  waterActivity?: number | null
  minSafeWaterActivity?: number | null
  shelfLifeDays?: number | null
  hydrationPercentage?: number | null
  explanation?: string | null
  onRefresh?: () => void
  refreshing?: boolean
}

const BakingInfo = ({ waterActivity, minSafeWaterActivity, shelfLifeDays, hydrationPercentage, explanation, onRefresh, refreshing }: BakingInfoProps) => {
  const hasAny = waterActivity != null || hydrationPercentage != null || shelfLifeDays != null
  if (!hasAny) return null

  return (
    <section aria-labelledby="baking-info-heading" className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h2 id="baking-info-heading" className="text-base font-semibold text-gray-900">
          Advanced Baking Info
        </h2>
        <div className="flex items-center gap-3">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              <span className={refreshing ? 'animate-spin' : ''}>↻</span> Refresh
            </button>
          )}
          <Tooltip content="AI estimates are for guidance only. Actual shelf life may vary based on hygiene, storage conditions, and ambient humidity. Use as a guide, not a certified lab result.">
            <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded cursor-help flex items-center gap-1 font-medium italic">
              <span>✨ AI Powered</span>
              <span className="w-3 h-3 border border-gray-300 rounded-full flex items-center justify-center text-[8px] not-italic">i</span>
            </span>
          </Tooltip>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
        {hydrationPercentage != null && (
          <div className="flex flex-col gap-1">
            <dt className="text-[10px] font-semibold text-gray-400 uppercase tracking-tight">Hydration Percentage</dt>
            <dd className="text-xl font-bold text-amber-600">{(Number(hydrationPercentage) || 0).toFixed(1)}%</dd>
          </div>
        )}

        {waterActivity != null && (
          <AIMeter
            label="Water Activity (aw)"
            value={waterActivity}
            min={0.5}
            max={1.0}
            colorMap={(val) => val > 0.9 ? 'bg-red-500' : val > 0.85 ? 'bg-amber-400' : 'bg-green-500'}
          />
        )}

        {shelfLifeDays != null && (
          <AIMeter
            label="Est. Shelf Life (Days)"
            value={shelfLifeDays}
            min={1}
            max={30}
            unit=" Days"
            colorMap={(val) => val > 14 ? 'bg-green-500' : val > 5 ? 'bg-amber-400' : 'bg-red-400'}
          />
        )}

        {minSafeWaterActivity != null && (
          <div className="flex flex-col gap-1 opacity-60">
            <dt className="text-[10px] font-semibold text-gray-400 uppercase tracking-tight">System Safe aw Limit</dt>
            <dd className="text-sm font-bold text-gray-700">{(Number(minSafeWaterActivity) || 0).toFixed(2)}</dd>
          </div>
        )}
      </div>

      {explanation && (
        <div className="mt-6 pt-4 border-t border-gray-50 italic text-[11px] text-gray-400 leading-relaxed">
          <strong>Observation:</strong> {explanation}
        </div>
      )}
    </section>
  )
}

// ─── Bake history section ─────────────────────────────────────────────────────

interface BakeHistoryProps {
  recipeId: string
  formatDate: (d: string, fmt: string) => string
}

const BakeHistory = ({ recipeId, formatDate }: BakeHistoryProps) => {
  const { data: bakes, isLoading } = useJournalEntries(recipeId)

  if (isLoading) return <div className="py-4 text-center text-gray-400">Loading bakes...</div>
  if (!bakes || bakes.length === 0) return null

  return (
    <section aria-labelledby="bakes-heading" className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 id="bakes-heading" className="text-base font-semibold text-gray-900">
          Bake History
        </h2>
        <Link
          to={`/recipes/${recipeId}/journal`}
          className="text-sm text-amber-600 hover:text-amber-700 font-medium"
        >
          View All →
        </Link>
      </div>
      <div className="space-y-3">
        {bakes.slice(0, 5).map((bake) => (
          <Link
            key={bake.id}
            to={`/recipes/${recipeId}/journal/${bake.id}`}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all group"
          >
            <div className="flex items-center gap-3">
              {bake.images && bake.images.length > 0 ? (
                <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden border border-gray-100 shrink-0">
                  <img
                    src={bake.images[0].startsWith('http') ? bake.images[0] : `${MEDIA_BASE_URL}${bake.images[0]}`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded bg-amber-50 flex items-center justify-center text-amber-600 font-bold text-[10px] uppercase text-center leading-tight shrink-0">
                  {formatDate(bake.bake_date, 'MMM')}
                  <br />
                  {formatDate(bake.bake_date, 'd')}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 group-hover:text-amber-700 transition-colors truncate">
                  {bake.rating ? `★ ${bake.rating}/5` : 'No rating'}
                </p>
                <p className="text-xs text-gray-500 line-clamp-1">
                  {bake.notes || 'No notes recorded'}
                </p>
              </div>
            </div>
            <span className="text-gray-300 group-hover:text-amber-400 transition-colors ml-2">→</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export const RecipeDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t, formatDate } = useLocalization()

  const { data: recipe, isLoading, error } = useRecipe(id ?? '')
  const { data: versions } = useRecipeVersions(id ?? '')
  const { data: nutrition } = useRecipeNutrition(id ?? '')
  const calculateNutrition = useCalculateNutrition()
  const estimateAw = useEstimateWaterActivity()
  const deleteRecipe = useDeleteRecipe()
  const scaleRecipe = useScaleRecipe()

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [scalingFactor, setScalingFactor] = useState(1)
  const [showScaling, setShowScaling] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [showLabelDesigner, setShowLabelDesigner] = useState(false)
  const [userTags, setUserTags] = useState<UserTag[]>([])
  const [diffVersion, setDiffVersion] = useState<number | null>(null)

  useEffect(() => {

    userTagService.getTags()
      .then(t => setUserTags(t))
      .catch(console.error)
  }, [])

  const handleCalculateNutrition = async () => {
    if (!id) return
    try {
      await calculateNutrition.mutateAsync(id)
    } catch (err) {
      console.error('Failed to calculate nutrition:', err)
      alert('AI nutrition calculation failed. Please ensure ingredients are correctly labelled.')
    }
  }

  const handleTriggerAIEstimate = async () => {
    if (!id) return
    try {
      await estimateAw.mutateAsync(id)
    } catch (err) {
      console.error('Failed to trigger AI estimate:', err)
      alert('AI estimation failed. Please ensure ingredients and process steps are provided.')
    }
  }

  // ── Loading / error states ──────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl text-center">
        <p className="text-red-600 font-medium mb-2">Failed to load recipe</p>
        <p className="text-gray-500 text-sm mb-4">{(error as Error)?.message}</p>
        <Button variant="ghost" onClick={() => navigate('/recipes')}>← Back to recipes</Button>
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl text-center">
        <p className="text-gray-500 mb-4">Recipe not found.</p>
        <Button variant="ghost" onClick={() => navigate('/recipes')}>← Back to recipes</Button>
      </div>
    )
  }

  // ── Delete handler ──────────────────────────────────────────────────────────

  const handleDelete = async () => {
    setDeleteError(null)
    try {
      await deleteRecipe.mutateAsync(id ?? '')
      navigate('/recipes')
    } catch (err) {
      setDeleteError((err as Error)?.message ?? 'Failed to delete recipe. Please try again.')
    }
  }

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false)
    setDeleteError(null)
  }

  // ── Save scaled version as new recipe ───────────────────────────────────────

  const handleSaveAsNew = async (factor: number) => {
    const targetYield = Math.round(recipe.yield_weight_grams * factor)
    const saved = await scaleRecipe.mutateAsync({ id: id ?? '', targetYield })
    if (saved?.id) {
      navigate(`/recipes/${saved.id}`)
    }
  }

  // ── Scaled display values ───────────────────────────────────────────────────

  const scaledServings = Math.round(recipe.servings * scalingFactor)
  const scaledYield = Math.round(recipe.yield_weight_grams * scalingFactor)

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">

      {/* ── Breadcrumb ── */}
      <nav aria-label="Breadcrumb" className="text-sm text-gray-500">
        <Link to="/recipes" className="hover:text-amber-700 transition-colors">Recipes</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span className="text-gray-900 font-medium">{recipe.title}</span>
      </nav>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant={statusVariant[recipe.status]} size="sm">
              {t(`recipes.${recipe.status}`, recipe.status)}
            </Badge>
            {recipe.source_type && recipe.source_type !== 'manual' && (
              <Badge variant="info" size="sm">{sourceLabels[recipe.source_type]}</Badge>
            )}
            {recipe.tags && recipe.tags.map(tag => {
              const ut = userTags.find(u => u.label.toLowerCase() === tag.toLowerCase())
              const color = TAG_COLORS[ut?.color || 'gray'] || TAG_COLORS.gray
              return (
                <Badge
                  key={tag}
                  variant="default"
                  size="sm"
                  className={`border-none shadow-sm ${color.bg} ${color.text}`}
                >
                  {tag}
                </Badge>
              )
            })}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
            {recipe.title}
          </h1>
          {recipe.description && (
            <p className="text-gray-600 mt-2 leading-relaxed">{recipe.description}</p>
          )}
          {(recipe.original_author || recipe.source_url) && (
            <p className="text-sm text-gray-400 mt-1">
              {recipe.original_author && <span>By {recipe.original_author}</span>}
              {recipe.source_url && (
                <a
                  href={recipe.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-amber-600 hover:underline"
                >
                  Source ↗
                </a>
              )}
            </p>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(`/recipes/${id}/journal/new`)}
          >
            ➕ Log Bake
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowScaling((v) => !v)}
            aria-expanded={showScaling}
          >
            ⚖ Scale
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/recipes/${id}/edit`)}
          >
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
          >
            Delete
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            onClick={() => setShowLabelDesigner(true)}
          >
            🏷 FSSAI Label
          </Button>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label={t('recipes.servings', 'Servings')} value={scaledServings} />
        <StatCard label={t('recipes.yield', 'Yield')} value={`${scaledYield}g`} />
        <StatCard
          label={t('recipes.unitSystem', 'Units')}
          value={recipe.preferred_unit_system ?? 'metric'}
        />
        <StatCard
          label={t('recipes.updated', 'Updated')}
          value={formatDate(recipe.updated_at, 'PP')}
        />
      </div>

      {/* ── Scaling control ── */}
      {showScaling && (
        <ScalingControl
          originalServings={recipe.servings}
          originalYieldGrams={recipe.yield_weight_grams}
          onScale={setScalingFactor}
          onSaveAsNew={handleSaveAsNew}
          savingAsNew={scaleRecipe.isPending}
        />
      )}

      {/* ── Ingredients ── */}
      <section aria-labelledby="ingredients-heading" className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 id="ingredients-heading" className="text-base font-semibold text-gray-900">
            {t('recipes.ingredients', 'Ingredients')}
            {scalingFactor !== 1 && (
              <span className="ml-2 text-sm font-normal text-amber-600">
                ({scalingFactor.toFixed(2)}×)
              </span>
            )}
          </h2>
          <span className="text-sm text-gray-400">{recipe.ingredients.length} items</span>
        </div>
        <IngredientList
          ingredients={recipe.ingredients}
          scalingFactor={scalingFactor}
          showGrams={recipe.preferred_unit_system !== 'metric'}
        />
      </section>

      {/* ── Steps ── */}
      {recipe.sections && recipe.sections.length > 0 && (
        <section aria-labelledby="steps-heading" className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 id="steps-heading" className="text-base font-semibold text-gray-900 mb-4">
            {t('recipes.instructions', 'Instructions')}
          </h2>
          <StepList
            sections={recipe.sections.map((s) => ({
              ...s,
              title: s.title ?? s.type,
              steps: s.steps.map((step) => ({
                ...step,
                section_id: step.section_id ?? undefined,
              })),
            }))}
          />
        </section>
      )}

      {/* ── Nutrition ── */}
      {nutrition ? (
        <section aria-labelledby="nutrition-heading">
          <div className="flex items-center justify-between mb-4">
            <h2 id="nutrition-heading" className="text-base font-semibold text-gray-900">
              {t('recipes.nutritionFacts', 'Nutrition Facts')}
            </h2>
            <button
              onClick={handleCalculateNutrition}
              disabled={calculateNutrition.isPending}
              className="text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              <span className={calculateNutrition.isPending ? 'animate-spin' : ''}>↻</span> Refresh
            </button>
          </div>
          <NutritionDisplay nutrition={nutrition} />
        </section>
      ) : (
        <section aria-labelledby="nutrition-heading" className="bg-white rounded-xl border border-gray-100 p-5 text-center">
          <h2 id="nutrition-heading" className="text-base font-semibold text-gray-900 mb-2">
            Nutritional Information
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            AI can estimate the nutritional facts for your recipe based on its ingredients.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCalculateNutrition}
            loading={calculateNutrition.isPending}
          >
            ✨ Calculate with AI
          </Button>
        </section>
      )}

      {/* ── Advanced baking info ── */}
      {recipe.target_water_activity || recipe.total_hydration_percentage ? (
        <BakingInfo
          waterActivity={recipe.target_water_activity}
          minSafeWaterActivity={recipe.min_safe_water_activity}
          shelfLifeDays={recipe.estimated_shelf_life_days}
          hydrationPercentage={recipe.total_hydration_percentage}
          explanation={recipe.estimated_aw_explanation}
          onRefresh={handleTriggerAIEstimate}
          refreshing={estimateAw.isPending}
        />
      ) : (
        <section aria-labelledby="ai-baking-heading" className="bg-white rounded-xl border border-gray-100 p-5 text-center">
          <h2 id="ai-baking-heading" className="text-base font-semibold text-gray-900 mb-2">
            Water Activity & Shelf Life
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            AI can analyze your recipe to predict water activity and shelf life based on your process and ingredients.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTriggerAIEstimate}
            loading={estimateAw.isPending}
          >
            ✨ Predict Stability
          </Button>
        </section>
      )}

      {/* ── Bake history ── */}
      <BakeHistory recipeId={id ?? ''} formatDate={formatDate} />

      {/* ── Version history ── */}
      {versions && versions.length > 0 && (
        <section aria-labelledby="versions-heading" className="bg-white rounded-xl border border-gray-100 p-5">
          <button
            id="versions-heading"
            className="w-full flex items-center justify-between text-base font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 rounded"
            onClick={() => setShowVersions((v) => !v)}
            aria-expanded={showVersions}
          >
            <span>Version History</span>
            <span className="flex items-center gap-2 text-sm font-normal text-gray-400">
              {versions.length} {versions.length === 1 ? 'version' : 'versions'}
              <span aria-hidden="true">{showVersions ? '▲' : '▼'}</span>
            </span>
          </button>

          {showVersions && (
            <ul className="mt-4 divide-y divide-gray-50" aria-label="Version history">
              {versions.map((v) => (
                <div key={v.id} onClick={() => setDiffVersion(v.version_number)} className="cursor-pointer hover:bg-gray-50">
                   <VersionRow version={v} formatDate={formatDate} />
                </div>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ── Delete confirmation modal ── */}
      <Modal
        isOpen={showDeleteModal}
        onClose={handleCloseDeleteModal}
        title="Delete Recipe"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete <strong className="text-gray-900">{recipe.title}</strong>?
          </p>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-800 mb-1">This will permanently delete:</p>
                <ul className="text-sm text-red-700 list-disc list-inside space-y-0.5">
                  <li>The recipe and all its ingredients</li>
                  <li>All journal entries and baking notes</li>
                  <li>All version history</li>
                </ul>
                <p className="text-sm text-red-700 mt-2 font-medium">This action cannot be undone.</p>
              </div>
            </div>
          </div>

          {deleteError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {deleteError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={handleCloseDeleteModal} disabled={deleteRecipe.isPending}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={deleteRecipe.isPending}
            >
              Delete Recipe
            </Button>
          </div>
        </div>
      </Modal>

      {showLabelDesigner && id && (
        <LabelDesigner
          recipeId={id}
          onClose={() => setShowLabelDesigner(false)}
        />
      )}
      
      {diffVersion !== null && (
         <VersionDiffModal 
           isOpen={true} 
           versionNumber={diffVersion}
           onClose={() => setDiffVersion(null)} 
         />
      )}
    </div>
  )
}
