# Indian Localization Guidelines

AiBake is designed specifically for Indian home bakers and small-scale baking businesses. All features must account for Indian market conventions.

## Currency — INR

### Display Format
- Symbol: **₹** (U+20B9, Indian Rupee Sign)
- Number format: **Indian numbering system** (₹1,23,456.78 — not ₹123,456.78)
- Decimal places: always 2 for costs and prices
- Suggested selling prices: rounded to nearest ₹ (integer, no decimal)

```typescript
// Use the currency.ts utility — never format INR ad-hoc
import { formatINR } from '../utils/currency';

formatINR(123456.78)  // → "₹1,23,456.78"
formatINR(200)        // → "₹200"  (for integer prices)
```

### Storage
- Database: `NUMERIC(12,2)`, column comment must say `INR`
- API responses: always include `"currency": "INR"` alongside monetary fields
- Never store monetary values in paise — use full rupees with 2 decimal precision

## Languages — Hindi and English

### i18n Parity Rule
**Every translation key must exist in both `en.json` and `hi.json`.** A missing key is treated as a bug.

```bash
# Validation command (run in CI)
npx i18n-check frontend/src/locales/en.json frontend/src/locales/hi.json
```

### Usage in Code
All user-facing strings must use the `t()` function from `react-i18next`. No hardcoded English strings in JSX.

```tsx
// ✅ Correct
const { t } = useTranslation();
return <h1>{t('recipe.title')}</h1>;

// ❌ Wrong — hardcoded English
return <h1>My Recipes</h1>;
```

### Translation Key Naming
- Dot-separated hierarchical keys: `{page}.{section}.{element}`
- Examples: `recipe.list.empty`, `inventory.alerts.lowStock`, `journal.form.bakingLoss`
- Snake_case for multi-word segments: `cost_calculator`, `profit_analysis`

### Hindi Script
- Hindi translations use Devanagari script (not transliteration)
- Example: `"बेकिंग रेसिपी"` not `"Baking Recipe"` in `hi.json`

## Date and Time

- **Display format**: `DD/MM/YYYY` (Indian convention — day first)
- **Time zone**: Indian Standard Time (IST, UTC+5:30) for all user-facing times
- **Storage**: UTC in the database (`TIMESTAMPTZ`)

```typescript
import { formatDisplayDate } from '../utils/date';
formatDisplayDate('2026-02-28T00:00:00Z')  // → "28/02/2026"
```

## Measurement Units

### Volume Conversions (Indian Kitchen Standards)
| Unit | Millilitres |
|------|------------|
| 1 cup | 240 ml |
| 1 tablespoon (tbsp) | 15 ml |
| 1 teaspoon (tsp) | 5 ml |

These values are hardcoded in `unitConverter.ts` and must not be changed without updating this document.

### Preferred Units
- Weight: grams (g) and kilograms (kg) — metric
- Volume: ml, cups, tbsp, tsp
- Temperature: Celsius (°C) default; Fahrenheit (°F) as user preference

## Indian Ingredients Database

These Indian baking ingredients must be present in `ingredient_master` with their aliases:

| Canonical Name | Required Aliases |
|---------------|-----------------|
| `all-purpose flour` | maida, मैदा |
| `whole wheat flour` | atta, आटा |
| `chickpea flour` | besan, बेसन, gram flour |
| `semolina` | sooji, सूजी, rava, semolina |
| `khoya` | mawa, खोया |
| `clarified butter` | ghee, घी, desi ghee |
| `cardamom` | elaichi, इलायची, green cardamom |
| `saffron` | kesar, केसर |
| `rose water` | gulab jal, गुलाब जल |
| `paneer` | cottage cheese, पनीर |

All aliases must exist in the `ingredient_aliases` table with `locale` set to `'hi'` for Hindi aliases.

## WhatsApp Integration

WhatsApp is the primary social sharing channel for Indian home bakers.

### Recipe Message Format
```
🎂 *{Recipe Title}*

📋 *Ingredients ({servings} servings):*
• {quantity} {unit} {ingredient}
...

👩‍🍳 *Method:*
1. {step}
...

⏱️ Time: {total_time} | 🌡️ Temp: {temperature}°C

Made with ❤️ on AiBake
```

### WhatsApp URL Scheme
```typescript
const message = encodeURIComponent(formatWhatsAppMessage(recipe));
const url = `whatsapp://send?text=${message}`;
// Opens WhatsApp with pre-filled message
```

### Image Optimization for WhatsApp
- Max file size: 500KB for images shared via WhatsApp
- Format: JPEG (better compression than PNG for photos)
- Dimensions: 800×800px for food photos shared in WhatsApp

## Social Media Formats

### Instagram Story
- Dimensions: 1080×1920px
- Aspect ratio: 9:16

### Instagram Post
- Dimensions: 1080×1080px
- Aspect ratio: 1:1

### WhatsApp Share Image
- Dimensions: 800×800px
- File size: <500KB

## Water Activity and Shelf Life (Indian Climate)

Indian climate has high humidity, especially during monsoon. Water activity references in `water_activity_reference` table must account for this:

- Cookies/crackers: target Aw < 0.65 (higher than Western standards due to humidity)
- Cakes: Aw 0.85–0.90
- Breads: Aw 0.95–0.97 (consume within 2-3 days without preservation)
- Confections (mithai): Aw 0.70–0.85

These values inform `estimated_shelf_life_days` on recipes.
