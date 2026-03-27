# Prompt 06 — Journal Pages Improvement

## Objective
Redesign the baking journal pages for a richer, more engaging experience. The journal is a core differentiator for AiBakeRehash — it lets bakers track their progress session-by-session. The UI should feel like a premium baking diary.

**Prerequisites**: Prompts 01, 02, 03 complete.

---

## Files to Modify (read each before editing)

| File | Action |
|------|--------|
| `frontend/src/pages/journal/JournalList.tsx` | Timeline redesign |
| `frontend/src/pages/journal/JournalDetail.tsx` | Rich entry view |
| `frontend/src/pages/journal/JournalEntryNew.tsx` | Improved form |
| `frontend/src/pages/journal/JournalEntryEdit.tsx` | Same as New |

---

## JournalList.tsx — Timeline View

### Page Header
```tsx
<div className="page-header">
  <div>
    <h1 className="text-2xl font-bold font-display text-neutral-900">Baking Journal</h1>
    <p className="text-sm text-neutral-500 mt-0.5">{totalCount} baking sessions recorded</p>
  </div>
  <Link to="/journal/new">
    <Button leftIcon={<Plus size={16} />}>Log a Bake</Button>
  </Link>
</div>
```

### Filter / Search Bar
```tsx
<div className="card p-4 mb-6">
  <div className="flex flex-col sm:flex-row gap-3">
    <SearchInput value={search} onSearch={handleSearch} placeholder="Search journal entries…" className="flex-1" />
    <Select options={RECIPE_OPTIONS} value={recipeFilter} onChange={setRecipeFilter} placeholder="All Recipes" />
    <Select options={RATING_OPTIONS} value={ratingFilter} onChange={setRatingFilter} placeholder="All Ratings" />
  </div>
</div>
```

### Timeline Entry Card
Group entries by month. For each month, show a month divider and the entries below it.

```tsx
{/* Month divider */}
<div className="flex items-center gap-3 mb-4 mt-8 first:mt-0">
  <span className="text-sm font-semibold text-neutral-600">{monthLabel}</span>
  <div className="flex-1 h-px bg-neutral-200" />
</div>

{/* Entry card */}
<div className="flex gap-4 group cursor-pointer" onClick={() => navigate(`/journal/${entry.id}`)}>
  {/* Date column */}
  <div className="flex flex-col items-center w-14 shrink-0">
    <div className="h-12 w-12 rounded-xl bg-secondary-50 border border-secondary-100 flex flex-col items-center justify-center">
      <span className="text-xs font-medium text-secondary-500 leading-none">
        {format(new Date(entry.baked_at), 'MMM')}
      </span>
      <span className="text-xl font-bold text-secondary-700 leading-none">
        {format(new Date(entry.baked_at), 'dd')}
      </span>
    </div>
    {/* Vertical connector line */}
    <div className="w-px flex-1 bg-neutral-200 mt-2" />
  </div>

  {/* Content card */}
  <div className="card mb-4 flex-1 p-4 group-hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        {/* Recipe name */}
        <h3 className="font-semibold text-neutral-900 text-sm">
          {entry.recipe_title ?? 'Untitled Bake'}
        </h3>
        {/* Rating stars */}
        <div className="flex items-center gap-0.5 mt-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={13}
              className={i < (entry.rating ?? 0) ? 'text-accent-500 fill-accent-500' : 'text-neutral-200 fill-neutral-200'}
            />
          ))}
          {entry.outcome && (
            <Badge variant={entry.outcome === 'success' ? 'success' : entry.outcome === 'failure' ? 'error' : 'warning'} className="ml-2">
              {entry.outcome}
            </Badge>
          )}
        </div>
        {/* Notes preview */}
        {entry.notes && (
          <p className="text-xs text-neutral-500 mt-1.5 line-clamp-2">{entry.notes}</p>
        )}
      </div>
      {/* Photo thumbnail */}
      {entry.photos && entry.photos.length > 0 && (
        <div className="h-16 w-16 rounded-lg overflow-hidden shrink-0 bg-neutral-100">
          <img src={entry.photos[0]} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}
    </div>
    {/* Footer meta */}
    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-neutral-100 text-xs text-neutral-400">
      {entry.actual_yield_grams && (
        <span className="flex items-center gap-1"><Scale size={11} />{entry.actual_yield_grams}g yield</span>
      )}
      {entry.baking_loss_percent && (
        <span className="flex items-center gap-1"><TrendingDown size={11} />{entry.baking_loss_percent}% loss</span>
      )}
      <span className="ml-auto">{formatRelativeDate(entry.baked_at)}</span>
    </div>
  </div>
</div>
```

### Empty State
```tsx
<EmptyState
  icon={<NotebookPen size={48} className="text-neutral-300" />}
  title="No journal entries yet"
  description="Start logging your baking sessions to track improvements over time."
  action={{ label: 'Log your first bake', onClick: () => navigate('/journal/new'), icon: <Plus size={16} /> }}
/>
```

---

## JournalDetail.tsx — Rich Entry View

### Page Header
```tsx
<div className="page-header">
  <div>
    <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={14} />} onClick={() => navigate('/journal')}>
      Back to Journal
    </Button>
    <h1 className="text-2xl font-bold font-display text-neutral-900 mt-2">
      {entry.recipe_title ?? 'Baking Session'}
    </h1>
    <p className="text-sm text-neutral-500">
      {format(new Date(entry.baked_at), 'EEEE, MMMM d, yyyy')}
    </p>
  </div>
  <div className="flex gap-2">
    <Link to={`/journal/${entry.id}/edit`}>
      <Button variant="outline" leftIcon={<Edit size={14} />}>Edit</Button>
    </Link>
    <Button variant="danger" leftIcon={<Trash2 size={14} />} onClick={handleDelete}>Delete</Button>
  </div>
</div>
```

