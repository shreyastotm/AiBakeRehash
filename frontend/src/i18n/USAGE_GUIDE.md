# i18n Usage Guide

Quick reference for using internationalization in AiBake components.

## Quick Start

### 1. Import and Use Translation Hook

```tsx
import { useTranslation } from 'react-i18next';

export function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('recipes.title')}</h1>
      <button>{t('common.save')}</button>
    </div>
  );
}
```

### 2. Use Localization Hook for Formatting

```tsx
import { useLocalization } from '../hooks/useLocalization';

export function RecipeCard({ recipe }) {
  const { t, formatDate, formatCurrency } = useLocalization();
  
  return (
    <div>
      <h2>{recipe.title}</h2>
      <p>{t('recipes.created')}: {formatDate(recipe.createdAt)}</p>
      <p>{t('costing.totalCost')}: {formatCurrency(recipe.cost)}</p>
    </div>
  );
}
```

### 3. Add Language Switcher to Header

```tsx
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export function Header() {
  return (
    <header className="flex justify-between items-center">
      <h1>AiBake</h1>
      <LanguageSwitcher />
    </header>
  );
}
```

## Common Use Cases

### Recipe List with Localized Dates

```tsx
import { useLocalization } from '../hooks/useLocalization';

export function RecipeList({ recipes }) {
  const { t, formatDate } = useLocalization();
  
  return (
    <div>
      <h1>{t('recipes.myRecipes')}</h1>
      <ul>
        {recipes.map(recipe => (
          <li key={recipe.id}>
            <span>{recipe.title}</span>
            <span>{formatDate(recipe.createdAt, 'PPP')}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Inventory with Formatted Quantities

```tsx
import { useLocalization } from '../hooks/useLocalization';

export function InventoryItem({ item }) {
  const { t, formatWeight, formatCurrency } = useLocalization();
  
  return (
    <div>
      <h3>{item.name}</h3>
      <p>{t('inventory.quantityOnHand')}: {formatWeight(item.quantityGrams)}</p>
      <p>{t('inventory.costPerUnit')}: {formatCurrency(item.costPerUnit)}</p>
    </div>
  );
}
```

### Costing Calculator with Currency

```tsx
import { useLocalization } from '../hooks/useLocalization';

export function CostingCalculator({ recipe }) {
  const { t, formatCurrency, formatPercentage } = useLocalization();
  
  const totalCost = recipe.ingredientCost + recipe.overheadCost;
  const profitMargin = ((recipe.sellingPrice - totalCost) / recipe.sellingPrice) * 100;
  
  return (
    <div>
      <h2>{t('costing.title')}</h2>
      <p>{t('costing.ingredientCost')}: {formatCurrency(recipe.ingredientCost)}</p>
      <p>{t('costing.totalCost')}: {formatCurrency(totalCost)}</p>
      <p>{t('costing.profitMargin')}: {formatPercentage(profitMargin)}</p>
    </div>
  );
}
```

### Journal Entry with Hydration Loss

```tsx
import { useLocalization } from '../hooks/useLocalization';

export function JournalEntry({ entry }) {
  const { t, formatDate, formatWeight, formatPercentage } = useLocalization();
  
  return (
    <div>
      <h3>{t('journal.bakeDate')}: {formatDate(entry.bakeDate)}</h3>
      <p>{t('journal.preBakeWeight')}: {formatWeight(entry.preBakeWeight)}</p>
      <p>{t('journal.bakingLoss')}: {formatWeight(entry.bakingLoss)}</p>
      <p>{t('journal.bakingLossPercentage')}: {formatPercentage(entry.bakingLossPercentage)}</p>
      <p>{t('journal.notes')}: {entry.notes}</p>
    </div>
  );
}
```

### Form with Validation Messages

```tsx
import { useTranslation } from 'react-i18next';

export function RecipeForm() {
  const { t } = useTranslation();
  const [errors, setErrors] = useState({});
  
  const validateForm = (data) => {
    const newErrors = {};
    
    if (!data.title) {
      newErrors.title = t('validation.required');
    }
    
    if (data.servings <= 0) {
      newErrors.servings = t('validation.positiveNumber');
    }
    
    return newErrors;
  };
  
  return (
    <form>
      <input placeholder={t('recipes.recipeName')} />
      {errors.title && <span className="error">{errors.title}</span>}
      
      <input type="number" placeholder={t('recipes.servings')} />
      {errors.servings && <span className="error">{errors.servings}</span>}
      
      <button type="submit">{t('common.save')}</button>
    </form>
  );
}
```

### Settings Page with Language Selection

```tsx
import { useLocalization } from '../hooks/useLocalization';

