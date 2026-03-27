# Prompt 05 — Recipe Pages Improvement

## Objective
Improve the recipe section of the frontend: fix broken Tailwind classes in `RecipeList`, upgrade the `RecipeCard` design, and standardize `RecipeDetail` and `RecipeForm` layouts using the design system.

**Prerequisites**: Prompts 01, 02, 03 complete.

---

## File List

| File | Action |
|------|--------|
| `frontend/src/pages/recipe/RecipeList.tsx` | Fix bugs + improve UX |
| `frontend/src/components/recipe/RecipeCard.tsx` | Redesign |
| `frontend/src/pages/recipe/RecipeDetail.tsx` | Standardize layout |
| `frontend/src/pages/recipe/RecipeForm.tsx` | Improve form UX |

Read each file before editing.

---

## RecipeList.tsx — Fixes and Improvements

### Critical Bug Fix — Broken Class Strings
The current code has class strings with spaces inside them (broken Tailwind):

```tsx
// BROKEN (current code):
className={`p - 1.5 rounded transition - colors ...`}
className={`min - w - [36px] h - 9 rounded - md ...`}

// FIXED (what to change to):
className={cn('p-1.5 rounded transition-colors ...')}
className={cn('min-w-[36px] h-9 rounded-md ...')}
```

Search for ALL occurrences of `- ` inside className strings and fix them. Use `cn()` for all conditional classes.

### Filter Bar Improvements

Replace the current raw `<div className="flex flex-wrap gap-3 items-end">` filter area with a cleaner panel:

```tsx
<div className="card p-4 mb-6">
  <div className="flex flex-col gap-3">
    {/* Search full width */}
    <SearchInput
      value={search}
      onSearch={handleSearch}
      onChange={setSearch}
      placeholder="Search recipes by title, ingredient, tag…"
      debounceMs={300}
      loading={isFetching && !!search}
    />
    {/* Filters row */}
    <div className="flex flex-wrap gap-2 items-center">
      <Select options={STATUS_OPTIONS} value={status} onChange={handleStatus} placeholder="Status" />
      <Select options={SOURCE_OPTIONS} value={sourceType} onChange={handleSource} placeholder="Source" />
      <Select options={SORT_OPTIONS} value={sortBy} onChange={handleSort} placeholder="Sort by" />
      <Select options={ORDER_OPTIONS} value={sortOrder} onChange={handleOrder} />
      <TagInput value={tags} onChange={(t) => { setTags(t); setPage(1) }} suggestions={suggestedLabels} userTags={userTags} placeholder="Filter by tags" />
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" leftIcon={<X size={14} />} onClick={clearFilters}>
          Clear filters
        </Button>
      )}
      {/* View toggle moved to right */}
      <div className="ml-auto flex items-center gap-1 border border-neutral-200 rounded-lg p-1 bg-neutral-50">
        <button
          onClick={() => setViewMode('grid')}
          aria-label="Grid view"
          aria-pressed={viewMode === 'grid'}
          className={cn('p-1.5 rounded transition-colors', viewMode === 'grid' ? 'bg-white shadow-xs text-primary-500' : 'text-neutral-400 hover:text-neutral-600')}
        >
          <LayoutGrid size={16} />
        </button>
        <button
          onClick={() => setViewMode('list')}
          aria-label="List view"
          aria-pressed={viewMode === 'list'}
          className={cn('p-1.5 rounded transition-colors', viewMode === 'list' ? 'bg-white shadow-xs text-primary-500' : 'text-neutral-400 hover:text-neutral-600')}
        >
          <List size={16} />
        </button>
      </div>
    </div>
  </div>
</div>
```

### Pagination Fix
Fix the broken pagination button classes (same space-in-class-string bug):
```tsx
// Fix this:
className={`min - w - [36px] h - 9 ...`}
// To:
className={cn('min-w-[36px] h-9 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500', p === page ? 'bg-primary-500 text-white' : 'text-neutral-700 hover:bg-neutral-100')}
```

---

## RecipeCard.tsx — Redesign

Read the current RecipeCard. It needs a visual upgrade while keeping all existing props.