### Entry body layout: 2-column on large screens

```
Left column (2/3):
├── Overview card (rating, outcome, yield, loss)
├── Notes card
├── Adjustments card (what changed from recipe)
└── Issues / troubleshooting card

Right column (1/3):
├── Photo gallery
├── Audio notes
└── Linked recipe card
```

### Rating Display
```tsx
<div className="card p-6 mb-4">
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
    <StatItem label="Rating" value={<StarRating value={entry.rating} readonly />} />
    <StatItem label="Outcome" value={<Badge variant={outcomeVariant}>{entry.outcome}</Badge>} />
    <StatItem label="Actual Yield" value={entry.actual_yield_grams ? `${entry.actual_yield_grams}g` : '—'} />
    <StatItem label="Baking Loss" value={entry.baking_loss_percent ? `${entry.baking_loss_percent}%` : '—'} />
  </div>
</div>
```

### Photo Gallery
If entry has photos, render a responsive masonry-style grid:
```tsx
<div className="card p-4 mb-4">
  <h3 className="text-sm font-semibold text-neutral-700 mb-3">Photos</h3>
  <div className="grid grid-cols-2 gap-2">
    {entry.photos.map((url, i) => (
      <div key={i} className={cn('rounded-lg overflow-hidden bg-neutral-100', i === 0 && 'col-span-2 aspect-video')}>
        <img src={url} alt={`Bake photo ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
      </div>
    ))}
  </div>
</div>
```

---

## JournalEntryNew.tsx and JournalEntryEdit.tsx

Both forms should follow the same structure. Read both files and apply:

### Form Layout
```tsx
<div className="max-w-2xl mx-auto">
  <div className="page-header">
    <h1 className="text-2xl font-bold font-display">{isEdit ? 'Edit Journal Entry' : 'Log a Bake'}</h1>
  </div>

  <form onSubmit={handleSubmit} className="space-y-4">
    {/* Recipe selection */}
    <div className="card p-6">
      <h3 className="text-sm font-semibold text-neutral-700 mb-4">Which recipe?</h3>
      {/* Recipe autocomplete / select */}
    </div>

    {/* Session details */}
    <div className="card p-6">
      <h3 className="text-sm font-semibold text-neutral-700 mb-4">Session Details</h3>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Date" type="date" {...register('baked_at')} />
        <StarRatingInput label="Rating" value={rating} onChange={setRating} />
        <Input label="Actual Yield (g)" type="number" {...register('actual_yield_grams')} leftIcon={<Scale size={14} />} />
        <Input label="Baking Loss (%)" type="number" {...register('baking_loss_percent')} />
      </div>
      <div className="mt-4">
        <label className="form-label">Outcome</label>
        <div className="flex gap-2">
          {['success', 'partial', 'failure', 'experiment'].map(o => (
            <button
              key={o}
              type="button"
              onClick={() => setOutcome(o)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                outcome === o ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-neutral-600 border-neutral-300 hover:border-primary-300'
              )}
            >
              {o}
            </button>
          ))}
        </div>
      </div>
    </div>

    {/* Notes */}
    <div className="card p-6">
      <h3 className="text-sm font-semibold text-neutral-700 mb-4">Notes & Observations</h3>
      <Textarea
        label="What happened? What worked or didn't?"
        rows={5}
        placeholder="Describe the bake, texture, flavour, what you'd change next time…"
        {...register('notes')}
      />
    </div>

    {/* Photo upload */}
    <div className="card p-6">
      <h3 className="text-sm font-semibold text-neutral-700 mb-4">Photos</h3>
      <PhotoUpload value={photos} onChange={setPhotos} maxFiles={6} />
    </div>

    {/* Footer */}
    <div className="flex gap-3 justify-end pb-8">
      <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
      <Button type="submit" loading={isSubmitting} leftIcon={<Save size={14} />}>
        {isEdit ? 'Save Changes' : 'Log Bake'}
      </Button>
    </div>
  </form>
</div>
```

---

## StarRating Component (create in journal components dir)

```tsx
// frontend/src/components/journal/StarRating.tsx
interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export const StarRating = ({ value, onChange, readonly = false, size = 'md' }) => {
  const [hover, setHover] = useState(0)
  const sizes = { sm: 14, md: 18, lg: 24 }
  const s = sizes[size]

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = (hover || value) > i
        return (
          <button
            key={i}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(i + 1)}
            onMouseEnter={() => !readonly && setHover(i + 1)}
            onMouseLeave={() => !readonly && setHover(0)}
            className={cn('transition-colors', !readonly && 'cursor-pointer hover:scale-110')}
          >
            <Star
              size={s}
              className={filled ? 'text-accent-500 fill-accent-500' : 'text-neutral-300 fill-neutral-300'}
            />
          </button>
        )
      })}
    </div>
  )
}
```

---

## Verification
- [ ] JournalList groups entries by month with timeline layout
- [ ] Star ratings display with accent color
- [ ] Photo gallery renders in JournalDetail
- [ ] Forms use `Input`, `Textarea` from component library
- [ ] Empty state shown when no entries
- [ ] TypeScript compiles
