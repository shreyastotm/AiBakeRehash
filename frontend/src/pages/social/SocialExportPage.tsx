import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { recipeService } from '../../services/recipe.service'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { Button } from '../../components/common/Button'
import { RecipeCardExport } from '../../components/social/RecipeCardExport'
import { WhatsAppShare } from '../../components/social/WhatsAppShare'

type Format = 'instagram_post' | 'instagram_story' | 'whatsapp'
type Language = 'en' | 'hi' | 'bilingual'

const COLOR_SCHEMES = [
  { id: 'amber', label: '🟡 Warm Amber', bg: 'from-amber-50 to-orange-100', border: 'border-amber-200', text: 'text-amber-700' },
  { id: 'rose', label: '🌸 Rose Gold', bg: 'from-rose-50 to-pink-100', border: 'border-rose-200', text: 'text-rose-700' },
  { id: 'sage', label: '🌿 Sage Green', bg: 'from-green-50 to-emerald-100', border: 'border-green-200', text: 'text-green-700' },
  { id: 'lavender', label: '💜 Lavender', bg: 'from-purple-50 to-violet-100', border: 'border-purple-200', text: 'text-purple-700' },
  { id: 'slate', label: '🩶 Classic Dark', bg: 'from-slate-800 to-gray-900', border: 'border-gray-600', text: 'text-amber-400' },
]

export const SocialExportPage: React.FC = () => {
  const { id: recipeId } = useParams<{ id: string }>()
  const [format, setFormat] = useState<Format>('instagram_post')
  const [language, setLanguage] = useState<Language>('en')
  const [colorScheme, setColorScheme] = useState('amber')
  const [bakerName, setBakerName] = useState('')
  const [handle, setHandle] = useState('')
  const [activeTab, setActiveTab] = useState<'export' | 'whatsapp'>('export')

  const { data: recipeData, isLoading } = useQuery({
    queryKey: ['recipe', recipeId],
    queryFn: () => recipeService.getRecipe(recipeId!),
    enabled: !!recipeId,
  })

  const recipe = (recipeData as any)?.recipe || recipeData

  const exportData = recipe
    ? {
        title: recipe.title,
        description: recipe.description,
        servings: recipe.servings,
        yield_weight_grams: recipe.yield_weight_grams || 0,
        thumbnail_url: recipe.thumbnail_url,
        key_ingredients: (recipe.ingredients || []).slice(0, 5).map((i: any) => i.display_name || i.ingredient_name),
        baker_name: bakerName,
        instagram_handle: handle,
      }
    : null

  const handleDownload = () => {
    alert('In production, this would call the backend image generation API to create a high-res image.\n\nFor now, use browser screenshot or print.')
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}/recipes/${recipeId}`
    navigator.clipboard.writeText(url).then(() => alert('Link copied!'))
  }

  const schemeCfg = COLOR_SCHEMES.find((s) => s.id === colorScheme) || COLOR_SCHEMES[0]

  if (!recipeId) return <div className="p-4 text-gray-500">No recipe selected.</div>

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Social Media Export</h1>
          <p className="text-sm text-gray-500 mt-0.5">Share your recipe on Instagram or WhatsApp</p>
        </div>
        <Link to={`/recipes/${recipeId}`}><Button variant="ghost" size="sm">← Recipe</Button></Link>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls Panel */}
          <div className="space-y-5">
            {/* Tabs */}
            <div className="flex rounded-xl bg-gray-100 p-1">
              {(['export', 'whatsapp'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeTab === tab ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'export' ? '📸 Image Export' : '💬 WhatsApp'}
                </button>
              ))}
            </div>

            {activeTab === 'export' && (
              <>
                {/* Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: 'instagram_post', label: '📷 Post', sub: '1:1 Square' },
                      { id: 'instagram_story', label: '📱 Story', sub: '9:16 Vertical' },
                      { id: 'whatsapp', label: '💬 WhatsApp', sub: '4:3' },
                    ] as const).map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setFormat(f.id)}
                        className={`border-2 rounded-xl p-3 text-center transition-all ${
                          format === f.id ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="text-base">{f.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{f.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                  <div className="flex gap-2">
                    {(['en', 'hi', 'bilingual'] as const).map((l) => (
                      <button
                        key={l}
                        onClick={() => setLanguage(l)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                          language === l ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {l === 'en' ? 'English' : l === 'hi' ? 'हिंदी' : 'Both'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Scheme */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color Scheme</label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {COLOR_SCHEMES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setColorScheme(s.id)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                          colorScheme === s.id ? 'border-amber-500' : 'border-transparent hover:border-gray-200'
                        }`}
                      >
                        <div className={`w-8 h-5 rounded bg-gradient-to-r ${s.bg} border ${s.border}`} />
                        <span className="font-medium">{s.label}</span>
                        {colorScheme === s.id && <span className="ml-auto text-amber-500">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Branding */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Branding</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Your baker name"
                    value={bakerName}
                    onChange={(e) => setBakerName(e.target.value)}
                  />
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="@instagram_handle"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.replace('@', ''))}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button onClick={handleDownload} className="flex-1">
                    ⬇️ Download Image
                  </Button>
                  <Button variant="secondary" onClick={handleCopyLink}>
                    🔗 Copy Link
                  </Button>
                </div>
              </>
            )}

            {activeTab === 'whatsapp' && recipe && (
              <WhatsAppShare
                recipe={{
                  title: recipe.title,
                  description: recipe.description,
                  servings: recipe.servings,
                  ingredients: (recipe.ingredients || []).map((i: any) => ({
                    name: i.display_name || i.ingredient_name,
                    quantity: i.quantity_original,
                    unit: i.unit_original,
                  })),
                  steps: (recipe.steps || []).map((s: any) => s.instruction),
                }}
              />
            )}
          </div>

          {/* Preview Panel */}
          <div className="flex flex-col items-center justify-center">
            {exportData && activeTab === 'export' && (
              <div className="w-full flex flex-col items-center gap-4">
                <div className={`${format === 'instagram_story' ? 'w-56 h-96' : 'w-72 h-72'} bg-gradient-to-br ${schemeCfg.bg} border-2 ${schemeCfg.border} rounded-2xl p-6 flex flex-col justify-between shadow-lg transition-all`}>
                  <div>
                    <div className={`w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center mb-3`}>
                      <span className="text-white font-bold text-sm">A</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 leading-tight line-clamp-2">{exportData.title}</h2>
                    {exportData.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{exportData.description}</p>
                    )}
                  </div>

                  {exportData.key_ingredients.length > 0 && (
                    <div>
                      <p className={`text-xs font-semibold ${schemeCfg.text} uppercase tracking-wide mb-1.5`}>Key Ingredients</p>
                      <div className="flex flex-wrap gap-1.5">
                        {exportData.key_ingredients.slice(0, 4).map((ing) => (
                          <span key={ing} className={`text-xs bg-white/70 text-gray-700 px-2 py-0.5 rounded-full border ${schemeCfg.border}`}>
                            {ing}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{exportData.servings} servings · {exportData.yield_weight_grams}g</span>
                    {exportData.instagram_handle && (
                      <span className={`font-medium ${schemeCfg.text}`}>@{exportData.instagram_handle}</span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-400 text-center">Preview · Actual export will be high-resolution</p>
              </div>
            )}

            {activeTab === 'whatsapp' && (
              <div className="text-center text-gray-400">
                <div className="text-6xl mb-3">💬</div>
                <p className="text-sm">Use the formatter on the left to preview and share via WhatsApp</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