### Card Layout (Grid mode — portrait card)
```tsx
<article className="card-interactive group overflow-hidden">
  {/* Thumbnail or placeholder */}
  <div className="aspect-[4/3] bg-gradient-to-br from-neutral-100 to-neutral-50 relative overflow-hidden">
    {recipe.thumbnail_url
      ? <img src={recipe.thumbnail_url} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-slow" loading="lazy" />
      : <div className="w-full h-full flex items-center justify-center text-neutral-300"><ChefHat size={40} /></div>
    }
    {/* Status badge overlay */}
    {recipe.status !== 'active' && (
      <div className="absolute top-2 left-2">
        <Badge variant={recipe.status === 'draft' ? 'warning' : 'default'}>
          {recipe.status}
        </Badge>
      </div>
    )}
    {/* Source badge overlay */}
    <div className="absolute top-2 right-2">
      <SourceBadge source={recipe.source_type} />
    </div>
  </div>

  {/* Body */}
  <div className="p-4">
    <h3 className="font-semibold text-neutral-900 text-sm leading-snug line-clamp-2 mb-1 group-hover:text-primary-600 transition-colors">
      {recipe.title}
    </h3>

    {/* Meta row */}
    <div className="flex items-center gap-3 text-xs text-neutral-500 mt-2">
      {recipe.servings && (
        <span className="flex items-center gap-1">
          <Users size={12} />
          {recipe.servings}
        </span>
      )}
      {recipe.total_time_minutes && (
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {formatDuration(recipe.total_time_minutes)}
        </span>
      )}
      {recipe.rating && (
        <span className="flex items-center gap-1 ml-auto text-accent-500">
          <Star size={12} fill="currentColor" />
          {recipe.rating.toFixed(1)}
        </span>
      )}
    </div>

    {/* Tags */}
    {recipe.tags && recipe.tags.length > 0 && (
      <div className="flex flex-wrap gap-1 mt-2">
        {recipe.tags.slice(0, 3).map(tag => (
          <Badge key={tag} variant="default" className="text-2xs">{tag}</Badge>
        ))}
        {recipe.tags.length > 3 && (
          <Badge variant="default" className="text-2xs">+{recipe.tags.length - 3}</Badge>
        )}
      </div>
    )}
  </div>

  {/* Footer — last updated */}
  <div className="px-4 pb-3 flex items-center justify-between">
    <span className="text-2xs text-neutral-400">
      {formatRelativeDate(recipe.updated_at)}
    </span>
    <Link
      to={`/recipes/${recipe.id}`}
      className="text-xs text-primary-500 hover:text-primary-600 font-medium"
      onClick={e => e.stopPropagation()}
    >
      Open →
    </Link>
  </div>
</article>
```

### Card Layout (List mode — horizontal)
In list mode (`className` includes `flex-row`), render a horizontal layout:
```tsx
<article className="card flex-row items-center gap-4 p-4 hover:shadow-md transition-shadow group">
  {/* Thumbnail — fixed size */}
  <div className="h-16 w-16 rounded-lg bg-neutral-100 flex-shrink-0 overflow-hidden">
    {recipe.thumbnail_url
      ? <img src={recipe.thumbnail_url} alt="" className="w-full h-full object-cover" />
      : <div className="w-full h-full flex items-center justify-center text-neutral-300"><ChefHat size={20} /></div>
    }
  </div>
  {/* Content */}
  <div className="flex-1 min-w-0">
    <h3 className="font-semibold text-sm text-neutral-900 truncate group-hover:text-primary-600 transition-colors">
      {recipe.title}
    </h3>
    <div className="flex items-center gap-3 text-xs text-neutral-500 mt-0.5">
      {/* same meta as above, condensed */}
    </div>
  </div>
  {/* Action */}
  <Link to={`/recipes/${recipe.id}`}>
    <Button variant="ghost" size="sm" rightIcon={<ChevronRight size={14} />}>View</Button>
  </Link>
</article>
```

### Helper Functions (add at top of file)
```ts
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function SourceBadge({ source }: { source: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    manual: { label: 'Manual', variant: 'default' },
    image:  { label: 'Image',  variant: 'info' },
    whatsapp: { label: 'WA', variant: 'success' },
    url:    { label: 'URL',   variant: 'secondary' },
  }
  const item = map[source] ?? { label: source, variant: 'default' }
  return <Badge variant={item.variant}>{item.label}</Badge>
}
```

---

## RecipeDetail.tsx — Layout Standardization

Read the current file. Apply these improvements without changing any functionality:

1. **Page header**: Use `page-header` class for the title + action button row
2. **Sections**: Each logical section (Ingredients, Steps, Nutrition, Versions) wrapped in `<section className="card mb-6">`
3. **Section headings**: `<h2 className="text-lg font-semibold text-neutral-900 px-6 py-4 border-b border-neutral-100">`
4. **Ingredient list items**: Use `flex items-center gap-3 py-2.5 border-b border-neutral-100 last:border-0 text-sm`
5. **Step items**: Numbered steps with `<span className="h-7 w-7 rounded-full bg-primary-50 text-primary-600 text-xs font-bold flex items-center justify-center shrink-0">{stepNumber}</span>`
6. **Version history**: Timeline-style list with `border-l-2 border-neutral-200 ml-3 pl-4`
7. **Nutrition panel**: A 2x2 grid of macro cards (Calories, Protein, Fat, Carbs) with colored icons
8. **Action buttons**: Standardize to use `Button` component with `variant="primary"` for primary action, `variant="outline"` for secondary

---

## RecipeForm.tsx — Form UX Improvements

Read the current form. Apply:

1. **Replace inline `<input>` elements** with the `Input` component from `components/common/Input`
2. **Section containers**: Wrap logical form groups in `<div className="card mb-6 p-6">`
3. **Section titles**: `<h3 className="text-base font-semibold text-neutral-900 mb-4">`
4. **Ingredient rows**: Each row a `flex gap-3 items-center` with `Button variant="ghost"` remove button (Trash2 icon)
5. **Add ingredient button**: `Button variant="outline" size="sm" leftIcon={<Plus size={14} />}`
6. **Form footer**: Sticky `<footer className="sticky bottom-0 bg-white border-t border-neutral-200 px-6 py-4 flex justify-between items-center">`
7. **Submit button**: `Button variant="primary" size="lg" loading={isSubmitting}`
8. **Cancel button**: `Button variant="ghost"` with router `navigate(-1)`

---

## Verification
- [ ] No broken class strings (`p - 1.5`, `min - w - [36px]`) remain
- [ ] RecipeCard renders thumbnail, meta row, tags
- [ ] RecipeList pagination uses `cn()` for conditional classes
- [ ] All icons from lucide-react
- [ ] TypeScript compiles
