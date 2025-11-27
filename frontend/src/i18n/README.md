# Internationalisation (i18n) Guide

This project uses `react-i18next` for internationalization with support for English (en) and French (fr).

## 🌍 Automatic Language Detection

The application automatically detects and sets the user's preferred language based on:

1. **User's previous choice** (saved in localStorage) - highest priority
2. **Browser language** (navigator.language) - simple rule:
   - Starts with `fr` (fr-FR, fr-CA, fr-BE, etc.) → **French** 🇫🇷
   - Everything else → **English** 🇬🇧
3. **Manual override** - Users can change language anytime using the EN/FR buttons in the header

### Examples:
- Browser = `fr-FR` → French
- Browser = `fr-CA` → French
- Browser = `en-US` → English
- Browser = `en-GB` → English
- Browser = `es-ES` → English (fallback)
- Browser = `de-DE` → English (fallback)

Once the user manually selects a language, it's saved and will always be used.

## Structure

Translations are organized by feature in separate JSON files:

```
src/i18n/
├── config.ts                 # i18n configuration
├── locales/
│   ├── en/                   # English translations
│   │   ├── common.json       # Common terms (loading, error, save, etc.)
│   │   ├── auth.json         # Authentication & authorization
│   │   ├── dashboard.json    # Dashboard page
│   │   ├── promos.json       # Promo Wall page
│   │   ├── tracking.json     # Package Tracking page
│   │   ├── vault.json        # Promo Vault page
│   │   ├── trash.json        # Trash page
│   │   └── navigation.json   # Navigation labels
│   └── fr/                   # French translations
│       └── ... (same structure)
```

## Usage in Components

### 1. Import the hook

```tsx
import { useTranslation } from 'react-i18next';
```

### 2. Use in component

```tsx
export const MyComponent = () => {
  const { t } = useTranslation('namespace'); // e.g., 'promos', 'dashboard'

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('subtitle')}</p>
    </div>
  );
};
```

### 3. Multiple namespaces

```tsx
const { t } = useTranslation(['promos', 'common']);

<button>{t('common:save')}</button>
<h1>{t('promos:title')}</h1>
```

### 4. Interpolation (variables)

In JSON:
```json
{
  "welcome": "Welcome, {{name}}!",
  "expires": "Expires: {{date}}"
}
```

In component:
```tsx
<p>{t('welcome', { name: user.name })}</p>
<p>{t('expires', { date: formatDate(expiresAt) })}</p>
```

### 5. Pluralization

In JSON:
```json
{
  "items": "{{count}} item",
  "items_plural": "{{count}} items"
}
```

In component:
```tsx
<p>{t('items', { count: 5 })}</p> // "5 items"
```

### 6. Nested keys

In JSON:
```json
{
  "categories": {
    "fashion": "Fashion",
    "technology": "Technology"
  },
  "badges": {
    "expired": "Expired",
    "expires_soon": "Expires soon!"
  }
}
```

In component:
```tsx
<span>{t('categories.fashion')}</span>
<span>{t('badges.expired')}</span>
```

## Language Switcher

The `LanguageSwitcher` component is already integrated in the Layout header:

```tsx
import { LanguageSwitcher } from './components/LanguageSwitcher';

<LanguageSwitcher />
```

## Adding New Translations

1. Add the key in both `en` and `fr` JSON files
2. Use the key in your component with `t('key')`

Example:
```json
// en/dashboard.json
{
  "new_feature": "New Feature"
}

// fr/dashboard.json
{
  "new_feature": "Nouvelle Fonctionnalité"
}
```

```tsx
const { t } = useTranslation('dashboard');
<h1>{t('new_feature')}</h1>
```

## Best Practices

1. **Organize by feature**: Keep translations grouped by page/feature
2. **Use meaningful keys**: `empty.title` instead of `empty_state_title`
3. **Avoid HTML in translations**: Use components and interpolation instead
4. **Keep common terms in `common.json`**: error, success, save, cancel, etc.
5. **Test both languages**: Always verify translations in both EN and FR

## Current Implementation Status

✅ **Complete**:
- Layout and Navigation
- Promos page (fully translated)
- Language switcher component

🚧 **To Do**:
- Dashboard page
- Tracking page
- Vault page
- Trash page
- Auth pages (Login/Register)

## Example: Promos Page

See `src/pages/Promos.tsx` for a complete example of a fully internationalized page.