export function SettingsPage() {
  const { t, language, changeLanguage } = useLocalization();
  
  return (
    <div>
      <h1>{t('settings.title')}</h1>
      
      <div>
        <label>{t('settings.language')}</label>
        <select value={language} onChange={(e) => changeLanguage(e.target.value)}>
          <option value="en">{t('common.english')}</option>
          <option value="hi">{t('common.hindi')}</option>
        </select>
      </div>
      
      <div>
        <label>{t('settings.currency')}</label>
        <select>
          <option value="INR">{t('costing.inr')}</option>
        </select>
      </div>
    </div>
  );
}
```

## Translation Key Patterns

### Feature-Based Organization

```
recipes.title
recipes.myRecipes
recipes.createRecipe
recipes.editRecipe
recipes.deleteRecipe
recipes.recipeDetails
recipes.recipeName
recipes.description
recipes.servings
recipes.yieldWeight
recipes.ingredients
recipes.sections
recipes.steps
recipes.scale
recipes.noRecipes
recipes.deleteConfirm
recipes.recipeCreated
recipes.recipeUpdated
recipes.recipeDeleted
```

### Common Patterns

```
common.save
common.cancel
common.delete
common.edit
common.add
common.loading
common.error
common.success

auth.login
auth.register
auth.email
auth.password
auth.invalidCredentials

validation.required
validation.invalidEmail
validation.minLength
validation.maxLength

errors.networkError
errors.serverError
errors.notFound
```

## Formatting Patterns

### Dates

```tsx
// Default format (locale-specific)
formatDate(new Date()); 

// Custom format
formatDate(new Date(), 'dd/MM/yyyy');
formatDate(new Date(), 'EEEE, MMMM d, yyyy');
formatDate(new Date(), 'MMM d, yyyy');
```

### Numbers

```tsx
// Basic
formatNumber(1234.56);

// With options
formatNumber(1234.56, { maximumFractionDigits: 0 });
formatNumber(1234.56, { minimumFractionDigits: 2 });
```

### Currency

```tsx
// Always INR
formatCurrency(1500); // ₹1,500.00
```

### Measurements

```tsx
// Weight
formatWeight(250); // 250 g
formatWeight(1500); // 1.5 kg

// Volume
formatVolume(250); // 250 ml
formatVolume(1500); // 1.5 l

// Percentage
formatPercentage(75.5); // 75.5%
formatPercentage(75.5, 0); // 76%
```

## Best Practices

1. **Always use translation keys** - Never hardcode strings
2. **Organize keys by feature** - Makes maintenance easier
3. **Use the localization hook** - For consistent formatting
4. **Test with both languages** - Ensure translations are complete
5. **Keep translations in sync** - Update both en.json and hi.json
6. **Use meaningful key names** - Descriptive keys are easier to maintain
7. **Avoid nesting too deep** - Keep key hierarchy manageable
8. **Use interpolation for dynamic values** - Don't concatenate strings

## Debugging

### Check Current Language

```tsx
import { useTranslation } from 'react-i18next';

export function DebugComponent() {
  const { i18n } = useTranslation();
  
  return <div>Current language: {i18n.language}</div>;
}
```

### Check Translation Key

```tsx
import { useTranslation } from 'react-i18next';

export function DebugComponent() {
  const { t } = useTranslation();
  
  // If key doesn't exist, it will show the key itself
  return <div>{t('nonexistent.key')}</div>; // Shows: nonexistent.key
}
```

### Enable i18n Debug Mode

```tsx
// In i18n/config.ts
i18n.init({
  // ... other config
  debug: true, // Enable debug logging
});
```

## Performance Tips

1. **Lazy load translations** - For large applications
2. **Use memoization** - Wrap components with React.memo if needed
3. **Avoid inline functions** - In translation keys
4. **Cache formatted values** - If formatting is expensive
5. **Use useCallback** - For language change handlers

## Common Issues

### Translations not updating

- Ensure component is re-rendering
- Check that i18n provider wraps the component
- Verify language change is triggering re-render

### Date formatting incorrect

- Check date-fns locale is imported
- Verify format pattern syntax
- Ensure date object is valid

### Language not persisting

- Check localStorage is enabled
- Verify language code is correct
- Check browser privacy settings
