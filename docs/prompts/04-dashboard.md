# Prompt 04 — Dashboard Redesign

## Objective
Redesign `frontend/src/pages/Dashboard.tsx` to be the command centre of AiBakeRehash. It should immediately communicate value, show key metrics with brand styling, highlight recent activity, and offer clear entry points for core workflows.

**Prerequisites**: Prompts 01, 02, 03 complete.

---

## Current Issues to Fix
- KPI cards use `blue-600`, `green-600`, `amber-600` — must use brand tokens
- Inline SVGs → replace with lucide-react icons
- The `container mx-auto p-4` pattern → use `page-container` class
- No recent activity, no recipe preview, no empty states per section

---

## Target Page Structure

```
Dashboard
├── Welcome Banner (personalized, contextual)
├── KPI Row (4 stats)
├── Quick Actions Grid
├── Recent Recipes (last 3–4, card preview)
└── Recent Journal Entries (last 3)
```

---

## Section 1 — Welcome Banner

Show a warm greeting that changes based on time of day (morning/afternoon/evening). Include a CTA to create a recipe if count is 0.

```tsx
// Helper (add inside the component file)
function getGreeting(name: string): { emoji: string; text: string } {
  const hour = new Date().getHours()
  if (hour < 12) return { emoji: '🌅', text: `Good morning, ${name}!` }
  if (hour < 17) return { emoji: '☀️', text: `Good afternoon, ${name}!` }
  return { emoji: '🌙', text: `Good evening, ${name}!` }
}
```

**Banner JSX**:
```tsx
<div className="rounded-2xl gradient-brand p-6 text-white mb-8 flex items-center justify-between">
  <div>
    <p className="text-white/70 text-sm font-medium mb-1">
      {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
    </p>
    <h1 className="text-2xl font-bold font-display">
      {greeting.emoji} {greeting.text}
    </h1>
    <p className="text-white/80 text-sm mt-1">
      {recipesCount === 0
        ? "Start your baking journey — create your first recipe."
        : `You have ${recipesCount} recipes and ${journalCount} journal entries.`}
    </p>
  </div>
  <div className="hidden sm:block">
    <Link to="/recipes/new">
      <Button variant="accent" leftIcon={<Plus size={16} />}>
        New Recipe
      </Button>
    </Link>
  </div>
</div>
```

---

## Section 2 — KPI Cards

4 cards in a responsive grid (`grid-cols-2 lg:grid-cols-4`). Each card uses design tokens.

**KPI card template**:
```tsx
interface KpiCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  color: 'primary' | 'secondary' | 'accent' | 'success'
  trend?: { value: number; label: string }
  isLoading?: boolean
  linkTo?: string
}
```

**Cards to render**:

| label | value source | icon | color |
|-------|-------------|------|-------|
| Total Recipes | `recipesCount` | `BookOpen` | `primary` |
| Journal Entries | `journalCount` | `NotebookPen` | `secondary` |
| Inventory Items | `inventoryCount` (0 for now) | `Package` | `accent` |
| Low Stock Alerts | `alertsCount` (0 for now) | `AlertTriangle` | `success` (or `error` if > 0) |

**Card JSX pattern**:
```tsx
const colorTokens = {
  primary: { bg: 'bg-primary-50', icon: 'text-primary-500', value: 'text-primary-600', border: 'border-primary-100' },
  secondary: { bg: 'bg-secondary-50', icon: 'text-secondary-500', value: 'text-secondary-600', border: 'border-secondary-100' },
  accent: { bg: 'bg-accent-50', icon: 'text-accent-500', value: 'text-accent-600', border: 'border-accent-100' },
  success: { bg: 'bg-success-light', icon: 'text-success', value: 'text-success-dark', border: 'border-green-100' },
}

// Card:
<div className={cn('card p-5 flex items-center justify-between', colorTokens[color].border, 'border')}>
  <div>
    <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">{label}</p>
    {isLoading
      ? <Skeleton className="h-8 w-16 mt-1 rounded" />
      : <p className={cn('text-3xl font-bold mt-1', colorTokens[color].value)}>{value}</p>
    }
  </div>
  <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center', colorTokens[color].bg)}>
    <Icon size={22} className={colorTokens[color].icon} />
  </div>
</div>
```

