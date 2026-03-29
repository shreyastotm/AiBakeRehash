import React, { useState } from 'react'

const COMMON_ISSUES = [
  {
    id: '1',
    issue_type: 'Flat Cookies',
    symptoms: 'Cookies spread too thin, no lift, greasy texture',
    solution: 'Chill the dough for 30 mins before baking. Check butter isn\'t too warm — it should be cool to touch, not melted. Use a light-coloured baking tray and ensure oven is fully preheated.',
    prevention_tip: 'Always chill cookie dough and measure flour by weight, not volume.',
  },
  {
    id: '2',
    issue_type: 'Dense Bread',
    symptoms: 'Bread doesn\'t rise, heavy crumb, dough doesn\'t spring back when poked',
    solution: 'Check yeast is active — proof in warm water (37–40°C) with a pinch of sugar. Knead for at least 10 minutes until dough is smooth and elastic. Let rise in a warm, draught-free spot.',
    prevention_tip: 'Always check yeast expiry date. Use a thermometer to verify water temperature.',
  },
  {
    id: '3',
    issue_type: 'Cracked Cake Top',
    symptoms: 'Deep cracks on cake surface, uneven browning',
    solution: 'Reduce oven temperature by 10–15°C. Place on a middle-lower rack. Avoid overmixing batter after adding flour. Check oven hot spots with an oven thermometer.',
    prevention_tip: 'Lower and slower baking reduces surface cracking. Cover with foil if browning too fast.',
  },
  {
    id: '4',
    issue_type: 'Soggy Bottom',
    symptoms: 'Pastry crust is wet, undercooked, or doughy at the base',
    solution: 'Blind bake the pastry shell before adding filling. Preheat the baking tray. Avoid watery fillings — strain fruit or cook down filling first. Use a dark metal tin which conducts heat better.',
    prevention_tip: 'Brush the base with egg wash before blind baking to seal the pastry.',
  },
  {
    id: '5',
    issue_type: 'Burnt Edges',
    symptoms: 'Overcooked edges, raw centre, uneven bake',
    solution: 'Move rack to middle position. Reduce oven temp and extend time. Check if your oven runs hot — use an oven thermometer. Use lighter baking trays. Shield edges with foil strips.',
    prevention_tip: 'Rotate pans halfway through baking. Know your oven\'s hot spots.',
  },
  {
    id: '6',
    issue_type: 'Cake Won\'t Rise',
    symptoms: 'Cake stays flat, dense, no volume',
    solution: 'Check baking powder/soda freshness. Test: baking powder should fizz in hot water, baking soda should fizz with vinegar. Don\'t overmix — fold gently. Don\'t open the oven in the first 2/3 of baking time.',
    prevention_tip: 'Replace baking powder every 6 months. Store in an airtight container.',
  },
  {
    id: '7',
    issue_type: 'Bread Crust Too Hard',
    symptoms: 'Crust is thick, chewy, difficult to cut',
    solution: 'Brush crust with water or milk before baking for a softer finish. After baking, cover with a clean cloth for 10 minutes — steam softens the crust. Bake at slightly lower temperature.',
    prevention_tip: 'For soft sandwich bread, bake covered or in a loaf tin with a lid.',
  },
  {
    id: '8',
    issue_type: 'Cheesecake Cracks',
    symptoms: 'Cracks on the surface of cheesecake after cooling',
    solution: 'Bake in a water bath (bain-marie) at low temperature (150°C). Don\'t overbeat the eggs. Cool gradually — turn off oven, crack door open, let cheesecake cool inside for 1 hour before refrigerating.',
    prevention_tip: 'Always run a thin knife around the edge of the pan when it comes out.',
  },
  {
    id: '9',
    issue_type: 'Muffins Peaked Too High',
    symptoms: 'Muffins have tall, cracked peaks instead of rounded domes',
    solution: 'Fill muffin cups only 2/3 full. Reduce oven temperature by 10°C and increase baking time slightly. Don\'t overmix batter.',
    prevention_tip: 'Use ice-cream scoop for consistent filling. Mix just until flour disappears.',
  },
  {
    id: '10',
    issue_type: 'Macarons Don\'t Have Feet',
    symptoms: 'Macarons are flat without the signature "feet" at the base',
    solution: 'Ensure shells are properly dried/rested before baking (30-60 mins). Use aged egg whites. Check batter is at correct consistency — should flow like lava. Preheat oven thoroughly.',
    prevention_tip: 'Humidity is the enemy of macarons. Avoid making them on rainy days.',
  },
  {
    id: '11',
    issue_type: 'Jalebi Doesn\'t Get Crispy',
    symptoms: 'Jalebi are soft, chewy or soggy instead of crisp',
    solution: 'Fry at the correct oil temperature (175–180°C). Drain well and dip immediately in hot sugar syrup (1-string consistency). Don\'t overcrowd the pan. Oil must be hot enough.',
    prevention_tip: 'Fresh jalebi is always crispier. Eat within 1-2 hours of making.',
  },
  {
    id: '12',
    issue_type: 'Gulab Jamun Too Hard',
    symptoms: 'Gulab jamun balls are hard, don\'t absorb syrup',
    solution: 'Reduce heat and fry low and slow (140-150°C) for even cooking. Ensure syrup is warm (not hot) when dipping. Check dough is not too stiff — add a little more milk.',
    prevention_tip: 'Test one ball first. If it hardens, the oil is too hot.',
  },
]

