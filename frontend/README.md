# AiBake Frontend

React + TypeScript + Vite frontend application for the AiBake recipe management platform.

## Features

- Recipe management (create, read, update, delete)
- Inventory tracking
- Recipe costing and pricing
- Baking journal
- User authentication
- Responsive design with Tailwind CSS
- PWA capabilities

## Setup

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

### Testing

```bash
npm test
npm run test:run
```

### Code Quality

```bash
npm run lint
npm run format
npm run type-check
```

## Project Structure

```
src/
├── components/        # Reusable React components
│   └── common/       # Common UI components (Button, Input, Card, etc.)
├── pages/            # Page components
│   ├── auth/         # Authentication pages (Login, Register)
│   ├── recipe/       # Recipe pages (List, Detail, Form)
│   └── Dashboard.tsx # Main dashboard
├── services/         # API service modules
│   ├── api.ts        # Axios instance with interceptors
│   ├── auth.service.ts
│   ├── recipe.service.ts
│   ├── inventory.service.ts
│   └── costing.service.ts
├── hooks/            # Custom React hooks
│   ├── useAuth.ts
│   ├── useRecipes.ts
│   └── useInventory.ts
├── store/            # Zustand state management
│   ├── authStore.ts
│   ├── recipeStore.ts
│   └── inventoryStore.ts
├── utils/            # Utility functions
│   ├── currency.ts   # INR formatting
│   ├── date.ts       # Date formatting
│   ├── units.ts      # Unit conversion
│   └── validation.ts # Form validation
├── styles/           # Global styles
│   └── globals.css   # Tailwind CSS imports
├── App.tsx           # Main app component
└── main.tsx          # Entry point
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```
VITE_API_URL=http://localhost:3000/api/v1
VITE_APP_NAME=AiBake
```

## UI Components

### Button

`src/components/common/Button.tsx`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'danger' \| 'outline' \| 'ghost'` | `'primary'` | Visual style |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size (all enforce 44px min touch target) |
| `loading` | `boolean` | `false` | Shows spinner and disables the button |
| `disabled` | `boolean` | — | Disables the button |
| `className` | `string` | `''` | Additional Tailwind classes |

```tsx
<Button variant="primary" size="md">Save Recipe</Button>
<Button variant="danger" onClick={handleDelete}>Delete</Button>
<Button loading={isSaving}>Saving...</Button>
<Button variant="outline" disabled>Unavailable</Button>
```

All buttons include focus ring styles for keyboard navigation.

## Technologies

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **React Query** - Data fetching and caching
- **Zustand** - State management
- **Vitest** - Testing framework

## API Integration

The frontend communicates with the backend API at `http://localhost:3000/api/v1`. All requests include JWT authentication tokens automatically via axios interceptors.

## Authentication

- JWT tokens stored in localStorage
- Automatic token refresh on 401 responses
- Protected routes redirect to login when unauthenticated

## Contributing

Follow the project conventions:
- Use TypeScript for all code
- Use kebab-case for file names
- Use `.tsx` for React components
- Use Tailwind CSS for styling
- Run `npm run format` before committing
