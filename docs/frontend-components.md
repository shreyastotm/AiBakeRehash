# Frontend Common Components

Reusable UI primitives in `frontend/src/components/common/`.

---

## LoadingSpinner

Animated spinner for async loading states.

```tsx
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

// Inline spinner
<LoadingSpinner />

// With label
<LoadingSpinner size="lg" label="Saving recipe…" />

// Full-screen overlay (e.g. page transitions)
<LoadingSpinner fullScreen label="Loading…" />
```

### Props

| Prop         | Type                   | Default | Description                                      |
|--------------|------------------------|---------|--------------------------------------------------|
| `size`       | `'sm' \| 'md' \| 'lg'` | `'md'`  | Spinner diameter (sm=16px, md=32px, lg=48px)     |
| `label`      | `string`               | —       | Visible text below spinner; also used as `aria-label` |
| `fullScreen` | `boolean`              | `false` | Renders a fixed full-screen overlay (z-50)       |

### Accessibility
- `role="status"` on the spinner element
- `aria-label` defaults to `"Loading"` when no `label` is provided
- When `label` is set, the text is rendered visibly below the spinner

---

## Button

Primary interactive element. All variants enforce a 44px minimum touch target.

```tsx
<Button variant="primary" size="md" loading={isSaving}>Save Recipe</Button>
<Button variant="danger" onClick={handleDelete}>Delete</Button>
```

**Variants:** `primary` | `secondary` | `danger` | `outline` | `ghost`  
**Sizes:** `sm` | `md` | `lg`

---

## Input

Labelled text input with hint and error support.

```tsx
<Input label="Recipe Title" placeholder="e.g. Eggless Chocolate Cake" />
<Input label="Email" error="Please enter a valid email" />
<Input label="Yield (g)" hint="Total weight of finished product" type="number" />
```

---

## Modal

Focus-trapped dialog overlay. Closes on Escape or backdrop click (configurable).

```tsx
<Modal isOpen={open} onClose={() => setOpen(false)} title="Confirm Delete" size="md">
  Are you sure?
</Modal>
```

**Sizes:** `sm` | `md` | `lg` | `xl`

---

## Toast

Global notification system. Wrap the app in `<ToastProvider>` and call `useToast()` anywhere.

```tsx
const toast = useToast()
toast.success('Recipe saved!')
toast.error('Failed to save.')
toast.warning('Low butter stock.')
toast.info('Scaling factor applied.')
```

Auto-dismisses after 4 seconds. Each toast has `role="alert"` for screen readers.

---

## ProgressBar

```tsx
<ProgressBar value={65} label="Stock level" color="warning" size="md" showPercent />
```

**Colors:** `primary` | `success` | `warning` | `error`  
**Sizes:** `sm` | `md` | `lg`

---

## EmptyState

Placeholder for empty lists or zero-data views.

```tsx
<EmptyState
  title="No recipes yet"
  description="Create your first recipe to get started."
  action={{ label: 'New Recipe', onClick: () => navigate('/recipes/new') }}
/>
```

---

## Skeleton

Content placeholder during data fetching.

```tsx
<Skeleton variant="text" lines={3} />
<Skeleton variant="circle" width={48} height={48} />
<RecipeCardSkeleton />  {/* pre-built recipe card skeleton */}
```

**Variants:** `text` | `rect` | `circle`