export const EmergencyHelpPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = COMMON_ISSUES.filter((issue) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return (
      issue.issue_type.toLowerCase().includes(q) ||
      issue.symptoms.toLowerCase().includes(q) ||
      issue.solution.toLowerCase().includes(q)
    )
  })

  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">🆘 Baking Emergency Help</h1>
        <p className="text-red-100 text-sm">Something went wrong? Find your fix fast.</p>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="search"
          className="w-full border-2 border-gray-300 focus:border-amber-400 rounded-xl px-4 py-3 pl-10 text-sm focus:outline-none transition-colors"
          placeholder="Search: flat cookies, dense bread, soggy bottom…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
        />
        <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-3">🤔</div>
          <p className="text-gray-500 font-medium">No issues found for "{searchQuery}"</p>
          <p className="text-gray-400 text-sm mt-1">Try different words or browse the list below.</p>
          <button onClick={() => setSearchQuery('')} className="mt-3 text-amber-600 text-sm underline">Clear search</button>
        </div>
      ) : (
        <div className="space-y-3">
          {searchQuery && (
            <p className="text-sm text-gray-500">Found {filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>
          )}
          {filtered.map((issue) => (
            <div
              key={issue.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-all hover:shadow-md"
            >
              <button
                onClick={() => setExpanded(expanded === issue.id ? null : issue.id)}
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 min-h-[60px]"
                aria-expanded={expanded === issue.id}
              >
                <div>
                  <p className="font-semibold text-gray-900">{issue.issue_type}</p>
                  <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{issue.symptoms}</p>
                </div>
                <span className={`text-gray-400 text-lg transition-transform shrink-0 ${expanded === issue.id ? 'rotate-180' : ''}`}>
                  ▾
                </span>
              </button>

              {expanded === issue.id && (
                <div className="px-5 pb-5 border-t border-gray-100 space-y-4">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Symptoms</h3>
                    <p className="text-sm text-gray-700">{issue.symptoms}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                    <h3 className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1.5">✅ Solution</h3>
                    <p className="text-sm text-green-800 leading-relaxed">{issue.solution}</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1.5">💡 Prevention Tip</h3>
                    <p className="text-sm text-amber-800">{issue.prevention_tip}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-gray-400 pb-4">
        12 common baking issues · More solutions in your recipe journal
      </p>
    </div>
  )
}
