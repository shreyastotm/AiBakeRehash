# Internationalization (i18n) Setup

This document describes the internationalization setup for AiBake, supporting English and Hindi languages with locale-specific formatting.

## Overview

The application uses `react-i18next` for translation management and `date-fns` for locale-specific date and number formatting.

## Features

- **Multi-language Support**: English (en) and Hindi (hi)
- **Browser Language Detection**: Automatically detects user's browser language
- **Persistent Language Selection**: Saves language preference to localStorage
- **Locale-Specific Formatting**:
  - Date formatting (dd/MM/yyyy for Hindi, MM/dd/yyyy for English)
  - Number formatting with locale-specific separators
  - Currency formatting (INR)
  - Weight and volume formatting
  - Percentage formatting

## File Structure

```
src/i18n/
├── config.ts                 # i18n configuration and initialization
├── locales/
│   ├── en.json              # English translations
│   └── hi.json              # Hindi translations
└── README.md                # This file
```

## Usage

### Basic Translation

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return <h1>{t('common.appName')}</h1>;
}
```

### Using the Localization Hook

```tsx
import { useLocalization } from '../hooks/useLocalization';

function MyComponent() {
  const { t, formatCurrency, formatDate, language } = useLocalization();
  
  return (
    <div>
      <p>{t('costing.totalCost')}: {formatCurrency(1500)}</p>
      <p>{t('journal.bakeDate')}: {formatDate(new Date())}</p>
      <p>{t('common.language')}: {language}</p>
    </div>
  );
}
```

### Language Switcher

```tsx
import { LanguageSwitcher } from '../components/LanguageSwitcher';

function Header() {
  return (
    <header>
      <LanguageSwitcher />
    </header>
  );
}
```

### Formatting Functions

#### Date Formatting

```tsx
const { formatDate } = useLocalization();

// Format with default pattern (PPP)
formatDate(new Date()); // "January 15, 2024" (en) or "15 जनवरी 2024" (hi)

// Format with custom pattern
formatDate(new Date(), 'dd/MM/yyyy'); // "15/01/2024"
formatDate(new Date(), 'EEEE, MMMM d, yyyy'); // "Monday, January 15, 2024"
```

#### Number Formatting

```tsx
const { formatNumber } = useLocalization();

// Basic number formatting
formatNumber(1234.56); // "1,234.56" (en) or "1,234.56" (hi)

// With options
formatNumber(1234.56, { maximumFractionDigits: 0 }); // "1,235"
```

#### Currency Formatting

```tsx
const { formatCurrency } = useLocalization();

formatCurrency(1500); // "₹1,500.00" (INR)
```

#### Weight Formatting

```tsx
const { formatWeight } = useLocalization();

formatWeight(250); // "250 g"
formatWeight(1500); // "1.5 kg"
```

#### Volume Formatting

```tsx
const { formatVolume } = useLocalization();

formatVolume(250); // "250 ml"
formatVolume(1500); // "1.5 l"
```

#### Percentage Formatting

```tsx
const { formatPercentage } = useLocalization();

formatPercentage(75.5); // "75.5%"
formatPercentage(75.5, 0); // "76%" (rounded)
```

## Translation Keys

Translation keys are organized by feature:

- `common.*` - Common UI elements (save, cancel, delete, etc.)
- `auth.*` - Authentication (login, register, etc.)
- `navigation.*` - Navigation menu items
- `recipes.*` - Recipe management
- `ingredients.*` - Ingredient management
- `inventory.*` - Inventory management
- `journal.*` - Baking journal
- `costing.*` - Costing and pricing
- `suppliers.*` - Supplier management
- `settings.*` - Settings and preferences
- `validation.*` - Form validation messages
- `errors.*` - Error messages
- `units.*` - Unit abbreviations
- `dates.*` - Date-related terms

## Adding New Translations

1. Add the key to both `en.json` and `hi.json`:

```json
// en.json
{
  "myFeature": {
    "title": "My Feature",
    "description": "Feature description"
  }
}

// hi.json
{
  "myFeature": {
    "title": "मेरी सुविधा",
    "description": "सुविधा विवरण"
  }
}
```

2. Use in component:

```tsx
const { t } = useTranslation();
<h1>{t('myFeature.title')}</h1>
```

## Interpolation

Support for dynamic values in translations:

```json
{
  "validation": {
    "minLength": "Must be at least {{min}} characters"
  }
}
```

```tsx
const { t } = useTranslation();
<p>{t('validation.minLength', { min: 8 })}</p>
```

## Language Detection

The application automatically detects the user's browser language:

1. Checks localStorage for saved preference
2. Falls back to browser language (first part of locale code)
3. Defaults to English if browser language not supported

Supported languages: `en`, `hi`

## Date Format Patterns

### English (en)
- Default: `MM/dd/yyyy`
- Full: `EEEE, MMMM d, yyyy`
- Short: `MMM d, yyyy`

### Hindi (hi)
- Default: `dd/MM/yyyy`
- Full: `EEEE, d MMMM yyyy`
- Short: `d MMM yyyy`

## Common Patterns

### Conditional Translation

```tsx
const { t } = useTranslation();

const status = recipe.status;
const statusLabel = t(`recipes.${status}`); // recipes.draft, recipes.active, etc.
```

### Pluralization

For pluralization, use separate keys:

```json
{
  "recipes": {
    "oneRecipe": "1 recipe",
    "multipleRecipes": "{{count}} recipes"
  }
}
```

```tsx
const { t } = useTranslation();
<p>{t('recipes.multipleRecipes', { count: 5 })}</p>
```

### Namespace Usage

All translations use the default namespace. To use a specific namespace:

```tsx
const { t } = useTranslation('translation');
```

## Testing

When testing components with i18n:

```tsx
import { render } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n/config';

test('renders with translations', () => {
  render(
    <I18nextProvider i18n={i18n}>
      <MyComponent />
    </I18nextProvider>
  );
});
```

## Performance Considerations

- Translations are loaded synchronously at startup
- Language switching is instant (no network requests)
- Formatting functions use native Intl APIs for performance
- Consider lazy loading translations for large applications

## Troubleshooting

### Translations not appearing

1. Check that the key exists in both `en.json` and `hi.json`
2. Verify the component is wrapped with `I18nextProvider`
3. Check browser console for i18n warnings

### Date formatting issues

1. Ensure `date-fns` locale is imported correctly
2. Verify the language code matches supported languages
3. Check date format pattern syntax

### Language not persisting

1. Check that localStorage is enabled
2. Verify `localStorage.setItem('i18nextLng', lang)` is called
3. Check browser's privacy settings

## References

- [react-i18next Documentation](https://react.i18next.com/)
- [i18next Documentation](https://www.i18next.com/)
- [date-fns Documentation](https://date-fns.org/)
- [Intl API Documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)
