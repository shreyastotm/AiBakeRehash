# Prompt 08 — Auth Pages Redesign

## Objective
Redesign the Login and Register pages with strong brand identity using a split-panel layout. The left panel features brand visuals; the right panel has the form. This is the first thing new users see — it must build trust and convey the product's value.

**Prerequisites**: Prompts 01 and 02 complete.

---

## Files to Read and Modify

- `frontend/src/pages/auth/Login.tsx`
- `frontend/src/pages/auth/Register.tsx`

Read both files before editing. Keep all existing authentication logic (React Hook Form, validation, API calls, error handling, token storage). Only change the visual presentation layer.

---

## Shared Auth Layout Pattern

Both pages use the same outer shell. Extract it if it helps reduce duplication:

```tsx
// Outer container: full-screen flex
<div className="min-h-screen flex">

  {/* LEFT PANEL — Brand / Illustration (hidden on mobile) */}
  <div className="hidden lg:flex lg:w-1/2 gradient-brand flex-col items-center justify-center p-12 relative overflow-hidden">

    {/* Decorative background circles */}
    <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
    <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-black/10 translate-y-1/2 -translate-x-1/3" />

    {/* Content */}
    <div className="relative z-10 text-center text-white max-w-sm">
      {/* Logo */}
      <div className="inline-flex items-center gap-3 mb-12">
        <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <ChefHat size={30} className="text-white" />
        </div>
        <span className="text-3xl font-bold font-display">AiBake</span>
      </div>

      {/* Headline */}
      <h2 className="text-2xl font-bold font-display leading-snug mb-4">
        Your smart baking companion
      </h2>
      <p className="text-white/75 text-sm leading-relaxed">
        Manage recipes, track inventory, calculate costs, and log every baking session — all in one place.
      </p>

      {/* Feature bullets */}
      <div className="mt-8 space-y-3 text-left">
        {[
          { icon: BookOpen, text: 'Organise and scale your recipes' },
          { icon: Calculator, text: 'Calculate costs and set prices' },
          { icon: NotebookPen, text: 'Log baking sessions and improve' },
          { icon: Package, text: 'Track ingredient inventory' },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-3 text-sm text-white/85">
            <div className="h-6 w-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <Icon size={13} className="text-white" />
            </div>
            {text}
          </div>
        ))}
      </div>
    </div>
  </div>

  {/* RIGHT PANEL — Form */}
  <div className="flex-1 flex items-center justify-center px-6 py-12 bg-neutral-50">
    <div className="w-full max-w-md animate-fade-in-up">
      {/* Mobile logo (only visible on small screens) */}
      <div className="lg:hidden flex items-center gap-2 mb-8">
        <div className="h-10 w-10 rounded-xl gradient-brand flex items-center justify-center">
          <ChefHat size={20} className="text-white" />
        </div>
        <span className="text-xl font-bold font-display text-neutral-900">AiBake</span>
      </div>

      {/* FORM CONTENT HERE */}

    </div>
  </div>
</div>
```

---

## Login.tsx — Form Content

### Form Header
```tsx
<div className="mb-8">
  <h1 className="text-2xl font-bold font-display text-neutral-900">Welcome back</h1>
  <p className="text-sm text-neutral-500 mt-1">
    Sign in to your AiBake account
  </p>
</div>
```

### Form Body (keep existing RHF logic, improve visuals)
```tsx
<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
  {/* Global error */}
  {errorMessage && (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-error-light border border-red-200 text-sm text-error-dark">
      <AlertCircle size={16} />
      {errorMessage}
    </div>
  )}

  <Input
    label="Email address"
    type="email"
    placeholder="you@example.com"
    leftIcon={<Mail size={16} />}
    error={errors.email?.message}
    autoComplete="email"
    {...register('email')}
  />

  <div>
    <div className="flex items-center justify-between mb-1.5">
      <label className="form-label mb-0">Password</label>
      <a href="/forgot-password" className="text-xs text-primary-500 hover:text-primary-600">
        Forgot password?
      </a>
    </div>
    <Input
      type={showPassword ? 'text' : 'password'}
      placeholder="••••••••"
      leftIcon={<Lock size={16} />}
      rightIcon={
        <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-neutral-400 hover:text-neutral-600">
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      }
      error={errors.password?.message}
      autoComplete="current-password"
      {...register('password')}
    />
  </div>

  <Button
    type="submit"
    fullWidth
    size="lg"
    loading={isSubmitting}
    className="mt-2"
  >
    Sign In
  </Button>
</form>

{/* Footer link */}
<p className="text-center text-sm text-neutral-500 mt-6">
  Don't have an account?{' '}
  <Link to="/register" className="text-primary-500 hover:text-primary-600 font-medium">
    Create one free
  </Link>
</p>
```