---

## Section 3 — Quick Actions

6 action tiles in `grid-cols-2 sm:grid-cols-3` grid. Each tile links to a main feature.

| action | icon | label | description | linkTo |
|--------|------|-------|-------------|--------|
| New Recipe | `Plus` | Add Recipe | Manually enter a new recipe | `/recipes/new` |
| Smart Import | `Sparkles` | Smart Import | Import from image, URL, or text | opens SmartImportModal |
| Log Bake | `NotebookPen` | Log a Bake | Record today's baking session | `/journal/new` |
| Check Inventory | `Package` | Inventory | Review stock levels | `/inventory` |
| Calculate Cost | `Calculator` | Costing | Work out pricing and margins | `/costing` |
| Browse Recipes | `BookOpen` | All Recipes | Browse your recipe library | `/recipes` |

**Tile JSX**:
```tsx
<Link to={linkTo} /* or onClick for modal */>
  <div className="card-interactive p-5 flex flex-col gap-3">
    <div className="h-10 w-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-600 group-hover:bg-primary-50 group-hover:text-primary-500 transition-colors">
      <Icon size={20} />
    </div>
    <div>
      <p className="font-semibold text-sm text-neutral-900">{label}</p>
      <p className="text-xs text-neutral-500 mt-0.5">{description}</p>
    </div>
  </div>
</Link>
```

Wrap the outer `<div className="grid ...">` with `className="group"` on each tile link.

---

## Section 4 — Recent Recipes

Show up to 4 most recently updated recipes. Use the existing `useRecipes` hook with `sort_by: 'updated_at', limit: 4`.

- Section header: `"Recent Recipes"` + `<Link to="/recipes" className="text-sm text-primary-500 hover:text-primary-600">View all →</Link>`
- If loading: show 4 `SkeletonCard` components
- If empty: show a compact empty state (no big illustration, just text + button)
- Cards: use `RecipeCard` component (portrait grid, `grid-cols-2 sm:grid-cols-4`)

---

## Section 5 — Recent Journal Entries

Show up to 3 most recent journal entries. Use `useAllJournalEntries()`.

- Section header: `"Recent Baking Sessions"` + link to `/journal`
- Each entry: a compact horizontal card (`flex items-center gap-4 card p-4`) showing:
  - Date badge (day/month)
  - Recipe title
  - Star rating (`★★★★☆`)
  - Outcome tag (success/needs-work)

---

## SmartImportModal
The Dashboard still has a `SmartImportModal` — keep it wired up. The "Smart Import" quick action tile should call `setIsImportModalOpen(true)`.

---

## Empty State (zero recipes)
When `recipesCount === 0`, replace sections 4 and 5 with a single full-width `EmptyState`:

```tsx
<EmptyState
  icon={<ChefHat size={48} className="text-neutral-300" />}
  title="Your kitchen is empty"
  description="Add your first recipe to get started. You can type it manually or import from an image, WhatsApp message, or URL."
  action={{ label: 'Create your first recipe', onClick: () => navigate('/recipes/new'), icon: <Plus size={16} /> }}
  secondaryAction={{ label: 'Import a recipe', onClick: () => setIsImportModalOpen(true) }}
/>
```

---

## Verification
- [ ] Welcome banner uses `gradient-brand` utility class
- [ ] KPI cards use brand color tokens (no `blue-600`, `green-600`, `amber-600`)
- [ ] All icons are from `lucide-react`
- [ ] Loading states show `Skeleton` components
- [ ] Empty state renders when 0 recipes
- [ ] TypeScript compiles