### State to add
- `const [showPassword, setShowPassword] = useState(false)` — password visibility toggle

---

## Register.tsx — Form Content

### Form Header
```tsx
<div className="mb-8">
  <h1 className="text-2xl font-bold font-display text-neutral-900">Create your account</h1>
  <p className="text-sm text-neutral-500 mt-1">
    Free forever for home bakers
  </p>
</div>
```

### Form Body (keep existing RHF logic)
```tsx
<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
  {/* Global error */}
  {errorMessage && (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-error-light border border-red-200 text-sm text-error-dark">
      <AlertCircle size={16} />
      {errorMessage}
    </div>
  )}

  <Input
    label="Display name"
    placeholder="Your name or bakery name"
    leftIcon={<User size={16} />}
    error={errors.display_name?.message}
    autoComplete="name"
    hint="This will be shown in your journal and shared recipes"
    {...register('display_name')}
  />

  <Input
    label="Email address"
    type="email"
    placeholder="you@example.com"
    leftIcon={<Mail size={16} />}
    error={errors.email?.message}
    autoComplete="email"
    {...register('email')}
  />

  <Input
    label="Password"
    type={showPassword ? 'text' : 'password'}
    placeholder="At least 8 characters"
    leftIcon={<Lock size={16} />}
    rightIcon={
      <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-neutral-400 hover:text-neutral-600">
        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    }
    error={errors.password?.message}
    hint="Minimum 8 characters"
    autoComplete="new-password"
    {...register('password')}
  />

  {/* Preferences row */}
  <div className="grid grid-cols-2 gap-3">
    <div>
      <label className="form-label">Unit system</label>
      <Select
        options={[
          { value: 'metric', label: 'Metric (g, ml)' },
          { value: 'cups', label: 'Cups & oz' },
          { value: 'hybrid', label: 'Hybrid' },
          { value: 'bakers_percent', label: "Baker's %" },
        ]}
        value={unitSystem}
        onChange={setUnitSystem}
      />
    </div>
    <div>
      <label className="form-label">Currency</label>
      <Select
        options={[
          { value: 'INR', label: '₹ Indian Rupee' },
          { value: 'USD', label: '$ US Dollar' },
          { value: 'GBP', label: '£ British Pound' },
          { value: 'EUR', label: '€ Euro' },
        ]}
        value={currency}
        onChange={setCurrency}
      />
    </div>
  </div>

  <Button
    type="submit"
    fullWidth
    size="lg"
    loading={isSubmitting}
    className="mt-2"
  >
    Create Account
  </Button>

  <p className="text-center text-xs text-neutral-400">
    By signing up you agree to our Terms of Service and Privacy Policy.
  </p>
</form>

<p className="text-center text-sm text-neutral-500 mt-6">
  Already have an account?{' '}
  <Link to="/login" className="text-primary-500 hover:text-primary-600 font-medium">
    Sign in
  </Link>
</p>
```

---

## ProtectedRoute.tsx
While reading auth pages, check `frontend/src/components/ProtectedRoute.tsx`. If it redirects to `/login` with a plain React `navigate`, ensure the redirect preserves the intended destination:
```tsx
<Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
```

And in `Login.tsx`, after successful login read the redirect param:
```tsx
const redirect = new URLSearchParams(location.search).get('redirect') || '/'
navigate(redirect, { replace: true })
```

---

## Verification
- [ ] Login page shows split panel layout on lg+ screens
- [ ] Mobile shows only the form (brand panel hidden)
- [ ] Password show/hide toggle works
- [ ] Error message block uses error-light background
- [ ] Register has unit system + currency preference fields
- [ ] Both pages link to each other
- [ ] `ProtectedRoute` uses redirect param
- [ ] TypeScript compiles
